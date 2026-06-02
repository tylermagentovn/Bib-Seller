import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  adminId?: string;
  adminRole?: "SUPER_ADMIN" | "EVENT_MANAGER";
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      adminId: string;
      role: "SUPER_ADMIN" | "EVENT_MANAGER";
    };
    req.adminId = payload.adminId;
    req.adminRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.adminRole !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Forbidden: Yêu cầu quyền Super Admin" });
      return;
    }
    next();
  });
}
