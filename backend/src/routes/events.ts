import { Router, Request, Response } from "express";
import { z } from "zod";
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
    include: { distances: distanceWithCount },
    orderBy: { eventDate: "asc" },
  });
  res.json(events);
});

// Public: get event by slug
router.get("/:slug", async (req: Request, res: Response) => {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug as string },
    include: { distances: distanceWithCount },
  });
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(event);
});

// Admin: list events (SUPER_ADMIN sees all, EVENT_MANAGER sees only their own)
router.get("/admin/all", requireAuth, async (req: AuthRequest, res: Response) => {
  const where = req.adminRole === "EVENT_MANAGER" ? { createdById: req.adminId } : {};
  const events = await prisma.event.findMany({
    where,
    include: {
      distances: true,
      _count: { select: { registrations: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(events);
});

const distanceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  price: z.number().int().positive(),
  maxSlots: z.number().int().positive(),
  bibStart: z.number().int().positive(),
  bibEnd: z.number().int().positive(),
  type: z.enum(["SOLO", "RELAY"]).default("SOLO"),
  teamSize: z.number().int().min(2).optional().nullable(),
});

const eventSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  rules: z.string().optional(),
  disclaimer: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  location: z.string().optional(),
  eventDate: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).default("DRAFT"),
  distances: z.array(distanceSchema).min(1),
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { distances, ...eventData } = parsed.data;
  const event = await prisma.event.create({
    data: {
      ...eventData,
      eventDate: eventData.eventDate ? new Date(eventData.eventDate) : null,
      imageUrl: eventData.imageUrl || null,
      disclaimer: eventData.disclaimer || null,
      createdById: req.adminId,
      distances: {
        create: distances.map((d) => ({
          name: d.name,
          price: d.price,
          maxSlots: d.maxSlots,
          bibStart: d.bibStart,
          bibEnd: d.bibEnd,
          type: d.type,
          teamSize: d.type === "RELAY" ? (d.teamSize ?? null) : null,
        })),
      },
    },
    include: { distances: true },
  });
  res.status(201).json(event);
});

router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { distances, ...eventData } = parsed.data;
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
        eventDate: eventData.eventDate ? new Date(eventData.eventDate) : null,
        imageUrl: eventData.imageUrl || null,
        disclaimer: eventData.disclaimer || null,
      },
    });

    if (toDelete.length > 0) {
      await tx.distance.deleteMany({ where: { id: { in: toDelete.map((d) => d.id) } } });
    }

    for (const d of distances) {
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
          },
        });
      }
    }

    return tx.event.findUnique({ where: { id: eventId }, include: { distances: true } });
  });

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
