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
        });
      }

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

      const { sagTokenId } = req.body || {};
      if (!sagTokenId) {
        res.status(400).json({ success: false, error: "sagTokenId is required (from on-chain mint)" });
        return;
      }

      const updated = await recordSagMint(request.id, sagTokenId);

      // Notify investor-facing systems via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit("sag:minted", {
          requestId: request.id,
          sagTokenId,
          borrowerId: request.borrowerId,
          pawnshopId: request.pawnshopId,
          goldDetails: request.goldDetails,
        });
      }

      res.status(200).json({
        success: true,
        message: "SAG token minted. Investors can now fund this loan.",
        data: updated,
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
