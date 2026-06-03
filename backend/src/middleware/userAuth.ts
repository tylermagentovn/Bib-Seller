import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface UserRequest extends Request {
  userId?: string;
}

export function requireUserAuth(req: UserRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục" });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: string };
    if (!payload.userId) {
      res.status(401).json({ error: "Token không hợp lệ" });
      return;
    }
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
  }
}

export function optionalUserAuth(req: UserRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: string };
      if (payload.userId) req.userId = payload.userId;
    } catch {
      // ignore
    }
  }
  next();
}
