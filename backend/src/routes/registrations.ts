import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { appendRegistrationToSheet } from "../services/sheets";

const router = Router();

const registrationSchema = z.object({
  eventId: z.string().min(1),
  distanceId: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(9),
  email: z.string().email(),
  dob: z.string(),
  emergencyName: z.string().min(1),
  emergencyPhone: z.string().min(9),
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

  const timeoutMinutes = Number(process.env.PAYMENT_TIMEOUT_MINUTES ?? 15);
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

  const registration = await prisma.registration.create({
    data: {
      ...data,
      dob: new Date(data.dob),
      payment: {
        create: {
          amount: distance.price,
          expiresAt,
        },
      },
    },
    include: {
      payment: true,
      distance: true,
      event: true,
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
    include: { payment: true, distance: true, event: true },
  });
  if (!registration) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(registration);
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
      include: { event: true, distance: true, payment: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.registration.count({ where }),
  ]);

  res.json({ registrations, total, page: Number(page), limit: Number(limit) });
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

export default router;
