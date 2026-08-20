import { Router } from 'express';
import { userLogin, adminLogin, registerUser, registerCompanyAdmin, getUserByToken, roleCreate, roleUpdate, permissionCreate, permissionUpdate, refreshToken } from '@/features/auth/auth.controller.js';
import { generateWalletNonce, walletLogin, walletRegister } from '@/features/auth/wallet-auth.controller.js';
import authenticateJWT from '@/middleware/authenticate-jwt';

const router = Router();

// Define routes
router.post('/login', userLogin);
router.post('/admin/login', adminLogin);
router.post('/register', registerUser);
router.post('/refresh-token', refreshToken);

// Wallet-based authentication (MetaMask)
router.post('/wallet/nonce', generateWalletNonce);
router.post('/wallet/login', walletLogin);
router.post('/wallet/register', walletRegister);

router.post('/role/create', roleCreate);
router.put('/role/update', roleUpdate);
router.post('/permission/create', permissionCreate);
router.put('/permission/update', permissionUpdate);
router.post('/admin/register', registerCompanyAdmin);
router.get('/user/profile', authenticateJWT, getUserByToken);


export default router;