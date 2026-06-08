import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const distanceWithCount = {
  include: { _count: { select: { registrations: { where: { status: "PAID" as const } } } } },
};

// Public: list published events
router.get("/", async (_req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    include: { distances: distanceWithCount, customFieldDefs: { orderBy: { order: "asc" } } },
    orderBy: { eventDate: "asc" },
  });
  res.json(events);
});

// Public: get event by slug
router.get("/:slug", async (req: Request, res: Response) => {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug as string },
    include: { distances: distanceWithCount, customFieldDefs: { orderBy: { order: "asc" } } },
  });
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  if (event.status === "PRIVATE") {
    const providedPassword = req.headers["x-event-password"] as string | undefined;
    if (!providedPassword) {
      res.status(401).json({ error: "PRIVATE_EVENT", message: "Sự kiện này yêu cầu mật khẩu" });
      return;
    }
    if (providedPassword !== event.password) {
      res.status(403).json({ error: "WRONG_PASSWORD", message: "Mật khẩu không đúng" });
      return;
    }
  }

  const { password: _pw, ...safeEvent } = event;
  res.json(safeEvent);
});

// Admin: list events (SUPER_ADMIN sees all, EVENT_MANAGER sees only their own)
router.get("/admin/all", requireAuth, async (req: AuthRequest, res: Response) => {
  const where = req.adminRole === "EVENT_MANAGER" ? { createdById: req.adminId } : {};
  const events = await prisma.event.findMany({
    where,
    include: {
      distances: true,
      customFieldDefs: { orderBy: { order: "asc" } },
      _count: { select: { registrations: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(events);
});

const fieldVisibilitySchema = z.enum(["required", "optional", "hidden"]);

const distanceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  price: z.number().int().min(0),
  maxSlots: z.number().int().positive(),
  bibStart: z.number().int().positive(),
  bibEnd: z.number().int().positive(),
  type: z.enum(["SOLO", "RELAY"]).default("SOLO"),
  teamSize: z.number().int().min(2).optional().nullable(),
  memberFieldConfig: z.record(z.string(), fieldVisibilitySchema).optional().nullable(),
});

const customFieldDefSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "SELECT", "CHECKBOX"]),
  options: z.array(z.string()).optional().nullable(),
  required: z.boolean().default(false),
  includeInEmail: z.boolean().default(false),
  includeInExport: z.boolean().default(false),
  order: z.number().int().default(0),
});

const eventSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  rules: z.string().optional(),
  disclaimer: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
  shirtSizeImageUrl: z.string().optional().or(z.literal("")),
  raceKitImageUrl: z.string().optional().or(z.literal("")),
  raceKitDescription: z.string().optional(),
  location: z.string().optional(),
  eventDate: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "PRIVATE"]).default("DRAFT"),
  password: z.string().optional().nullable(),
  fieldConfig: z.record(z.string(), fieldVisibilitySchema).optional().nullable(),
  allowMultipleRegistrations: z.boolean().default(false),
  distances: z.array(distanceSchema).min(1),
  customFieldDefs: z.array(customFieldDefSchema).optional().default([]),
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { distances, customFieldDefs, ...eventData } = parsed.data;
  const event = await prisma.event.create({
    data: {
      ...eventData,
      password: eventData.status === "PRIVATE" ? (eventData.password || null) : null,
      eventDate: eventData.eventDate ? new Date(eventData.eventDate) : null,
      imageUrl: eventData.imageUrl || null,
      shirtSizeImageUrl: eventData.shirtSizeImageUrl || null,
      raceKitImageUrl: eventData.raceKitImageUrl || null,
      raceKitDescription: eventData.raceKitDescription || null,
      disclaimer: eventData.disclaimer || null,
      fieldConfig: eventData.fieldConfig === null ? Prisma.DbNull : eventData.fieldConfig,
      createdBy: { connect: { id: req.adminId! } },
      distances: {
        create: distances.map((d) => ({
          name: d.name,
          price: d.price,
          maxSlots: d.maxSlots,
          bibStart: d.bibStart,
          bibEnd: d.bibEnd,
          type: d.type,
          teamSize: d.type === "RELAY" ? (d.teamSize ?? null) : null,
          memberFieldConfig: d.type === "RELAY"
            ? (d.memberFieldConfig === null ? Prisma.DbNull : (d.memberFieldConfig ?? undefined))
            : Prisma.DbNull,
        })),
      },
    },
    include: { distances: true, customFieldDefs: { orderBy: { order: "asc" } } },
  });

  if (customFieldDefs.length > 0) {
    await prisma.customFieldDef.createMany({
      data: customFieldDefs.map((f, i) => ({
        eventId: event.id,
        label: f.label,
        type: f.type,
        options: f.options ?? Prisma.DbNull,
        required: f.required,
        includeInEmail: f.includeInEmail,
        includeInExport: f.includeInExport,
        order: f.order ?? i,
      })),
    });
  }

  res.status(201).json(event);
});

router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { distances, customFieldDefs, ...eventData } = parsed.data;
  const eventId = req.params.id as string;

  // EVENT_MANAGER can only edit their own events
  if (req.adminRole === "EVENT_MANAGER") {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { createdById: true } });
    if (!event || event.createdById !== req.adminId) {
      res.status(403).json({ error: "Forbidden: Bạn không có quyền sửa sự kiện này" });
      return;
    }
  }

  // Find distances being removed (existing but not in incoming list)
  const existingDistances = await prisma.distance.findMany({
    where: { eventId },
    include: { _count: { select: { registrations: true } } },
  });
  const incomingIds = new Set(distances.filter((d) => d.id).map((d) => d.id!));
  const toDelete = existingDistances.filter((d) => !incomingIds.has(d.id));

  if (toDelete.some((d) => d._count.registrations > 0)) {
    res.status(409).json({ error: "Không thể xóa cự ly đã có người đăng ký" });
    return;
  }

  const event = await prisma.$transaction(async (tx: TxClient) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        ...eventData,
        password: eventData.status === "PRIVATE" ? (eventData.password || null) : null,
        eventDate: eventData.eventDate ? new Date(eventData.eventDate) : null,
        imageUrl: eventData.imageUrl || null,
        shirtSizeImageUrl: eventData.shirtSizeImageUrl || null,
        raceKitImageUrl: eventData.raceKitImageUrl || null,
        raceKitDescription: eventData.raceKitDescription || null,
        disclaimer: eventData.disclaimer || null,
        fieldConfig: eventData.fieldConfig === null ? Prisma.DbNull : eventData.fieldConfig,
      },
    });

    if (toDelete.length > 0) {
      await tx.distance.deleteMany({ where: { id: { in: toDelete.map((d) => d.id) } } });
    }

    for (const d of distances) {
      const memberFieldConfig = d.type === "RELAY"
        ? (d.memberFieldConfig === null ? Prisma.DbNull : (d.memberFieldConfig ?? undefined))
        : Prisma.DbNull;
      if (d.id) {
        await tx.distance.update({
          where: { id: d.id },
          data: {
            name: d.name,
            price: d.price,
            maxSlots: d.maxSlots,
            bibStart: d.bibStart,
            bibEnd: d.bibEnd,
            type: d.type,
            teamSize: d.type === "RELAY" ? (d.teamSize ?? null) : null,
            memberFieldConfig,
          },
        });
      } else {
        await tx.distance.create({
          data: {
            eventId,
            name: d.name,
            price: d.price,
            maxSlots: d.maxSlots,
            bibStart: d.bibStart,
            bibEnd: d.bibEnd,
            type: d.type,
            teamSize: d.type === "RELAY" ? (d.teamSize ?? null) : null,
            memberFieldConfig,
          },
        });
      }
    }

    return tx.event.findUnique({
      where: { id: eventId },
      include: { distances: true, customFieldDefs: { orderBy: { order: "asc" } } },
    });
  });

  // Upsert custom field defs: delete removed ones, upsert existing/new
  const incomingDefIds = new Set(customFieldDefs.filter((f) => f.id).map((f) => f.id!));
  await prisma.customFieldDef.deleteMany({
    where: { eventId, id: { notIn: [...incomingDefIds] } },
  });
  for (const [i, f] of customFieldDefs.entries()) {
    if (f.id) {
      await prisma.customFieldDef.update({
        where: { id: f.id },
        data: {
          label: f.label,
          type: f.type,
          options: f.options ?? Prisma.DbNull,
          required: f.required,
          includeInEmail: f.includeInEmail,
          includeInExport: f.includeInExport,
          order: f.order ?? i,
        },
      });
    } else {
      await prisma.customFieldDef.create({
        data: {
          eventId,
          label: f.label,
          type: f.type,
          options: f.options ?? Prisma.DbNull,
          required: f.required,
          includeInEmail: f.includeInEmail,
          includeInExport: f.includeInExport,
          order: f.order ?? i,
        },
      });
    }
  }

  res.json(event);
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const eventId = req.params.id as string;

  // EVENT_MANAGER can only delete their own events
  if (req.adminRole === "EVENT_MANAGER") {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { createdById: true } });
    if (!event || event.createdById !== req.adminId) {
      res.status(403).json({ error: "Forbidden: Bạn không có quyền xóa sự kiện này" });
      return;
    }
  }

  await prisma.event.delete({ where: { id: eventId } });
  res.status(204).send();
});

export default router;
