import { MainSchema } from "@/db/db.schema.js";
import { boolean, jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const NotificationModel = MainSchema.table("notifications", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: varchar("user_id", { length: 40 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data").default({}),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NotificationModelType = typeof NotificationModel.$inferSelect;
