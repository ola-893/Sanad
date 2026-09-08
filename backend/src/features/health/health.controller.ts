import { Request, Response } from 'express';
// DB 
import { db } from '@/db/index';
import { sql } from 'drizzle-orm';
// Error Types
import { Error } from '@/error/index';

export const healthCheck = (req: Request, res: Response) => {
  res.send("OK");
}

export const dbHealthCheck = async (req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ success: true, database: 'connected' });
  } catch (error) {
    console.error('DB Health Check error:', error);
    res.status(500).json({
      success: false,
      message: Error.DATABASE_CONNECTION_ERROR,
      data: null
    });
  }
}
