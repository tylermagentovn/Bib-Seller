import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { sendConfirmationEmail } from "../services/email";
import { updateBibInSheet } from "../services/sheets";

const router = Router();

// Get payment info for a registration
router.get("/:registrationId", async (req: Request, res: Response) => {
  const registrationId = req.params.registrationId as string;
  const payment = await prisma.payment.findUnique({
    where: { registrationId },
    include: { registration: { include: { event: true, distance: true } } },
  });
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  // Build QR content based on SePay format
  const description = `BIB${payment.registrationId.slice(-8).toUpperCase()}`;
  const qrData = {
    bankName: process.env.SEPAY_BANK_NAME,
    accountNumber: process.env.SEPAY_BANK_ACCOUNT,
    accountName: process.env.SEPAY_ACCOUNT_NAME,
    amount: payment.amount,
    description,
    qrUrl: `https://qr.sepay.vn/img?bank=${process.env.SEPAY_BANK_NAME}&acc=${process.env.SEPAY_BANK_ACCOUNT}&template=compact&amount=${payment.amount}&des=${description}`,
  };

  res.json({ payment, qrData });
});

// SePay webhook
router.post("/webhook/sepay", async (req: Request, res: Response) => {
  // Verify webhook secret
  const signature = req.headers["x-sepay-signature"] as string;
  if (process.env.SEPAY_WEBHOOK_SECRET && signature) {
    const expected = crypto
      .createHmac("sha256", process.env.SEPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (signature !== expected) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  const { content, transferAmount, referenceCode } = req.body;
  if (!content) {
    res.json({ success: false });
    return;
  }

  // Match payment by description pattern BIBxxxxxxxx
  const match = content.match(/BIB([A-Z0-9]{8})/i);
  if (!match) {
    res.json({ success: false, reason: "No BIB code in content" });
    return;
  }

  const shortId = match[1].toUpperCase();

  // Find pending payment matching this short id
  const payment = await prisma.payment.findFirst({
    where: {
      status: "PENDING",
      registration: {
        id: { endsWith: shortId.toLowerCase() },
      },
    },
    include: { registration: { include: { event: true, distance: true } } },
  });

  if (!payment) {
    res.json({ success: false, reason: "Payment not found or already processed" });
    return;
  }

  // Validate amount
  if (transferAmount < payment.amount) {
    res.json({ success: false, reason: "Insufficient amount" });
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date(), sepayRef: referenceCode },
    }),
    prisma.registration.update({
      where: { id: payment.registrationId },
      data: { status: "PAID" },
    }),
  ]);

  res.json({ success: true });
});

// BIB spin: get a random available BIB number
router.get("/bib/spin/:registrationId", async (req: Request, res: Response) => {
  const registrationId = req.params.registrationId as string;
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { distance: true, payment: true },
  });

  if (!registration || registration.status !== "PAID") {
    res.status(403).json({ error: "Registration not paid" });
    return;
  }

  const { bibStart, bibEnd, id: distanceId } = registration.distance;

  // Get all assigned BIBs in this distance range
  const assigned = await prisma.registration.findMany({
    where: {
      distanceId,
      bibNumber: { gte: bibStart, lte: bibEnd },
      NOT: { id: registration.id },
    },
    select: { bibNumber: true },
  });

  const assignedSet = new Set(assigned.map((r) => r.bibNumber));
  const available: number[] = [];
  for (let i = bibStart; i <= bibEnd; i++) {
    if (!assignedSet.has(i)) available.push(i);
  }

  if (available.length === 0) {
    res.status(409).json({ error: "No BIB numbers available" });
    return;
  }

  const randomBib = available[Math.floor(Math.random() * available.length)];
  res.json({ bibNumber: randomBib, available: available.length });
});

// BIB confirm: lock in the selected BIB
router.post("/bib/confirm/:registrationId", async (req: Request, res: Response) => {
  const registrationId = req.params.registrationId as string;
  const { bibNumber } = req.body;
  if (typeof bibNumber !== "number") {
    res.status(400).json({ error: "bibNumber required" });
    return;
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { distance: true, event: true, payment: true },
  });

  if (!registration || registration.status !== "PAID") {
    res.status(403).json({ error: "Registration not paid" });
    return;
  }

  if (registration.bibNumber !== null) {
    res.status(409).json({ error: "BIB already assigned", bibNumber: registration.bibNumber });
    return;
  }

  const { bibStart, bibEnd, id: distanceId } = registration.distance;
  if (bibNumber < bibStart || bibNumber > bibEnd) {
    res.status(400).json({ error: "BIB out of range" });
    return;
  }

  // Lock with transaction to prevent race condition
  const updated = await prisma.$transaction(async (tx) => {
    const conflict = await tx.registration.findFirst({
      where: {
        distanceId,
        bibNumber,
        NOT: { id: registration.id },
      },
    });
    if (conflict) throw new Error("BIB_TAKEN");

    return tx.registration.update({
      where: { id: registration.id },
      data: { bibNumber },
      include: { distance: true, event: true },
    });
  });

  // Send email + update sheet (fire-and-forget)
  sendConfirmationEmail({
    to: registration.email,
    fullName: registration.fullName,
    eventName: updated.event.name,
    distanceName: updated.distance.name,
    bibNumber,
    registrationId: registration.id,
    eventDate: updated.event.eventDate?.toLocaleDateString("vi-VN") ?? null,
    location: updated.event.location ?? null,
  }).catch(console.error);

  updateBibInSheet(registration.id, bibNumber).catch(console.error);

  res.json(updated);
});

export default router;
