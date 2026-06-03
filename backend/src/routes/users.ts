import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireUserAuth, UserRequest } from "../middleware/userAuth";

const router = Router();

const registerSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu ít nhất 6 ký tự"),
  fullName: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  fullName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  idNumber: z.string().nullable().optional(),
  shirtSize: z.string().nullable().optional(),
  bloodType: z.string().nullable().optional(),
  medicalConditions: z.string().nullable().optional(),
  emergencyName: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
  newPassword: z.string().min(6, "Mật khẩu mới ít nhất 6 ký tự"),
});

const updateRegistrationSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

function makeToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.USER_JWT_EXPIRES_IN ?? "30d") as any,
  });
}

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  gender: true,
  dob: true,
  idNumber: true,
  shirtSize: true,
  bloodType: true,
  medicalConditions: true,
  emergencyName: true,
  emergencyPhone: true,
  createdAt: true,
};

// POST /users/register
router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, fullName } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ error: "Email này đã được sử dụng" });
    return;
  }
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, fullName: fullName ?? null },
    select: USER_SELECT,
  });
  const token = makeToken(user.id);
  res.status(201).json({ token, user });
});

// POST /users/login
router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    return;
  }
  const { password: _pw, ...userData } = user;
  const token = makeToken(user.id);
  res.json({ token, user: userData });
});

// GET /users/me
router.get("/me", requireUserAuth, async (req: UserRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: USER_SELECT,
  });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(user);
});

// PUT /users/me
router.put("/me", requireUserAuth, async (req: UserRequest, res: Response) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { ...data, dob: data.dob ? new Date(data.dob) : null },
    select: USER_SELECT,
  });
  res.json(user);
});

// PUT /users/me/password
router.put("/me/password", requireUserAuth, async (req: UserRequest, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) {
    res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });
    return;
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });
  res.json({ message: "Đổi mật khẩu thành công" });
});

// GET /users/me/registrations
router.get("/me/registrations", requireUserAuth, async (req: UserRequest, res: Response) => {
  const registrations = await prisma.registration.findMany({
    where: { userId: req.userId },
    include: {
      event: true,
      distance: true,
      payment: true,
      teamMembers: { orderBy: { memberIndex: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(registrations);
});

// PUT /users/me/registrations/:id
router.put("/me/registrations/:id", requireUserAuth, async (req: UserRequest, res: Response) => {
  const parsed = updateRegistrationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const registration = await prisma.registration.findUnique({
    where: { id: req.params.id as string },
  });
  if (!registration) {
    res.status(404).json({ error: "Không tìm thấy đăng ký" });
    return;
  }
  if (registration.userId !== req.userId) {
    res.status(403).json({ error: "Bạn không có quyền sửa đăng ký này" });
    return;
  }

  const updated = await prisma.registration.update({
    where: { id: req.params.id as string },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      emergencyName: parsed.data.emergencyName,
      emergencyPhone: parsed.data.emergencyPhone,
    },
    include: {
      event: true,
      distance: true,
      payment: true,
      teamMembers: { orderBy: { memberIndex: "asc" } },
    },
  });
  res.json(updated);
});

export default router;
