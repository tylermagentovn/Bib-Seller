import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as any,
  });

  res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.adminId },
    select: { id: true, email: true, name: true },
  });
  if (!admin) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(admin);
});

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

router.post("/admins", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password, name } = parsed.data;
  const exists = await prisma.admin.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.create({
    data: { email, password: hashed, name },
    select: { id: true, email: true, name: true },
  });
  res.status(201).json(admin);
});

router.get("/admins", requireAuth, async (_req: AuthRequest, res: Response) => {
  const admins = await prisma.admin.findMany({
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(admins);
});

router.delete("/admins/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  if (id === req.adminId) {
    res.status(400).json({ error: "Cannot delete yourself" });
    return;
  }
  await prisma.admin.delete({ where: { id } });
  res.status(204).send();
});

export default router;
