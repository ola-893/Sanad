import { Request, Response } from 'express';
import { getUserDataByToken } from '../auth/auth.repository.js';
import { CreatePledgeRequestSchema } from './pledge-request.model.js';
import {
  createPledgeRequest,
  getPledgeRequestsByBorrower,
  getPledgeRequestsByPawnshop,
  getPledgeRequestById,
  updatePledgeRequestStatus,
  getAllPawnshops,
} from './pledge-request.repository.js';
import { getSocketService } from '../../services/socket.service.js';

function getToken(req: Request): string {
  return req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : req.headers.authorization || '';
}

export class PledgeRequestController {
  /**
   * POST /pledge-requests — Borrower creates a pledge request to a pawnshop
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const parsed = CreatePledgeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        return;
      }

      const { pawnshopId, goldDetails, requestedAmount } = parsed.data;

      // Find the pawnshop's wallet address
      const pawnshops = await getAllPawnshops();
      const target = pawnshops.find((p) => p.userId === pawnshopId);
      if (!target) {
        res.status(404).json({ success: false, error: 'Pawnshop not found' });
        return;
      }

      const request = await createPledgeRequest({
        borrowerId: user.userId!,
        borrowerWallet: user.accountId,
        pawnshopId,
        pawnshopWallet: target.walletId,
        goldDetails: goldDetails as Record<string, unknown>,
        requestedAmount,
      });

      // Notify pawnshop via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit('pledge-request:new', {
          requestId: request.id,
          pawnshopId,
          borrowerName: `${user.userFirstName} ${user.userLastName}`,
          goldType: goldDetails.assetType,
          weight: goldDetails.weightG,
          status: 'pending',
        });
      }

      res.status(201).json({
        success: true,
        message: 'Pledge request sent to pawnshop',
        data: request,
      });
    } catch (error) {
      console.error('Error creating pledge request:', error);
      res.status(500).json({ success: false, error: 'Failed to create pledge request' });
    }
  }

  /**
   * GET /pledge-requests/mine — Get current user's pledge requests (role-aware)
   */
  async getMine(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { status, page_size, page_number } = req.query;
      const pageSize = Number(page_size) || 20;
      const pageNumber = Number(page_number) || 1;

      if (user.roleId === 'PAWNSHOP') {
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
      console.error('Error fetching pledge requests:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pledge requests' });
    }
  }

  /**
   * GET /pledge-requests/:id — Get single pledge request
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: 'Pledge request not found' });
        return;
      }
      res.status(200).json({ success: true, data: request });
    } catch (error) {
      console.error('Error fetching pledge request:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pledge request' });
    }
  }

  /**
   * PATCH /pledge-requests/:id/accept — Pawnshop accepts the pledge request
   */
  async accept(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== 'PAWNSHOP') {
        res.status(403).json({ success: false, error: 'Only pawnshops can accept requests' });
        return;
      }

      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: 'Pledge request not found' });
        return;
      }
      if (request.pawnshopId !== user.userId) {
        res.status(403).json({ success: false, error: 'This request was not sent to you' });
        return;
      }
      if (request.status !== 'pending') {
        res.status(400).json({ success: false, error: `Cannot accept a request with status: ${request.status}` });
        return;
      }

      const { notes } = req.body || {};
      const updated = await updatePledgeRequestStatus(request.id, 'accepted', notes);

      // Notify borrower via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit('pledge-request:accepted', {
          requestId: request.id,
          borrowerId: request.borrowerId,
          pawnshopName: `${user.userFirstName} ${user.userLastName}`,
          notes,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Pledge request accepted. Please meet the pawnshop to complete verification.',
        data: updated,
      });
    } catch (error) {
      console.error('Error accepting pledge request:', error);
      res.status(500).json({ success: false, error: 'Failed to accept pledge request' });
    }
  }

  /**
   * PATCH /pledge-requests/:id/reject — Pawnshop rejects the pledge request
   */
  async reject(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== 'PAWNSHOP') {
        res.status(403).json({ success: false, error: 'Only pawnshops can reject requests' });
        return;
      }

      const request = await getPledgeRequestById(req.params.id as string);
      if (!request) {
        res.status(404).json({ success: false, error: 'Pledge request not found' });
        return;
      }
      if (request.pawnshopId !== user.userId) {
        res.status(403).json({ success: false, error: 'This request was not sent to you' });
        return;
      }

      const { notes } = req.body || {};
      const updated = await updatePledgeRequestStatus(request.id, 'rejected', notes);

      // Notify borrower via Socket.IO
      const socket = getSocketService();
      if (socket?.io) {
        socket.io.emit('pledge-request:rejected', {
          requestId: request.id,
          borrowerId: request.borrowerId,
          pawnshopName: `${user.userFirstName} ${user.userLastName}`,
          notes,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Pledge request rejected',
        data: updated,
      });
    } catch (error) {
      console.error('Error rejecting pledge request:', error);
      res.status(500).json({ success: false, error: 'Failed to reject pledge request' });
    }
  }

  /**
   * GET /pledge-requests/pawnshops — List all active pawnshops (for borrower selection)
   */
  async listPawnshops(_req: Request, res: Response): Promise<void> {
    try {
      const pawnshops = await getAllPawnshops();
      res.status(200).json({ success: true, data: pawnshops });
    } catch (error) {
      console.error('Error fetching pawnshops:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pawnshops' });
    }
  }
}

export const pledgeRequestController = new PledgeRequestController();
