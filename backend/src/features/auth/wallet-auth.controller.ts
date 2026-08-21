/**
 * Wallet Authentication — Nonce, Login, Register
 * Single source of truth for MetaMask-based auth.
 */
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { UserType } from '@/features/auth/auth.model.js';
import { getUserByEmail, getUserByWalletAddress, createUser } from '@/features/auth/auth.repository.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '@/features/jwt/index.js';
import { UserTokenInfo } from '@/features/jwt/jwt.model.js';
import { Error as AppError } from '@/error/index.js';
import { db } from '@/db';

// ============================================================
// Nonce Store (in-memory — production: use Redis or DB with TTL)
// ============================================================

const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of nonceStore) {
    if (val.expiresAt < now) nonceStore.delete(key);
  }
}, 60_000);

// ============================================================
// Helpers
// ============================================================

/**
 * Build the canonical signing message.
 * Single source of truth — used by nonce generation AND verification.
 *
 * IMPORTANT: This exact string must match what MetaMask signs.
 * The user sees this in the MetaMask popup.
 */
function buildAuthMessage(walletAddress: string, nonce: string): string {
  const parts = [
    'Sanad Finance Authentication',
    '',
    'Wallet: ' + walletAddress,
    'Nonce: ' + nonce,
    '',
    'Sign this message to verify your wallet ownership.',
  ];
  return parts.join('\n');
}

/**
 * Verify an EIP-191 signature and return the recovered address.
 */
function recoverSignerAddress(message: string, signature: string): string | null {
  try {
    return ethers.verifyMessage(message, signature);
  } catch {
    return null;
  }
}

/**
 * Validate EVM address format.
 */
function toChecksumAddress(address: string): string | null {
  try {
    return ethers.getAddress(address);
  } catch {
    return null;
  }
}

/**
 * Shared: validate nonce + verify signature.
 * Returns the checksumAddress on success, or throws with a user-facing message.
 */
async function validateWalletSignature(
  walletAddress: string,
  signature: string,
  nonce: string,
): Promise<string> {
  const checksumAddress = toChecksumAddress(walletAddress);
  if (!checksumAddress) {
    throw new Error('Invalid Ethereum address format');
  }

  // Retrieve stored nonce
  const stored = nonceStore.get(checksumAddress.toLowerCase());
  if (!stored) {
    throw new Error('No nonce found. Please request a new one.');
  }
  if (stored.expiresAt < Date.now()) {
    nonceStore.delete(checksumAddress.toLowerCase());
    throw new Error('Nonce expired. Please request a new one.');
  }
  if (stored.nonce !== nonce) {
    throw new Error('Invalid nonce');
  }

  // Verify signature — the message must match exactly what was signed
  const expectedMessage = buildAuthMessage(checksumAddress, nonce);
  const recoveredAddress = recoverSignerAddress(expectedMessage, signature);
  if (!recoveredAddress || recoveredAddress.toLowerCase() !== checksumAddress.toLowerCase()) {
    console.error('Signature verification failed:', {
      walletAddress: checksumAddress,
      recovered: recoveredAddress,
    });
    throw new Error('Signature verification failed. Please try again.');
  }

  // Clean up used nonce
  nonceStore.delete(checksumAddress.toLowerCase());
  return checksumAddress;
}

/**
 * Generate JWT tokens for a wallet-based user.
 */
function issueWalletTokens(walletAddress: string, roleName: string, res: Response) {
  const userTokenInfo: UserTokenInfo = {
    username: walletAddress.toLowerCase(),
    loginType: 'WALLET',
    roleName,
  };

  const accessToken = generateAccessToken(userTokenInfo);
  const refreshToken = generateRefreshToken(userTokenInfo);
  const accessTokenExpiration = verifyToken(accessToken).exp;

  if (accessTokenExpiration === undefined) {
    return res.status(500).json({
      success: false,
      message: AppError.INTERNAL_SERVER_ERROR,
      data: null,
    });
  }

  return res.status(200).json({
    success: true,
    message: '',
    data: {
      accessToken,
      refreshToken,
      expiredAt: accessTokenExpiration * 1000,
      roleName,
    },
  });
}

// ============================================================
// POST /auth/wallet/nonce
// Generate a random nonce for the wallet to sign.
// Body: { walletAddress: string }
// ============================================================

export const generateWalletNonce = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'walletAddress is required',
        data: null,
      });
    }

    const checksumAddress = toChecksumAddress(walletAddress);
    if (!checksumAddress) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum address format',
        data: null,
      });
    }

    // Generate random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const message = buildAuthMessage(checksumAddress, nonce);

    // Store nonce with expiry
    nonceStore.set(checksumAddress.toLowerCase(), {
      nonce,
      expiresAt: Date.now() + NONCE_TTL_MS,
    });

    return res.status(200).json({
      success: true,
      message: 'Nonce generated',
      data: { nonce, message },
    });
  } catch (error) {
    console.error('Generate nonce error:', error);
    return res.status(500).json({
      success: false,
      message: (error as any).message || AppError.INTERNAL_SERVER_ERROR,
      data: null,
    });
  }
};

// ============================================================
// POST /auth/wallet/login
// Verify EIP-191 signature and issue JWT.
// Body: { walletAddress, signature, nonce, role }
// ============================================================

export const walletLogin = async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, nonce, role } = req.body;

    if (!walletAddress || !signature || !nonce || !role) {
      return res.status(400).json({
        success: false,
        message: 'walletAddress, signature, nonce, and role are required',
        data: null,
      });
    }

    const checksumAddress = await validateWalletSignature(walletAddress, signature, nonce);

    // Look up user by wallet address
    const user = await getUserByWalletAddress(checksumAddress);
    if (!user) {
      return res.status(200).json({
        success: true,
        message: '',
        data: { needsRegistration: true },
      });
    }

    // Issue tokens
    return issueWalletTokens(checksumAddress, user.roleId || '', res);
  } catch (err: any) {
    // Distinguish validation errors (400) from unexpected errors (500)
    if (err.message && err.message.includes('nonce')) {
      return res.status(400).json({ success: false, message: err.message, data: null });
    }
    if (err.message && err.message.includes('Signature')) {
      return res.status(401).json({ success: false, message: err.message, data: null });
    }
    if (err.message && err.message.includes('Invalid Ethereum')) {
      return res.status(400).json({ success: false, message: err.message, data: null });
    }
    console.error('Wallet login error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || AppError.INTERNAL_SERVER_ERROR,
      data: null,
    });
  }
};

// ============================================================
// POST /auth/wallet/register
// Create a new user with a MetaMask wallet address.
// Body: { walletAddress, signature, nonce, role, ...profileData }
// ============================================================

export const walletRegister = async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, nonce, role, ...profileData } = req.body;

    if (!walletAddress || !signature || !nonce || !role) {
      return res.status(400).json({
        success: false,
        message: 'walletAddress, signature, nonce, and role are required',
        data: null,
      });
    }

    const checksumAddress = await validateWalletSignature(walletAddress, signature, nonce);

    // Check if wallet already registered
    const existingUser = await getUserByWalletAddress(checksumAddress);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Wallet address already registered',
        data: null,
      });
    }

    // Check if email already exists (unique constraint)
    const email = (profileData.userEmail || `${checksumAddress.toLowerCase()}@wallet.sanad`).toLowerCase();
    const existingByEmail = await getUserByEmail(email);
    if (existingByEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email address already registered',
        data: null,
      });
    }

    // Use provided phone or fall back to wallet address fragment
    console.log('[WALLET-REGISTER] profileData:', JSON.stringify(profileData, null, 2));
    const walletContact = profileData.userContactNo || ('W' + checksumAddress.slice(-8));
    console.log('[WALLET-REGISTER] walletContact:', walletContact);

    // Create user — use DB defaults for columns that have them
    const userData: UserType = {
      balance: 0,
      userEmail: email,
      userContactNo: walletContact,
      userPassword: 'WALLET_AUTH',
      icNo: profileData.icNo || 'PENDING',
      icFrontPicture: 'default_front.jpg',
      icBackPicture: 'default_back.jpg',
      userFirstName: profileData.userFirstName || '',
      userLastName: profileData.userLastName || '',
      gender: profileData.gender || 'OTHER',
      accountId: checksumAddress,
      addressId: profileData.addressId || 'addr_001',
      companyId: profileData.companyId || 'comp_001',
      vehicleId: profileData.vehicleId || null,
      walletId: checksumAddress,
      userSkillId: profileData.userSkillId || null,
      jobReviewId: profileData.jobReviewId || null,
      roleId: profileData.roleId || 'BORROWER',
      sessionId: null,
      status: 'ACTIVE',
      createdBy: 'wallet-auth',
      updatedBy: 'wallet-auth',
    };

    await db.transaction(async (tx) => {
      await createUser(userData, tx);
    });

    // Issue tokens immediately after registration
    return issueWalletTokens(checksumAddress, userData.roleId || '', res);
  } catch (err: any) {
    if (err.message && err.message.includes('nonce')) {
      return res.status(400).json({ success: false, message: err.message, data: null });
    }
    if (err.message && err.message.includes('Signature')) {
      return res.status(401).json({ success: false, message: err.message, data: null });
    }
    if (err.message && err.message.includes('Invalid Ethereum')) {
      return res.status(400).json({ success: false, message: err.message, data: null });
    }
    console.error('Wallet register error:', err);
    // TEMP: expose actual error for debugging
    return res.status(500).json({
      success: false,
      message: err.message || AppError.INTERNAL_SERVER_ERROR,
      data: null,
    });
  }
};
