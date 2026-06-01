import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { appendRegistrationToSheet } from "../services/sheets";
import { sendContinueEmail } from "../services/email";

const router = Router();

const teamMemberSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(9),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string(),
});

const registrationSchema = z.object({
  eventId: z.string().min(1),
  distanceId: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(9),
  email: z.string().email(),
  dob: z.string(),
  emergencyName: z.string().min(1),
  emergencyPhone: z.string().min(9),
  teamMembers: z.array(teamMemberSchema).optional(),
});

// Public: create registration
router.post("/", async (req: Request, res: Response) => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  // Validate event + distance exist
  const distance = await prisma.distance.findFirst({
    where: { id: data.distanceId, eventId: data.eventId },
    include: { event: true },
  });
  if (!distance) {
    res.status(404).json({ error: "Event or distance not found" });
    return;
  }

  // Check max slots
  const paid = await prisma.registration.count({
    where: { distanceId: data.distanceId, status: "PAID" },
  });
  if (paid >= distance.maxSlots) {
    res.status(409).json({ error: "This distance is fully booked" });
    return;
  }

  // Validate team members for RELAY distances
  if (distance.type === "RELAY") {
    const required = distance.teamSize ?? 2;
    if (!data.teamMembers || data.teamMembers.length !== required) {
      res.status(400).json({ error: `Cự ly tiếp sức yêu cầu đúng ${required} thành viên` });
      return;
    }
  }

  const timeoutMinutes = Number(process.env.PAYMENT_TIMEOUT_MINUTES ?? 15);
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

  const { teamMembers, ...registrationData } = data;

  const registration = await prisma.registration.create({
    data: {
      ...registrationData,
      dob: new Date(registrationData.dob),
      payment: {
        create: {
          amount: distance.price,
          expiresAt,
        },
      },
      ...(distance.type === "RELAY" && teamMembers
        ? {
            teamMembers: {
              create: teamMembers.map((m, i) => ({
                memberIndex: i + 1,
                fullName: m.fullName,
                phone: m.phone,
                email: m.email || null,
                dob: new Date(m.dob),
              })),
            },
          }
        : {}),
    },
    include: {
      payment: true,
      distance: true,
      event: true,
      teamMembers: true,
    },
  });

  // Sync to Google Sheet (fire-and-forget)
  appendRegistrationToSheet({
    registrationId: registration.id,
    fullName: registration.fullName,
    phone: registration.phone,
    email: registration.email,
    dob: registration.dob.toISOString().split("T")[0],
    eventName: registration.event.name,
    distanceName: registration.distance.name,
    bibNumber: null,
    status: registration.status,
    emergencyName: registration.emergencyName,
    emergencyPhone: registration.emergencyPhone,
    createdAt: registration.createdAt.toISOString(),
  });

  res.status(201).json(registration);
});

// Public: get registration status
router.get("/:id", async (req: Request, res: Response) => {
  const registration = await prisma.registration.findUnique({
    where: { id: req.params.id as string },
    include: { payment: true, distance: true, event: true, teamMembers: { orderBy: { memberIndex: "asc" } } },
  });
  if (!registration) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(registration);
});

// Admin: export registrations as CSV
router.get("/admin/export", requireAuth, async (req: Request, res: Response) => {
  const { eventId, status } = req.query;
  const where: Record<string, unknown> = {};
  if (eventId) where.eventId = eventId;
  if (status) where.status = status;

  const registrations = await prisma.registration.findMany({
    where,
    include: { event: true, distance: true, payment: true, teamMembers: { orderBy: { memberIndex: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const escape = (val: string | null | undefined) => {
    if (val == null) return "";
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const headers = [
    "ID", "Họ tên", "Ngày sinh", "Điện thoại", "Email",
    "Sự kiện", "Cự ly", "Loại", "BIB",
    "Liên hệ khẩn cấp", "SĐT khẩn cấp",
    "Trạng thái", "Số tiền (VNĐ)", "Thời gian thanh toán", "Mã tham chiếu",
    "Đã ký miễn trừ", "Thành viên nhóm",
    "Ngày đăng ký",
  ];

  const rows = registrations.map((r) => {
    const members = r.teamMembers
      .map((m) => `${m.memberIndex}.${m.fullName}(${m.phone})`)
      .join("; ");

    return [
      r.id,
      r.fullName,
      r.dob.toISOString().split("T")[0],
      r.phone,
      r.email,
      r.event.name,
      r.distance.name,
      r.distance.type === "RELAY" ? "Tiếp sức" : "Cá nhân",
      r.bibNumber ?? "",
      r.emergencyName,
      r.emergencyPhone,
      r.status === "PAID" ? "Đã thanh toán" : r.status === "CANCELLED" ? "Đã hủy" : "Chờ thanh toán",
      r.payment?.amount ?? "",
      r.payment?.paidAt ? r.payment.paidAt.toISOString().replace("T", " ").slice(0, 19) : "",
      r.payment?.payosRef ?? "",
      r.disclaimerSignedAt ? "Có" : "Không",
      members,
      r.createdAt.toISOString().replace("T", " ").slice(0, 19),
    ].map(escape).join(",");
  });

  const csv = "﻿" + [headers.join(","), ...rows].join("\r\n");
  const filename = `dang-ky-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

// Admin: list all registrations
router.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const { eventId, status, page = "1", limit = "50" } = req.query;
  const where: Record<string, unknown> = {};
  if (eventId) where.eventId = eventId;
  if (status) where.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      include: { event: true, distance: true, payment: true, teamMembers: { orderBy: { memberIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.registration.count({ where }),
  ]);

  res.json({ registrations, total, page: Number(page), limit: Number(limit) });
});

// Public: sign disclaimer
router.post("/:id/sign-disclaimer", async (req: Request, res: Response) => {
  const { signature } = req.body;
  if (!signature || typeof signature !== "string") {
    res.status(400).json({ error: "signature required" });
    return;
  }

  const registration = await prisma.registration.findUnique({
    where: { id: req.params.id as string },
  });
  if (!registration) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (registration.disclaimerSignedAt) {
    res.status(409).json({ error: "Disclaimer already signed" });
    return;
  }

  const updated = await prisma.registration.update({
    where: { id: req.params.id as string },
    data: {
      disclaimerSignature: signature,
      disclaimerSignedAt: new Date(),
    },
    include: { payment: true, distance: true, event: true, teamMembers: { orderBy: { memberIndex: "asc" } } },
  });
  res.json(updated);
});

// Admin: delete registration
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const registration = await prisma.registration.findUnique({ where: { id } });
  if (!registration) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { registrationId: id } }),
    prisma.registration.delete({ where: { id } }),
  ]);
  res.status(204).send();
});

// Admin: update bib manually
router.patch("/:id/bib", requireAuth, async (req: Request, res: Response) => {
  const { bibNumber } = req.body;
  if (typeof bibNumber !== "number") {
    res.status(400).json({ error: "bibNumber must be a number" });
    return;
  }

  const registration = await prisma.registration.update({
    where: { id: req.params.id as string },
    data: { bibNumber },
    include: { distance: true, event: true },
  });
  res.json(registration);
});

// Admin: send continue email (bulk)
router.post("/admin/send-continue", requireAuth, async (req: Request, res: Response) => {
  const { ids } = req.body as { ids?: string[] };
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids required" });
    return;
  }

  const registrations = await prisma.registration.findMany({
    where: { id: { in: ids } },
    include: { event: true },
  });

  const targets = registrations.filter((r) => r.status === "PAID" && !r.disclaimerSignedAt && r.email);

  await Promise.all(targets.map((r) =>
    sendContinueEmail({ to: r.email, fullName: r.fullName, registrationId: r.id, eventName: r.event.name })
  ));

  res.json({ sent: targets.length });
});

export default router;
