import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Public: list published events
router.get("/", async (_req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    include: { distances: true },
    orderBy: { eventDate: "asc" },
  });
  res.json(events);
});

// Public: get event by slug
router.get("/:slug", async (req: Request, res: Response) => {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug as string },
    include: { distances: true },
  });
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(event);
});

// Admin: list all events
router.get("/admin/all", requireAuth, async (_req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    include: {
      distances: true,
      _count: { select: { registrations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(events);
});

const distanceSchema = z.object({
  name: z.string().min(1),
  price: z.number().int().positive(),
  maxSlots: z.number().int().positive(),
  bibStart: z.number().int().positive(),
  bibEnd: z.number().int().positive(),
});

const eventSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  rules: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  location: z.string().optional(),
  eventDate: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).default("DRAFT"),
  distances: z.array(distanceSchema).min(1),
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
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
      distances: { create: distances },
    },
    include: { distances: true },
  });
  res.status(201).json(event);
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { distances, ...eventData } = parsed.data;
  const event = await prisma.event.update({
    where: { id: req.params.id as string },
    data: {
      ...eventData,
      eventDate: eventData.eventDate ? new Date(eventData.eventDate) : null,
      imageUrl: eventData.imageUrl || null,
      distances: {
        deleteMany: {},
        create: distances,
      },
    },
    include: { distances: true },
  });
  res.json(event);
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  await prisma.event.delete({ where: { id: req.params.id as string } });
  res.status(204).send();
});

export default router;
