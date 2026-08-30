import { Request, Response } from "express";
import { getUserDataByToken } from "../auth/auth.repository.js";
import {
  CreatePledgeRequestSchema,
  VerifyGoldSchema,
  RecordPaymentSchema,
} from "./pledge-request.model.js";
import {
  createPledgeRequest,
  getPledgeRequestsByBorrower,
  getPledgeRequestsByPawnshop,
  getPledgeRequestById,
  updatePledgeRequestStatus,
  verifyGold,
  recordPayment,
  recordSagMint,
  updatePawnshopContact,
  getAllPawnshops,
  getBorrowerProfileForPledge,
} from "./pledge-request.repository.js";
import { getSocketService } from "../../services/socket.service.js";
import { createNotification } from "../notification/notification.repository.js";

function getToken(req: Request): string {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : req.headers.authorization || "";
}

export class PledgeRequestController {
  /**
   * POST /pledge-requests -- Borrower creates a pledge request to a pawnshop
   * V2: Auto-attaches borrower credit score, proven events, and transaction links
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const parsed = CreatePledgeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        return;
      }

      const { pawnshopId, goldDetails, requestedAmount, goldImages } = parsed.data;

      // Find the pawnshop's wallet address
      const pawnshops = await getAllPawnshops();
      const target = pawnshops.find((p) => p.userId === pawnshopId);
      if (!target) {
        res.status(404).json({ success: false, error: "Pawnshop not found" });
        return;
      }

      // V2: Auto-fetch borrower credit profile, events, and transaction links
      const borrowerProfile = await getBorrowerProfileForPledge(user.userId!);

      const request = await createPledgeRequest({
        borrowerId: user.userId!,
        borrowerWallet: user.accountId,
        pawnshopId,
        pawnshopWallet: target.walletId,
        goldDetails: goldDetails as Record<string, unknown>,
        requestedAmount,
        goldImages: goldImages || [],
        borrowerCreditScore: borrowerProfile?.creditScore || 0,
        borrowerCreditTier: borrowerProfile?.creditTier || "Unscored",
        borrowerEvents: borrowerProfile?.events || [],
        borrowerTransactionLinks: borrowerProfile?.transactionLinks || [],
      });

      // Notify pawnshop via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit("pledge-request:new", {
          requestId: request.id,
          pawnshopId,
          borrowerName: `${user.userFirstName} ${user.userLastName}`,
          goldType: goldDetails.assetType,
          weight: goldDetails.weightG,
          creditScore: borrowerProfile?.creditScore || 0,
          status: "pending",
        });
      }

      // Save notification for pawnshop
      await createNotification({
        userId: pawnshopId,
        type: "pledge_request_new",
        title: "New Pledge Request",
        message: `${user.userFirstName} ${user.userLastName} wants to pledge ${goldDetails.weightG}g ${goldDetails.assetType} ${goldDetails.karat}K gold.`,
        data: { requestId: request.id, borrowerWallet: user.accountId, goldType: goldDetails.assetType, weight: goldDetails.weightG },
      });

      res.status(201).json({
        success: true,
        message: "Pledge request sent to pawnshop",
        data: request,
      });
    } catch (error) {
      console.error("Error creating pledge request:", error);
      res.status(500).json({ success: false, error: "Failed to create pledge request" });
    }
  }

  /**
   * GET /pledge-requests/mine -- Get current user's pledge requests (role-aware)
   */
  async getMine(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const { status, page_size, page_number } = req.query;
      const pageSize = Number(page_size) || 20;
      const pageNumber = Number(page_number) || 1;

      if (user.roleId === "PAWNSHOP") {
        const result = await getPledgeRequestsByPawnshop(
          user.userId!,
          status as string | undefined,
          pageSize,
          pageNumber
        );
        res.status(200).json({ success: true, data: result.data, total: result.total });
      } else {
        const result = await getPledgeRequestsByBorrower(
          user.userId!,
          pageSize,
          pageNumber
        );
        res.status(200).json({ success: true, data: result.data, total: result.total });
      }
    } catch (error) {
      console.error("Error fetching pledge requests:", error);
      res.status(500).json({ success: false, error: "Failed to fetch pledge requests" });
    }
  }

  /**
   * GET /pledge-requests/:id -- Get single pledge request
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }
      res.status(200).json({ success: true, data: request });
    } catch (error) {
      console.error("Error fetching pledge request:", error);
      res.status(500).json({ success: false, error: "Failed to fetch pledge request" });
    }
  }

  /**
   * PATCH /pledge-requests/:id/refresh-credit -- Refresh borrower credit score from CC3
   */
  async refreshCreditScore(req: Request, res: Response): Promise<void> {
    try {
      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }

      const updatedProfile = await getBorrowerProfileForPledge(request.borrowerId);
      if (!updatedProfile) {
        res.status(404).json({ success: false, error: "Could not fetch credit profile" });
        return;
      }

      // Update the stored credit score
      const { pool } = await import("@/db/index.js");
      await pool.query(
        `UPDATE main.pledge_request SET borrower_credit_score = $1, borrower_credit_tier = $2, borrower_events = $3 WHERE id = $4`,
        [updatedProfile.creditScore, updatedProfile.creditTier, JSON.stringify(updatedProfile.events), request.id]
      );

      res.status(200).json({
        success: true,
        data: {
          borrowerCreditScore: updatedProfile.creditScore,
          borrowerCreditTier: updatedProfile.creditTier,
        },
      });
    } catch (error) {
      console.error("Error refreshing credit score:", error);
      res.status(500).json({ success: false, error: "Failed to refresh credit score" });
    }
  }

  /**
   * PATCH /pledge-requests/:id/accept -- Pawnshop accepts the pledge request
   * V2: Shares pawnshop contact details with borrower for physical meeting
   */
  async accept(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== "PAWNSHOP") {
        res.status(403).json({ success: false, error: "Only pawnshops can accept requests" });
        return;
      }

      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }
      if (request.pawnshopId !== user.userId) {
        res.status(403).json({ success: false, error: "This request was not sent to you" });
        return;
      }
      if (request.status !== "pending") {
        res.status(400).json({ success: false, error: `Cannot accept a request with status: ${request.status}` });
        return;
      }

      const { notes, contactName, contactPhone, location } = req.body || {};

      // Update status
      const updated = await updatePledgeRequestStatus(request.id, "accepted", notes);

      // V2: Share pawnshop contact with borrower
      if (contactName && contactPhone && location) {
        await updatePawnshopContact(request.id, {
          pawnshopContactName: contactName,
          pawnshopContactPhone: contactPhone,
          pawnshopLocation: location,
        });
      }

      // Notify borrower via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit("pledge-request:accepted", {
          requestId: request.id,
          borrowerId: request.borrowerId,
          pawnshopName: `${user.userFirstName} ${user.userLastName}`,
          contactName: contactName || "",
          contactPhone: contactPhone || "",
          location: location || "",
          notes,
        });
      }

      // Save notification for borrower
      await createNotification({
        userId: request.borrowerId,
        type: "pledge_accepted",
        title: "Pledge Request Accepted",
        message: `${user.userFirstName} ${user.userLastName} accepted your pledge request. Contact: ${contactName || "N/A"}, ${contactPhone || "N/A"}. Location: ${location || "N/A"}.`,
        data: { requestId: request.id, contactName, contactPhone, location },
      });

      res.status(200).json({
        success: true,
        message: "Pledge request accepted. Borrower has been notified to schedule a physical meeting.",
        data: updated,
      });
    } catch (error) {
      console.error("Error accepting pledge request:", error);
      res.status(500).json({ success: false, error: "Failed to accept pledge request" });
    }
  }

  /**
   * PATCH /pledge-requests/:id/reject -- Pawnshop rejects the pledge request
   */
  async reject(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== "PAWNSHOP") {
        res.status(403).json({ success: false, error: "Only pawnshops can reject requests" });
        return;
      }

      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }
      if (request.pawnshopId !== user.userId) {
        res.status(403).json({ success: false, error: "This request was not sent to you" });
        return;
      }

      const { notes } = req.body || {};
      const updated = await updatePledgeRequestStatus(request.id, "rejected", notes);

      // Notify borrower via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit("pledge-request:rejected", {
          requestId: request.id,
          borrowerId: request.borrowerId,
          pawnshopName: `${user.userFirstName} ${user.userLastName}`,
          notes,
        });
      }

      await createNotification({
        userId: request.borrowerId,
        type: "pledge_rejected",
        title: "Pledge Request Rejected",
        message: `${user.userFirstName} ${user.userLastName} declined your pledge request.${notes ? ` Reason: ${notes}` : ""}`,
        data: { requestId: request.id },
      });

      res.status(200).json({
        success: true,
        message: "Pledge request rejected",
        data: updated,
      });
    } catch (error) {
      console.error("Error rejecting pledge request:", error);
      res.status(500).json({ success: false, error: "Failed to reject pledge request" });
    }
  }

  /**
   * PATCH /pledge-requests/:id/verify-gold -- Pawnshop verifies gold after physical meeting
   * V2: Pawnshop confirms or updates the gold details after inspection
   */
  async verifyGold(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== "PAWNSHOP") {
        res.status(403).json({ success: false, error: "Only pawnshops can verify gold" });
        return;
      }

      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }
      if (request.pawnshopId !== user.userId) {
        res.status(403).json({ success: false, error: "This request was not sent to you" });
        return;
      }
      if (request.status !== "accepted") {
        res.status(400).json({ success: false, error: "Request must be accepted before gold verification" });
        return;
      }

      const parsed = VerifyGoldSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        return;
      }

      const updated = await verifyGold(request.id, parsed.data);

      // Notify borrower via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit("pledge-request:verified", {
          requestId: request.id,
          borrowerId: request.borrowerId,
          status: parsed.data.verificationStatus,
          notes: parsed.data.verificationNotes || "",
          verifiedWeightG: parsed.data.verifiedWeightG,
          verifiedKarat: parsed.data.verifiedKarat,
          loanDurationMonths: parsed.data.loanDurationMonths,
        });
      }

      const verifiedMsg = parsed.data.verificationStatus === "verified"
        ? `Gold verified!${parsed.data.verifiedWeightG ? ` Weight: ${parsed.data.verifiedWeightG}g.` : ""}${parsed.data.loanDurationMonths ? ` Loan duration: ${parsed.data.loanDurationMonths} months.` : ""} You can now meet the pawnshop to complete the process.`
        : `Gold rejected by pawnshop.${parsed.data.verificationNotes ? ` Reason: ${parsed.data.verificationNotes}` : ""}`;

      await createNotification({
        userId: request.borrowerId,
        type: parsed.data.verificationStatus === "verified" ? "gold_verified" : "gold_rejected",
        title: parsed.data.verificationStatus === "verified" ? "Gold Verified" : "Gold Rejected",
        message: verifiedMsg,
        data: { requestId: request.id, verificationStatus: parsed.data.verificationStatus },
      });

      const msg = parsed.data.verificationStatus === "verified"
        ? "Gold verified. Borrower has been notified."
        : "Gold rejected. Borrower has been notified.";

      res.status(200).json({
        success: true,
        message: msg,
        data: updated,
      });
    } catch (error) {
      console.error("Error verifying gold:", error);
      res.status(500).json({ success: false, error: "Failed to verify gold" });
    }
  }

  /**
   * PATCH /pledge-requests/:id/record-payment -- Pawnshop records ETH payment to borrower
   * V2: Requires Sepolia tx hash + optional CC3 attestation hash
   */
  async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== "PAWNSHOP") {
        res.status(403).json({ success: false, error: "Only pawnshops can record payments" });
        return;
      }

      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }
      if (request.pawnshopId !== user.userId) {
        res.status(403).json({ success: false, error: "This request was not sent to you" });
        return;
      }
      if (request.status !== "gold_verified") {
        res.status(400).json({ success: false, error: "Gold must be verified before recording payment" });
        return;
      }

      const parsed = RecordPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        return;
      }

      const updated = await recordPayment(request.id, parsed.data);

      // Notify borrower via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit("pledge-request:paid", {
          requestId: request.id,
          borrowerId: request.borrowerId,
          paymentAmountUsd: parsed.data.paymentAmountUsd,
          paymentTxHash: parsed.data.paymentTxHash,
          paymentCc3TxHash: parsed.data.paymentCc3TxHash || "",
        });
      }

      await createNotification({
        userId: request.borrowerId,
        type: "payment_received",
        title: "Payment Received",
        message: `Pawnshop has paid $${parsed.data.paymentAmountUsd.toLocaleString()} USD to your wallet. Sepolia tx: ${parsed.data.paymentTxHash.slice(0, 10)}...`,
        data: { requestId: request.id, paymentTxHash: parsed.data.paymentTxHash, paymentCc3TxHash: parsed.data.paymentCc3TxHash, paymentAmountUsd: parsed.data.paymentAmountUsd },
      });

      res.status(200).json({
        success: true,
        message: "Payment recorded. Borrower has been notified. You can now mint the SAG token.",
        data: updated,
      });
    } catch (error) {
      console.error("Error recording payment:", error);
      res.status(500).json({ success: false, error: "Failed to record payment" });
    }
  }

  /**
   * PATCH /pledge-requests/:id/mint-sag -- Pawnshop mints SAG token after payment
   * V2: Final step -- SAG token minted for investors to fund
   */
  async mintSag(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== "PAWNSHOP") {
        res.status(403).json({ success: false, error: "Only pawnshops can mint SAG tokens" });
        return;
      }

      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }
      if (request.pawnshopId !== user.userId) {
        res.status(403).json({ success: false, error: "This request was not sent to you" });
        return;
      }
      if (request.status !== "funded") {
        res.status(400).json({ success: false, error: "Payment must be completed before minting SAG" });
        return;
      }

      // Auto-mint SAG on CC3 using pledge request data
      const { SagTokenService } = await import("@/features/creditcoin/sag-token.service.js");
      const sagService = new SagTokenService();

      const goldDetails = request.goldDetails as any;
      const weightGrams = request.verifiedWeightG || goldDetails.weightG;
      const karat = request.verifiedKarat || goldDetails.karat;
      const appraisedValue = request.verifiedAppraisedValueUsd || goldDetails.estimatedValue;
      const loanAmount = request.paymentAmountUsd || appraisedValue * 0.7;
      const tenureDays = (request.loanDurationMonths || 1) * 30;

      console.log(`[PledgeRequest] Auto-minting SAG: weight=${weightGrams}g, karat=${karat}, value=$${appraisedValue}, loan=$${loanAmount}`);

      const mintResult = await sagService.mintCollateral({
        pawnshopAddress: request.pawnshopWallet,
        borrowerAddress: request.borrowerWallet,
        weightGrams: Number(weightGrams),
        karat: Number(karat),
        appraisedValueUSD: Number(appraisedValue),
        loanAmount: Number(loanAmount),
        tenureDays: Number(tenureDays),
        ipfsMetadataUri: "", // Optional
      });

      if (!mintResult.success) {
        res.status(500).json({ success: false, error: mintResult.error || "Failed to mint SAG token on CC3" });
        return;
      }

      const investmentTarget = req.body?.investmentTargetUsd || request.paymentAmountUsd || Number(appraisedValue) * 0.7;
      const minInvestment = req.body?.minInvestmentUsd || 100;
      const updated = await recordSagMint(request.id, mintResult.tokenId!, Number(investmentTarget), Number(minInvestment));

      // Create SAG record in sag table for pawnshop dashboard
      try {
        const { createSag } = await import("@/features/sag/sag.repository.js");
        await createSag({
          tokenId: mintResult.tokenId!,
          sagName: `${goldDetails.assetType || 'Gold'} ${karat}K - ${weightGrams}g`,
          sagDescription: `Gold collateral NFT backed by ${weightGrams}g of ${karat}K gold. Appraised value: $${appraisedValue}.`,
          sagProperties: {
            assetType: goldDetails.assetType || 'Gold',
            karat: Number(karat),
            weightG: Number(weightGrams),
            valuation: Number(appraisedValue),
            enableMinting: true,
            mintShare: 100,
            soldShare: 0,
            investorFinancingType: 'fractional',
            investorRoiPercentage: 12,
            investorRoiFixedAmount: 0,
            currency: 'USD',
            loanPercentage: 70,
            loan: Number(investmentTarget),
            pawnerInterestP: 0,
            tenorM: Number(tenureDays),
            purity: Number(goldDetails.purity || 999),
            imageUrl: request.goldImages || [],
            investmentTargetUsd: Number(investmentTarget),
            minInvestmentUsd: Number(minInvestment),
            investmentFilledUsd: 0,
            loanDurationMonths: Number(tenureDays / 30),
            borrowerWallet: request.borrowerWallet,
            pawnshopWallet: request.pawnshopWallet,
          },
          originalOwner: request.pawnshopWallet,
          status: 'active',
          approvalStatus: 'approved',
        });
        console.log(`[PledgeRequest] Created SAG record for token ${mintResult.tokenId}`);
      } catch (sagErr: any) {
        console.warn('[PledgeRequest] Failed to create SAG record:', sagErr.message);
      }

      // Notify investor-facing systems via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit("sag:minted", {
          requestId: request.id,
          sagTokenId: mintResult.tokenId,
          borrowerId: request.borrowerId,
          pawnshopId: request.pawnshopId,
          goldDetails: request.goldDetails,
        });
      }

      res.status(200).json({
        success: true,
        message: "SAG token minted on CC3. Investors can now fund this loan.",
        data: {
          ...updated,
          sagTxHash: mintResult.transactionHash,
          sagExplorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${mintResult.transactionHash}`,
        },
      });
    } catch (error) {
      console.error("Error minting SAG:", error);
      res.status(500).json({ success: false, error: "Failed to record SAG mint" });
    }
  }

  /**
   * GET /pledge-requests/pawnshops -- List all active pawnshops (for borrower selection)
   */
  async listPawnshops(_req: Request, res: Response): Promise<void> {
    try {
      const pawnshops = await getAllPawnshops();
      res.status(200).json({ success: true, data: pawnshops });
    } catch (error) {
      console.error("Error fetching pawnshops:", error);
      res.status(500).json({ success: false, error: "Failed to fetch pawnshops" });
    }
  }
}

export const pledgeRequestController = new PledgeRequestController();
