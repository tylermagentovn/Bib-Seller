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

const memberUpdateSchema = z.object({
  id: z.string(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  idNumber: z.string().nullable().optional(),
  shirtSize: z.string().nullable().optional(),
  bloodType: z.string().nullable().optional(),
  medicalConditions: z.string().nullable().optional(),
  emergencyName: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
});

const updateRegistrationSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  idNumber: z.string().nullable().optional(),
  shirtSize: z.string().nullable().optional(),
  bloodType: z.string().nullable().optional(),
  medicalConditions: z.string().nullable().optional(),
  emergencyName: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
  members: z.array(memberUpdateSchema).optional(),
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
  res.status(201).json({ token, user: { ...user, hasPassword: true } });
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
  if (!user) {
    res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    return;
  }
  if (!user.password) {
    const via = user.googleId ? "Google" : user.facebookId ? "Facebook" : "mạng xã hội";
    res.status(401).json({ error: `Tài khoản này đăng nhập bằng ${via}. Vui lòng dùng nút đăng nhập tương ứng.` });
    return;
  }
  if (!(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    return;
  }
  const { password: _pw, googleId: _gid, facebookId: _fbid, ...userData } = user;
  const token = makeToken(user.id);
  res.json({ token, user: { ...userData, hasPassword: true } });
});

// POST /users/auth/google
router.post("/auth/google", async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (!accessToken || typeof accessToken !== "string") {
    res.status(400).json({ error: "Thiếu accessToken" });
    return;
  }
  let googleUser: { sub?: string; email?: string; name?: string };
  try {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) throw new Error("invalid token");
    googleUser = (await r.json()) as { sub?: string; email?: string; name?: string };
  } catch {
    res.status(401).json({ error: "Token Google không hợp lệ" });
    return;
  }
  if (!googleUser.email || !googleUser.sub) {
    res.status(401).json({ error: "Không lấy được thông tin từ Google" });
    return;
  }
  const { sub: googleId, email, name: fullName } = googleUser;

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (user) {
    // Link Google ID nếu chưa có
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }
  } else {
    user = await prisma.user.create({
      data: { email, googleId, fullName: fullName ?? null },
    });
  }

  const { password: _pw, googleId: _gid, facebookId: _fbid, ...userData } = user;
  const token = makeToken(user.id);
  res.json({ token, user: { ...userData, hasPassword: !!_pw } });
});

// POST /users/auth/facebook
router.post("/auth/facebook", async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (!accessToken || typeof accessToken !== "string") {
    res.status(400).json({ error: "Thiếu accessToken" });
    return;
  }
  let fbUser: { id?: string; email?: string; name?: string };
  try {
    const r = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
    if (!r.ok) throw new Error("invalid token");
    fbUser = (await r.json()) as { id?: string; email?: string; name?: string };
  } catch {
    res.status(401).json({ error: "Token Facebook không hợp lệ" });
    return;
  }
  if (!fbUser.id) {
    res.status(401).json({ error: "Không lấy được thông tin từ Facebook" });
    return;
  }
  const { id: facebookId, email, name: fullName } = fbUser;

  let user = await prisma.user.findFirst({
    where: email ? { OR: [{ facebookId }, { email }] } : { facebookId },
  });

  if (user) {
    if (!user.facebookId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { facebookId } });
    }
  } else {
    if (!email) {
      res.status(400).json({ error: "Tài khoản Facebook không có email. Vui lòng đăng ký bằng email." });
      return;
    }
    user = await prisma.user.create({ data: { email, facebookId, fullName: fullName ?? null } });
  }

  const { password: _pw, googleId: _gid, facebookId: _fbid, ...userData } = user;
  const token = makeToken(user.id);
  res.json({ token, user: { ...userData, hasPassword: !!_pw } });
});

// GET /users/me
router.get("/me", requireUserAuth, async (req: UserRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { ...USER_SELECT, password: true },
  });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const { password, ...userData } = user;
  res.json({ ...userData, hasPassword: !!password });
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
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  if (user.password) {
    // Tài khoản thường — yêu cầu mật khẩu hiện tại
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() }); return;
    }
    const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: "Mật khẩu hiện tại không đúng" }); return;
    }
    const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });
  } else {
    // Tài khoản Google — đặt mật khẩu mới trực tiếp
    const parsed = z.object({
      newPassword: z.string().min(6, "Mật khẩu mới ít nhất 6 ký tự"),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() }); return;
    }
    const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });
  }

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

  const { members, ...regFields } = parsed.data;

  const REG_INCLUDE = {
    event: true,
    distance: true,
    payment: true,
    teamMembers: { orderBy: { memberIndex: "asc" } },
  } as const;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.registration.update({
      where: { id: req.params.id as string },
      data: {
        ...regFields,
        email: regFields.email || null,
        dob: regFields.dob !== undefined ? (regFields.dob ? new Date(regFields.dob) : null) : undefined,
      },
    });

    if (members && members.length > 0) {
      await Promise.all(members.map((m) =>
        tx.teamMember.update({
          where: { id: m.id },
          data: {
            fullName: m.fullName,
            phone: m.phone,
            email: m.email || null,
            gender: m.gender || null,
            dob: m.dob !== undefined ? (m.dob ? new Date(m.dob) : null) : undefined,
            idNumber: m.idNumber || null,
            shirtSize: m.shirtSize || null,
            bloodType: m.bloodType || null,
            medicalConditions: m.medicalConditions || null,
            emergencyName: m.emergencyName || null,
            emergencyPhone: m.emergencyPhone || null,
          },
        })
      ));
    }

    return tx.registration.findUnique({
      where: { id: req.params.id as string },
      include: REG_INCLUDE,
    });
  });
  res.json(updated);
});

export default router;
