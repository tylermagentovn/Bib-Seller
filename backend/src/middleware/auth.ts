import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  adminId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { adminId: string };
    req.adminId = payload.adminId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
