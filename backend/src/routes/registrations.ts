import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { optionalUserAuth, UserRequest } from "../middleware/userAuth";
import { appendRegistrationToSheet } from "../services/sheets";
import { sendRegistrationSuccessEmail } from "../services/email";

const router = Router();

const teamMemberSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional().default(""),
  gender: z.string().nullable().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string().nullable().optional(),
  idNumber: z.string().nullable().optional(),
  shirtSize: z.string().nullable().optional(),
  bloodType: z.string().nullable().optional(),
  medicalConditions: z.string().nullable().optional(),
  emergencyName: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
});

const registrationSchema = z.object({
  eventId: z.string().min(1),
  distanceId: z.string().min(1),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string().optional(),
  idNumber: z.string().optional(),
  shirtSize: z.string().optional(),
  bloodType: z.string().optional(),
  medicalConditions: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  teamMembers: z.array(teamMemberSchema).optional(),
  customFieldValues: z.array(z.object({
    fieldDefId: z.string(),
    value: z.string(),
  })).optional().default([]),
});

// Returns the eventId filter for EVENT_MANAGER (only their own events)
async function getEventManagerEventIds(adminId: string): Promise<string[]> {
  const events = await prisma.event.findMany({
    where: { createdById: adminId },
    select: { id: true },
  });
  return events.map((e) => e.id);
}

// Public: create registration (attach userId if logged in)
router.post("/", optionalUserAuth, async (req: UserRequest, res: Response) => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  // Validate event + distance exist
  const distance = await prisma.distance.findFirst({
    where: { id: data.distanceId, eventId: data.eventId },
    include: { event: { select: { allowMultipleRegistrations: true } } },
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

  // Check duplicate registration per event (logged-in users only, if event disallows multiple)
  if (req.userId && !distance.event.allowMultipleRegistrations) {
    const existing = await prisma.registration.findFirst({
      where: { userId: req.userId, eventId: data.eventId, status: { not: "CANCELLED" } },
    });
    if (existing) {
      res.status(409).json({ error: "ALREADY_REGISTERED" });
      return;
    }
  }

  // Validate team members for RELAY distances
  if (distance.type === "RELAY") {
    if (!data.teamMembers || data.teamMembers.length === 0) {
      res.status(400).json({ error: "Cu ly tiep suc yeu cau it nhat 1 thanh vien" });
      return;
    }
    if (distance.teamSize !== null && data.teamMembers.length !== distance.teamSize) {
      res.status(400).json({ error: `Cu ly tiep suc yeu cau dung ${distance.teamSize} thanh vien` });
      return;
    }
    if (data.teamMembers.length > 6) {
      res.status(400).json({ error: "Cu ly tiep suc tuy chon toi da 6 thanh vien" });
      return;
    }
  }

  const isFree = distance.price === 0;
  const timeoutMinutes = Number(process.env.PAYMENT_TIMEOUT_MINUTES ?? 15);
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

  const { teamMembers, customFieldValues, ...registrationData } = data;

  const registration = await prisma.registration.create({
    data: {
      eventId: registrationData.eventId,
      distanceId: registrationData.distanceId,
      fullName: registrationData.fullName ?? null,
      phone: registrationData.phone ?? null,
      gender: registrationData.gender || null,
      email: registrationData.email || null,
      dob: registrationData.dob ? new Date(registrationData.dob) : null,
      idNumber: registrationData.idNumber ?? null,
      shirtSize: registrationData.shirtSize ?? null,
      bloodType: registrationData.bloodType ?? null,
      medicalConditions: registrationData.medicalConditions ?? null,
      emergencyName: registrationData.emergencyName ?? null,
      emergencyPhone: registrationData.emergencyPhone ?? null,
      userId: req.userId ?? null,
      status: isFree ? "PAID" : "PENDING",
      payment: isFree ? undefined : {
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
                gender: m.gender || null,
                email: m.email || null,
                dob: m.dob ? new Date(m.dob) : null,
                idNumber: m.idNumber ?? null,
                shirtSize: m.shirtSize ?? null,
                bloodType: m.bloodType ?? null,
                medicalConditions: m.medicalConditions ?? null,
                emergencyName: m.emergencyName ?? null,
                emergencyPhone: m.emergencyPhone ?? null,
              })),
            },
          }
        : {}),
    },
    include: {
      payment: true,
      distance: true,
      event: { include: { customFieldDefs: { orderBy: { order: "asc" } } } },
      teamMembers: true,
      customFieldValues: { include: { fieldDef: true } },
    },
  });

  // Save custom field values
  if (customFieldValues.length > 0) {
    await prisma.customFieldValue.createMany({
      data: customFieldValues.map((v) => ({
        registrationId: registration.id,
        fieldDefId: v.fieldDefId,
        value: v.value,
      })),
      skipDuplicates: true,
    });
  }

  // Send success email for free registrations (fire-and-forget)
  if (isFree && registration.email) {
    const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const continueUrl = `${frontend.replace(/\/$/, "")}/payment/${registration.id}/success?step=waiver`;
    // Use customFieldValues from request body (DB record created after this point)
    const emailCustomFields = (registration.event as any).customFieldDefs
      ?.filter((d: any) => d.includeInEmail)
      .map((d: any) => {
        const cv = customFieldValues.find((v) => v.fieldDefId === d.id);
        const raw = cv?.value ?? "";
        let display = raw;
        try { const arr = JSON.parse(raw); if (Array.isArray(arr)) display = arr.join(", "); } catch {}
        return { label: d.label, value: display };
      })
      .filter((f: any) => f.value !== "") ?? [];
    sendRegistrationSuccessEmail({
      to: registration.email,
      fullName: registration.fullName ?? null,
      registrationId: registration.id,
      eventName: registration.event.name,
      distanceName: registration.distance.name,
      eventDate: (registration.event as any).eventDate
        ? new Date((registration.event as any).eventDate).toISOString().split("T")[0]
        : null,
      location: (registration.event as any).location ?? null,
      dob: registration.dob ? registration.dob.toISOString().split("T")[0] : null,
      phone: registration.phone ?? null,
      idNumber: registration.idNumber ?? null,
      shirtSize: registration.shirtSize ?? null,
      bloodType: registration.bloodType ?? null,
      medicalConditions: registration.medicalConditions ?? null,
      emergencyName: registration.emergencyName ?? null,
      emergencyPhone: registration.emergencyPhone ?? null,
      continueUrl,
      teamMembers: registration.teamMembers.length > 0 ? registration.teamMembers : undefined,
      customFields: emailCustomFields.length > 0 ? emailCustomFields : undefined,
    }).catch(console.error);
  }

  // Sync to Google Sheet (fire-and-forget)
  appendRegistrationToSheet({
    registrationId: registration.id,
    fullName: registration.fullName ?? "",
    phone: registration.phone ?? "",
    email: registration.email ?? "",
    dob: registration.dob ? registration.dob.toISOString().split("T")[0] : "",
    eventName: registration.event.name,
    distanceName: registration.distance.name,
    bibNumber: null,
    status: registration.status,
    emergencyName: registration.emergencyName ?? "",
    emergencyPhone: registration.emergencyPhone ?? "",
    createdAt: registration.createdAt.toISOString(),
  });

  res.status(201).json(registration);
});

// Public: get registration status
router.get("/:id", async (req: Request, res: Response) => {
  const registration = await prisma.registration.findUnique({
    where: { id: req.params.id as string },
    include: {
      payment: true,
      distance: true,
      event: { include: { customFieldDefs: { orderBy: { order: "asc" } } } },
      teamMembers: { orderBy: { memberIndex: "asc" } },
      customFieldValues: { include: { fieldDef: true } },
    },
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
    include: {
      event: { include: { customFieldDefs: { orderBy: { order: "asc" } } } },
      distance: true,
      payment: true,
      teamMembers: { orderBy: { memberIndex: "asc" } },
      customFieldValues: { include: { fieldDef: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const escape = (val: string | number | null | undefined) => {
    if (val == null) return "";
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  // Collect custom field defs across all events in this export (preserving order)
  const seenDefIds = new Set<string>();
  const exportDefs: { id: string; label: string }[] = [];
  for (const r of registrations) {
    for (const def of (r.event as any).customFieldDefs ?? []) {
      if (def.includeInExport && !seenDefIds.has(def.id)) {
        seenDefIds.add(def.id);
        exportDefs.push({ id: def.id, label: def.label });
      }
    }
  }

  const headers = [
    "ID", "Ho ten", "Gioi tinh", "Ngay sinh", "Dien thoai", "Email",
    "So CCCD", "Size ao", "Nhom mau", "Benh ly",
    "Lien he khan cap", "SDT khan cap",
    "Su kien", "Cu ly", "Loai", "BIB",
    "Trang thai", "So tien (VND)", "Thoi gian thanh toan", "Ma tham chieu",
    "Da ky mien tru", "Thanh vien nhom",
    "Ngay dang ky",
    ...exportDefs.map((d) => d.label),
  ];

  const rows = registrations.map((r) => {
    const members = r.teamMembers
      .map((m) => {
        const parts = [
          `${m.memberIndex}.${m.fullName}`,
          m.phone,
          m.gender ?? "",
          m.dob ? m.dob.toISOString().split("T")[0] : "",
          m.idNumber ?? "",
          m.shirtSize ?? "",
          m.bloodType ?? "",
          m.emergencyName ? `KC:${m.emergencyName}(${m.emergencyPhone ?? ""})` : "",
        ].filter(Boolean);
        return parts.join("|");
      })
      .join("; ");

    const customCols = exportDefs.map((def) => {
      const cv = (r.customFieldValues as any[]).find((v) => v.fieldDefId === def.id);
      const raw = cv?.value ?? "";
      try { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr.join(", "); } catch {}
      return raw;
    });

    return [
      r.id,
      r.fullName ?? "",
      r.gender ?? "",
      r.dob ? r.dob.toISOString().split("T")[0] : "",
      r.phone ?? "",
      r.email ?? "",
      r.idNumber ?? "",
      r.shirtSize ?? "",
      r.bloodType ?? "",
      r.medicalConditions ?? "",
      r.emergencyName ?? "",
      r.emergencyPhone ?? "",
      r.event.name,
      r.distance.name,
      r.distance.type === "RELAY" ? "Tiep suc" : "Ca nhan",
      r.bibNumber ?? "",
      r.status === "PAID" ? "Da thanh toan" : r.status === "CANCELLED" ? "Da huy" : "Cho thanh toan",
      r.payment?.amount ?? "",
      r.payment?.paidAt ? r.payment.paidAt.toISOString().replace("T", " ").slice(0, 19) : "",
      r.payment?.payosRef ?? "",
      r.disclaimerSignedAt ? "Co" : "Khong",
      members,
      r.createdAt.toISOString().replace("T", " ").slice(0, 19),
      ...customCols,
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
  const { eventId, status, page = "1", limit = "50", from, search } = req.query;
  const where: Record<string, unknown> = {};
  if (eventId) {
    where.eventId = eventId;
  } else if (req.adminRole === "EVENT_MANAGER") {
    const ids = await getEventManagerEventIds(req.adminId!);
    where.eventId = { in: ids };
  }
  if (status) where.status = status;
  if (from) where.createdAt = { gte: new Date(from as string) };
  if (search) {
    const q = (search as string).trim();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [registrations, total, paidCount, pendingCount] = await Promise.all([
    prisma.registration.findMany({
      where,
      include: {
        event: { include: { customFieldDefs: { orderBy: { order: "asc" } } } },
        distance: true,
        payment: true,
        teamMembers: { orderBy: { memberIndex: "asc" } },
        customFieldValues: { include: { fieldDef: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.registration.count({ where }),
    prisma.registration.count({ where: { ...where, status: "PAID" } }),
    prisma.registration.count({ where: { ...where, status: "PENDING" } }),
  ]);

  res.json({ registrations, total, page: Number(page), limit: Number(limit), paidCount, pendingCount });
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
    fullName: z.string().optional(),
    phone: z.string().optional(),
    gender: z.string().nullable().optional(),
    email: z.string().email().optional().or(z.literal("")),
    dob: z.string().optional(),
    idNumber: z.string().nullable().optional(),
    shirtSize: z.string().nullable().optional(),
    bloodType: z.string().nullable().optional(),
    medicalConditions: z.string().nullable().optional(),
    emergencyName: z.string().optional(),
    emergencyPhone: z.string().optional(),
    teamMembers: z.array(teamMemberSchema).optional(),
    customFieldValues: z.array(z.object({
      fieldDefId: z.string(),
      value: z.string(),
    })).optional(),
  });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const id = req.params.id as string;
  const { teamMembers, customFieldValues: cfvUpdates, ...data } = parsed.data;

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
      data: { ...data, dob: data.dob ? new Date(data.dob) : undefined },
    });

    if (registration.distance.type === "RELAY" && teamMembers) {
      await tx.teamMember.deleteMany({ where: { registrationId: id } });
      await tx.teamMember.createMany({
        data: teamMembers.map((m, i) => ({
          registrationId: id,
          memberIndex: i + 1,
          fullName: m.fullName,
          phone: m.phone,
          gender: m.gender || null,
          email: m.email || null,
          dob: m.dob ? new Date(m.dob) : null,
          idNumber: m.idNumber ?? null,
          shirtSize: m.shirtSize ?? null,
          bloodType: m.bloodType ?? null,
          medicalConditions: m.medicalConditions ?? null,
          emergencyName: m.emergencyName ?? null,
          emergencyPhone: m.emergencyPhone ?? null,
        })),
      });
    }

    return tx.registration.findUnique({
      where: { id },
      include: {
        payment: true,
        distance: true,
        event: { include: { customFieldDefs: { orderBy: { order: "asc" } } } },
        teamMembers: { orderBy: { memberIndex: "asc" } },
        customFieldValues: { include: { fieldDef: true } },
      },
    });
  });

  // Upsert custom field values if provided
  if (cfvUpdates && cfvUpdates.length > 0) {
    for (const cv of cfvUpdates) {
      await prisma.customFieldValue.upsert({
        where: { registrationId_fieldDefId: { registrationId: id, fieldDefId: cv.fieldDefId } },
        create: { registrationId: id, fieldDefId: cv.fieldDefId, value: cv.value },
        update: { value: cv.value },
      });
    }
    // Re-fetch so response includes updated custom field values
    const refreshed = await prisma.registration.findUnique({
      where: { id },
      include: {
        payment: true,
        distance: true,
        event: { include: { customFieldDefs: { orderBy: { order: "asc" } } } },
        teamMembers: { orderBy: { memberIndex: "asc" } },
        customFieldValues: { include: { fieldDef: true } },
      },
    });
    res.json(refreshed);
    return;
  }

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

export default router;
