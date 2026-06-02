import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
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

// Returns the eventId filter for EVENT_MANAGER (only their own events)
async function getEventManagerEventIds(adminId: string): Promise<string[]> {
  const events = await prisma.event.findMany({
    where: { createdById: adminId },
    select: { id: true },
  });
  return events.map((e) => e.id);
}

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
      res.status(400).json({ error: `Cu ly tiep suc yeu cau dung ${required} thanh vien` });
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
router.get("/admin/export", requireAuth, async (req: AuthRequest, res: Response) => {
  const { eventId, status } = req.query;
  const where: Record<string, unknown> = {};
  if (eventId) {
    where.eventId = eventId;
  } else if (req.adminRole === "EVENT_MANAGER") {
    const ids = await getEventManagerEventIds(req.adminId!);
    where.eventId = { in: ids };
  }
  if (status) where.status = status;

  const registrations = await prisma.registration.findMany({
    where,
    include: { event: true, distance: true, payment: true, teamMembers: { orderBy: { memberIndex: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const escape = (val: string | number | null | undefined) => {
    if (val == null) return "";
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const headers = [
    "ID", "Ho ten", "Ngay sinh", "Dien thoai", "Email",
    "Su kien", "Cu ly", "Loai", "BIB",
    "Lien he khan cap", "SDT khan cap",
    "Trang thai", "So tien (VND)", "Thoi gian thanh toan", "Ma tham chieu",
    "Da ky mien tru", "Thanh vien nhom",
    "Ngay dang ky",
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
      r.distance.type === "RELAY" ? "Tiep suc" : "Ca nhan",
      r.bibNumber ?? "",
      r.emergencyName,
      r.emergencyPhone,
      r.status === "PAID" ? "Da thanh toan" : r.status === "CANCELLED" ? "Da huy" : "Cho thanh toan",
      r.payment?.amount ?? "",
      r.payment?.paidAt ? r.payment.paidAt.toISOString().replace("T", " ").slice(0, 19) : "",
      r.payment?.payosRef ?? "",
      r.disclaimerSignedAt ? "Co" : "Khong",
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
router.get("/admin/all", requireAuth, async (req: AuthRequest, res: Response) => {
  const { eventId, status, page = "1", limit = "50" } = req.query;
  const where: Record<string, unknown> = {};
  if (eventId) {
    where.eventId = eventId;
  } else if (req.adminRole === "EVENT_MANAGER") {
    const ids = await getEventManagerEventIds(req.adminId!);
    where.eventId = { in: ids };
  }
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

// Admin: update registration info
router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const updateSchema = z.object({
    fullName: z.string().min(1),
    phone: z.string().min(9),
    email: z.string().email(),
    dob: z.string(),
    emergencyName: z.string().min(1),
    emergencyPhone: z.string().min(9),
    teamMembers: z
      .array(
        z.object({
          fullName: z.string().min(1),
          phone: z.string().min(9),
          email: z.string().email().optional().or(z.literal("")),
          dob: z.string(),
        })
      )
      .optional(),
  });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const id = req.params.id as string;
  const { teamMembers, ...data } = parsed.data;

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { distance: true, event: { select: { createdById: true } } },
  });
  if (!registration) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // EVENT_MANAGER can only edit registrations for their own events
  if (req.adminRole === "EVENT_MANAGER" && registration.event.createdById !== req.adminId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.registration.update({
      where: { id },
      data: { ...data, dob: new Date(data.dob) },
    });

    if (registration.distance.type === "RELAY" && teamMembers) {
      await tx.teamMember.deleteMany({ where: { registrationId: id } });
      await tx.teamMember.createMany({
        data: teamMembers.map((m, i) => ({
          registrationId: id,
          memberIndex: i + 1,
          fullName: m.fullName,
          phone: m.phone,
          email: m.email || null,
          dob: new Date(m.dob),
        })),
      });
    }

    return tx.registration.findUnique({
      where: { id },
      include: {
        payment: true,
        distance: true,
        event: true,
        teamMembers: { orderBy: { memberIndex: "asc" } },
      },
    });
  });

  res.json(updated);
});

// Admin: delete registration
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { event: { select: { createdById: true } } },
  });
  if (!registration) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // EVENT_MANAGER can only delete registrations for their own events
  if (req.adminRole === "EVENT_MANAGER" && registration.event.createdById !== req.adminId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { registrationId: id } }),
    prisma.registration.delete({ where: { id } }),
  ]);
  res.status(204).send();
});

// Admin: update bib manually
router.patch("/:id/bib", requireAuth, async (req: AuthRequest, res: Response) => {
  const { bibNumber } = req.body;
  if (typeof bibNumber !== "number") {
    res.status(400).json({ error: "bibNumber must be a number" });
    return;
  }

  const existing = await prisma.registration.findUnique({
    where: { id: req.params.id as string },
    include: { event: { select: { createdById: true } } },
  });
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (req.adminRole === "EVENT_MANAGER" && existing.event.createdById !== req.adminId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const registration = await prisma.registration.update({
    where: { id: req.params.id as string },
    data: { bibNumber },
    include: { distance: true, event: true },
  });
  res.json(registration);
});

// Admin: update registration status manually
router.patch("/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!["PENDING", "PAID", "CANCELLED"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const registration = await prisma.registration.findUnique({
    where: { id: req.params.id as string },
    include: { payment: true, event: { select: { createdById: true } } },
  });
  if (!registration) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (req.adminRole === "EVENT_MANAGER" && registration.event.createdById !== req.adminId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (status === "PAID" && registration.payment) {
    await prisma.payment.update({
      where: { registrationId: registration.id },
      data: { status: "PAID", paidAt: registration.payment.paidAt ?? new Date() },
    });
  } else if (status === "CANCELLED" && registration.payment && registration.payment.status !== "PAID") {
    await prisma.payment.update({
      where: { registrationId: registration.id },
      data: { status: "EXPIRED" },
    });
  } else if (status === "PENDING" && registration.payment) {
    await prisma.payment.update({
      where: { registrationId: registration.id },
      data: { status: "PENDING", paidAt: null },
    });
  }

  const updated = await prisma.registration.update({
    where: { id: req.params.id as string },
    data: { status },
    include: { payment: true, distance: true, event: true, teamMembers: { orderBy: { memberIndex: "asc" } } },
  });
  res.json(updated);
});

// Admin: send continue email (bulk)
router.post("/admin/send-continue", requireAuth, async (req: AuthRequest, res: Response) => {
  const { ids } = req.body as { ids?: string[] };
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids required" });
    return;
  }

  const registrations = await prisma.registration.findMany({
    where: { id: { in: ids } },
    include: { event: { select: { name: true, createdById: true } } },
  });

  // EVENT_MANAGER can only send emails for their own events
  const allowed = req.adminRole === "SUPER_ADMIN"
    ? registrations
    : registrations.filter((r) => r.event.createdById === req.adminId);

  const targets = allowed.filter((r) => r.status === "PAID" && !r.disclaimerSignedAt && r.email);

  await Promise.all(targets.map((r) =>
    sendContinueEmail({ to: r.email, fullName: r.fullName, registrationId: r.id, eventName: r.event.name })
  ));

  res.json({ sent: targets.length });
});

export default router;
