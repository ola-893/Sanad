import express from "express";
import { notificationController } from "./notification.controller.js";
import authenticateJWT from "@/middleware/authenticate-jwt.js";

const router = express.Router();

router.use(authenticateJWT);

router.get("/", notificationController.list.bind(notificationController));
router.get("/unread-count", notificationController.unreadCount.bind(notificationController));
router.patch("/:id/read", notificationController.markRead.bind(notificationController));
router.patch("/read-all", notificationController.markAllRead.bind(notificationController));

export { router as notificationRoutes };
