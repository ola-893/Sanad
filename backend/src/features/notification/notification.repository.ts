import { db } from "@/db/index.js";
import { eq, desc, and, count } from "drizzle-orm";
import { NotificationModel, NotificationModelType } from "./notification.model.js";

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}): Promise<NotificationModelType> {
  const [result] = await db
    .insert(NotificationModel)
    .values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || {},
    })
    .returning();
  return result;
}

export async function getNotificationsByUser(
  userId: string,
  pageSize = 20,
  pageNumber = 1
): Promise<{ data: NotificationModelType[]; total: number; unreadCount: number }> {
  const offset = (pageNumber - 1) * pageSize;

  const data = await db
    .select()
    .from(NotificationModel)
    .where(eq(NotificationModel.userId, userId))
    .orderBy(desc(NotificationModel.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ count: total }] = await db
    .select({ count: NotificationModel.id })
    .from(NotificationModel)
    .where(eq(NotificationModel.userId, userId));

  const [{ count: unreadCount }] = await db
    .select({ count: NotificationModel.id })
    .from(NotificationModel)
    .where(and(eq(NotificationModel.userId, userId), eq(NotificationModel.read, false)));

  return { data, total: Number(total), unreadCount: Number(unreadCount) };
}

export async function markAsRead(id: string): Promise<void> {
  await db
    .update(NotificationModel)
    .set({ read: true })
    .where(eq(NotificationModel.id, id));
}

export async function markAllAsRead(userId: string): Promise<void> {
  await db
    .update(NotificationModel)
    .set({ read: true })
    .where(and(eq(NotificationModel.userId, userId), eq(NotificationModel.read, false)));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: NotificationModel.id })
    .from(NotificationModel)
    .where(and(eq(NotificationModel.userId, userId), eq(NotificationModel.read, false)));
  return Number(count);
}
