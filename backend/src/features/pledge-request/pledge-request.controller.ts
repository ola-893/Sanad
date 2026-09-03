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
  getBorrowersByPawnshop,
  getBorrowerDetail,
  recordRepayment,
  getRepaymentsByPledgeRequest,
  getBorrowerLoans,
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
      const minInvestment = Math.round(Number(investmentTarget) * 0.1);
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
            investorRoiPercentage: 2,
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
            loanDurationMonths: Number(request.loanDurationMonths || tenureDays / 30),
            borrowerWallet: request.borrowerWallet,
            pawnshopWallet: request.pawnshopWallet,
            originationDate: new Date().toISOString(),
            maturityDate: new Date(Date.now() + (Number(tenureDays) * 24 * 60 * 60 * 1000)).toISOString(),
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
   * GET /pledge-requests/my-loans -- Get borrower's loans with repayment data
   */
  async getMyLoans(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const loans = await getBorrowerLoans(user.userId!);
      res.status(200).json({ success: true, data: loans });
    } catch (error) {
      console.error("Error fetching borrower loans:", error);
      res.status(500).json({ success: false, error: "Failed to fetch loans" });
    }
  }

  /**
   * GET /pledge-requests/borrowers -- Get all borrowers for this pawnshop
   */
  async getBorrowers(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== "PAWNSHOP") {
        res.status(403).json({ success: false, error: "Only pawnshops can view borrowers" });
        return;
      }

      const borrowers = await getBorrowersByPawnshop(user.userId!);
      res.status(200).json({ success: true, data: borrowers });
    } catch (error) {
      console.error("Error fetching borrowers:", error);
      res.status(500).json({ success: false, error: "Failed to fetch borrowers" });
    }
  }

  /**
   * GET /pledge-requests/borrowers/:borrowerId -- Get borrower detail for this pawnshop
   */
  async getBorrowerDetailById(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== "PAWNSHOP") {
        res.status(403).json({ success: false, error: "Only pawnshops can view borrower details" });
        return;
      }

      const detail = await getBorrowerDetail(user.userId!, req.params.borrowerId as string);
      if (!detail) {
        res.status(404).json({ success: false, error: "Borrower not found" });
        return;
      }
      res.status(200).json({ success: true, data: detail });
    } catch (error) {
      console.error("Error fetching borrower detail:", error);
      res.status(500).json({ success: false, error: "Failed to fetch borrower detail" });
    }
  }

  /**
   * POST /pledge-requests/:id/repayment -- Record a borrower repayment
   */
  async recordRepayment(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }

      const { amountUsd, txHash, cc3TxHash, notes } = req.body || {};
      if (!amountUsd || Number(amountUsd) <= 0) {
        res.status(400).json({ success: false, error: "Valid repayment amount is required" });
        return;
      }

      const repayment = await recordRepayment({
        pledgeRequestId: request.id,
        borrowerId: request.borrowerId,
        pawnshopId: request.pawnshopId,
        amountUsd: Number(amountUsd),
        txHash,
        cc3TxHash,
        notes,
      });

      // Notify pawnshop via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit("repayment:recorded", {
          requestId: request.id,
          borrowerId: request.borrowerId,
          pawnshopId: request.pawnshopId,
          amountUsd: Number(amountUsd),
        });
      }

      res.status(201).json({
        success: true,
        message: "Repayment recorded successfully",
        data: repayment,
      });
    } catch (error) {
      console.error("Error recording repayment:", error);
      res.status(500).json({ success: false, error: "Failed to record repayment" });
    }
  }

  /**
   * GET /pledge-requests/:id/repayments -- Get repayments for a pledge request
   */
  async getRepayments(req: Request, res: Response): Promise<void> {
    try {
      const repayments = await getRepaymentsByPledgeRequest(req.params.id as string);
      res.status(200).json({ success: true, data: repayments });
    } catch (error) {
      console.error("Error fetching repayments:", error);
      res.status(500).json({ success: false, error: "Failed to fetch repayments" });
    }
  }

  /**
   * POST /pledge-requests/repay-by-sag/:tokenId -- Record repayment by SAG token ID
   * Called by frontend after Sepolia tx confirms, before/during CC3 proof
   */
  async repayBySag(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const { tokenId } = req.params;
      const { txHash, amountUsd, cc3TxHash } = req.body || {};

      // Find the pledge request by SAG token ID
      const { pool } = await import("@/db/index.js");
      const prResult = await pool.query(
        `SELECT id, borrower_id, pawnshop_id FROM main.pledge_request WHERE sag_token_id = $1 LIMIT 1`,
        [tokenId]
      );

      if (prResult.rows.length === 0) {
        res.status(404).json({ success: false, error: "No pledge request found for this SAG token" });
        return;
      }

      const pr = prResult.rows[0];

      // Record the repayment
      const repayment = await recordRepayment({
        pledgeRequestId: pr.id,
        borrowerId: user.userId!,
        pawnshopId: pr.pawnshop_id,
        amountUsd: Number(amountUsd) || 0,
        txHash: txHash || "",
        cc3TxHash: cc3TxHash || "",
        notes: "Borrower repayment via RepaymentGateway",
      });

      res.status(201).json({
        success: true,
        message: "Repayment recorded",
        data: repayment,
      });
    } catch (error) {
      console.error("Error recording repayment by SAG:", error);
      res.status(500).json({ success: false, error: "Failed to record repayment" });
    }
  }

  /**
   * GET /pledge-requests/:id/return-calculation -- Pre-calculated return figures for Pawnshop Settle Modal
   * Calculates profit server-side from joined pledge_request and sag tables.
   */
  async calculateReturn(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const request = await getPledgeRequestById(id);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }

      const { pool } = await import("@/db/index.js");
      const sagTokenId = request.sagTokenId || request.sagId || "";

      // Get SAG properties for ROI and duration
      let sagProperties: any = {};
      if (sagTokenId) {
        const sagRes = await pool.query(
          `SELECT sag_properties FROM main.sag WHERE token_id = $1 LIMIT 1`,
          [sagTokenId]
        );
        if (sagRes.rows[0]?.sag_properties) {
          sagProperties = sagRes.rows[0].sag_properties;
        }
      }

      const durationMonths = Number(request.loanDurationMonths || sagProperties.loanDurationMonths || 1);
      const roiPercentage = Number(sagProperties.investorRoiPercentage || 12);

      // Check maturity
      const now = new Date();
      const originationDate = request.createdAt ? new Date(request.createdAt) : now;
      const realMaturityDate = new Date(originationDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);
      const isMatured = now >= realMaturityDate;
      const isRepaid = request.status === "repaid" || request.status === "settled";
      const isEligible = isMatured || isRepaid || request.status === "sag_minted" || request.status === "funded";

      // Get ALL investors for this SAG token from the investment table
      const invResult = await pool.query(
        `SELECT i.id, i.user_id as "userId", i.amount_usd as "amountUsd", i.eth_amount as "ethAmount",
                i.source_tx_hash as "sourceTxHash", i.cc3_tx_hash as "cc3TxHash",
                i.status, i.created_at as "createdAt",
                u.user_first_name as "firstName", u.user_last_name as "lastName",
                u.account_id as "investorWallet"
         FROM main.investment i
         LEFT JOIN main."user" u ON i.user_id = u.user_id
         WHERE i.sag_token_id = $1
         ORDER BY i.created_at ASC`,
        [sagTokenId]
      );

      // Calculate per-investor return breakdown
      const investors = invResult.rows.map((inv: any) => {
        const investedAmount = Number(inv.amountUsd || 0);
        const profit = Number((investedAmount * (roiPercentage / 100) * durationMonths).toFixed(2));
        const totalReturn = Number((investedAmount + profit).toFixed(2));
        return {
          ...inv,
          profitUsd: profit,
          totalReturnUsd: totalReturn,
        };
      });

      const totalInvested = investors.reduce((s: number, i: any) => s + Number(i.amountUsd || 0), 0);
      const totalProfit = investors.reduce((s: number, i: any) => s + i.profitUsd, 0);
      const totalReturnAll = investors.reduce((s: number, i: any) => s + i.totalReturnUsd, 0);

      res.status(200).json({
        success: true,
        data: {
          pledgeRequestId: request.id,
          sagTokenId,
          roiPercentage,
          durationMonths,
          realMaturityDate: realMaturityDate.toISOString(),
          isMatured,
          isRepaid,
          isEligible,
          pawnshopWallet: request.pawnshopWallet,
          borrowerWallet: request.borrowerWallet,
          totalInvestedUsd: totalInvested,
          totalProfitUsd: totalProfit,
          totalReturnUsd: totalReturnAll,
          investors,
        },
      });
    } catch (error: any) {
      console.error("Error calculating return:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to calculate return" });
    }
  }

  /**
   * POST /pledge-requests/:id/distribute-return
   * Pawnshop settles the funding investor on Sepolia and enqueues CC3 proof verification via BullMQ.
   */
  async distributeReturn(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const request = await getPledgeRequestById(id);
      if (!request) {
        res.status(404).json({ success: false, error: "Pledge request not found" });
        return;
      }

      // 1. Pawnshop authorization
      // The RepaymentGateway.settleInvestor() on Sepolia enforces that only the
      // pawnshop owner (msg.sender must match loanPawnshops(tokenId)) can call it.
      // So we skip the backend wallet check — the Sepolia tx will revert if wrong.
      console.log(`[distributeReturn] userId=${user.userId}, role=${user.roleId}, wallet=${(user.accountId || user.walletId || 'N/A')}, loanPawnshop=${request.pawnshopWallet}`);

      const { txHash, investorWallet: reqInvestorWallet } = req.body;
      if (!txHash) {
        res.status(400).json({ success: false, error: "txHash (Sepolia transaction hash) is required" });
        return;
      }

      const sagTokenId = request.sagTokenId || request.sagId || "";
      if (!sagTokenId) {
        res.status(400).json({ success: false, error: "Loan does not have an associated SAG token ID" });
        return;
      }

      // 2. Look up investor's investment amount from the investment table
      const { pool } = await import("@/db/index.js");
      let sagProperties: any = {};
      const sagRes = await pool.query(
        `SELECT sag_properties FROM main.sag WHERE token_id = $1 LIMIT 1`,
        [sagTokenId]
      );
      if (sagRes.rows[0]?.sag_properties) {
        sagProperties = sagRes.rows[0].sag_properties;
      }

      const durationMonths = Number(request.loanDurationMonths || sagProperties.loanDurationMonths || 1);
      const roiPercentage = Number(sagProperties.investorRoiPercentage || 12);

      // Find investor — if wallet provided, match specific; otherwise use first investor for this SAG
      let invRes;
      if (reqInvestorWallet) {
        invRes = await pool.query(
          `SELECT i.amount_usd as "amountUsd", u.account_id as "investorWallet" FROM main.investment i
           LEFT JOIN main."user" u ON i.user_id = u.user_id
           WHERE i.sag_token_id = $1 AND LOWER(u.account_id) = LOWER($2) LIMIT 1`,
          [sagTokenId, reqInvestorWallet]
        );
      } else {
        invRes = await pool.query(
          `SELECT i.amount_usd as "amountUsd", u.account_id as "investorWallet" FROM main.investment i
           LEFT JOIN main."user" u ON i.user_id = u.user_id
           WHERE i.sag_token_id = $1 ORDER BY i.created_at ASC LIMIT 1`,
          [sagTokenId]
        );
      }

      const investedAmount = invRes.rows[0] ? Number(invRes.rows[0].amountUsd) : 0;
      const investorWallet = (reqInvestorWallet || invRes.rows[0]?.investorWallet || "").toLowerCase();

      if (investedAmount <= 0) {
        res.status(400).json({ success: false, error: "No investment found for this investor on this SAG token" });
        return;
      }

      // 3. Calculate per-investor return
      const principalUsd = investedAmount;
      const profitUsd = Number((principalUsd * (roiPercentage / 100) * durationMonths).toFixed(2));
      const totalReturnUsd = Number((principalUsd + profitUsd).toFixed(2));

      // 4. Record pending loan_return row
      const { createLoanReturn } = await import("@/features/loan-return/loan-return.repository.js");
      const loanReturn = await createLoanReturn({
        pledgeRequestId: request.id,
        sagTokenId,
        pawnshopId: request.pawnshopId,
        pawnshopWallet: request.pawnshopWallet,
        investorWallet,
        principalUsd,
        profitUsd,
        totalReturnUsd,
        roiPercentage,
        durationMonths,
        sepoliaTxHash: txHash,
        status: "proving",
      });

      // 5. Enqueue CC3 proof job into BullMQ (non-blocking async)
      const { crossChainProofQueue, JOB_TYPES } = await import("@/bullmq/scheduler.js");
      const jobId = `return-${Number(sagTokenId)}-${txHash.toLowerCase()}`;

      const existingJob = await crossChainProofQueue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state !== "failed") {
          res.status(202).json({
            success: true,
            message: "Return distribution proof job already queued or active",
            data: {
              jobId: existingJob.id,
              status: state.toUpperCase(),
              statusUrl: `/api/v1/loan/return/status/${existingJob.id}`,
            },
          });
          return;
        }
        await existingJob.remove();
      }

      console.log(`[PledgeRequestController] Enqueuing return distribution proof job #${jobId} for Token #${sagTokenId}`);
      const job = await crossChainProofQueue.add(
        JOB_TYPES.PROVE_RETURN_DISTRIBUTION,
        {
          type: "return-distribution",
          sourceTxHash: txHash,
          tokenId: Number(sagTokenId),
          chainKey: 1,
          userId: user.userId,
        },
        {
          jobId,
          priority: 1,
        }
      );

      // Update return record with proofJobId
      const { updateLoanReturnByTxHash } = await import("@/features/loan-return/loan-return.repository.js");
      await updateLoanReturnByTxHash(txHash, { proofJobId: job.id });

      // Notify investor & pawnshop via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit("loan:return_distributed", {
          pledgeRequestId: request.id,
          sagTokenId,
          pawnshopWallet: request.pawnshopWallet,
          investorWallet,
          totalReturnUsd,
          profitUsd,
          sepoliaTxHash: txHash,
          jobId: job.id,
        });
      }

      res.status(202).json({
        success: true,
        message: "Investor return distribution confirmed on Sepolia. CC3 proof job queued successfully.",
        data: {
          loanReturnId: loanReturn.id,
          jobId: job.id,
          status: "QUEUED",
          statusUrl: `/api/v1/loan/return/status/${job.id}`,
          calculation: {
            principalUsd,
            profitUsd,
            totalReturnUsd,
            roiPercentage,
            durationMonths,
          },
        },
      });
    } catch (error: any) {
      console.error("Error distributing return:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to distribute return" });
    }
  }

  /**
   * GET /pledge-requests/:id/return-distribution -- Get return distribution record for pledge request
   */
  async getReturnDistribution(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { getLoanReturnByPledgeRequestId } = await import("@/features/loan-return/loan-return.repository.js");
      const loanReturn = await getLoanReturnByPledgeRequestId(id);

      if (!loanReturn) {
        res.status(404).json({ success: false, error: "No return distribution record found for this loan" });
        return;
      }

      res.status(200).json({ success: true, data: loanReturn });
    } catch (error: any) {
      console.error("Error fetching return distribution:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to fetch return distribution" });
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

