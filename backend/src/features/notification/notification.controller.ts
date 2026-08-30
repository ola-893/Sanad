import { Request, Response } from "express";
import { getUserDataByToken } from "../auth/auth.repository.js";
import {
  getNotificationsByUser,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "./notification.repository.js";

function getToken(req: Request): string {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : req.headers.authorization || "";
}

export class NotificationController {
  /**
   * GET /notifications -- Get current user's notifications
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const { page_size, page_number } = req.query;
      const pageSize = Number(page_size) || 20;
      const pageNumber = Number(page_number) || 1;

      const result = await getNotificationsByUser(user.userId!, pageSize, pageNumber);
      res.status(200).json({ success: true, data: result.data, total: result.total, unreadCount: result.unreadCount });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ success: false, error: "Failed to fetch notifications" });
    }
  }

  /**
   * GET /notifications/unread-count -- Get unread notification count
   */
  async unreadCount(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const count = await getUnreadCount(user.userId!);
      res.status(200).json({ success: true, data: { count } });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ success: false, error: "Failed to fetch unread count" });
    }
  }

  /**
   * PATCH /notifications/:id/read -- Mark a notification as read
   */
  async markRead(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      await markAsRead(String(req.params.id));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ success: false, error: "Failed to mark notification" });
    }
  }

  /**
   * PATCH /notifications/read-all -- Mark all notifications as read
   */
  async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      await markAllAsRead(user.userId!);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ success: false, error: "Failed to mark all notifications" });
    }
  }
}

export const notificationController = new NotificationController();
