import { Router, Request, Response } from "express";
import { PayOS } from "@payos/node";
import { prisma } from "../lib/prisma";
import { sendConfirmationEmail } from "../services/email";
import { updateBibInSheet } from "../services/sheets";

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID!,
  apiKey: process.env.PAYOS_API_KEY!,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
});

const router = Router();

// Get payment info + create PayOS checkout link if needed
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

  if (payment.status !== "PENDING") {
    res.json({ payment, checkoutUrl: payment.checkoutUrl, qrCode: payment.qrCode });
    return;
  }

  // Return cached data if already created
  if (payment.checkoutUrl && payment.payosOrderCode) {
    res.json({ payment, checkoutUrl: payment.checkoutUrl, qrCode: payment.qrCode });
    return;
  }

  // Create PayOS payment link
  const orderCode = Date.now();
  const description = `BIB${registrationId.slice(-6).toUpperCase()}`;
  const frontendUrl = process.env.FRONTEND_URL ?? "https://songngu.info";

  const payosRes = await payos.paymentRequests.create({
    orderCode,
    amount: payment.amount,
    description,
    returnUrl: `${frontendUrl}/payment/${registrationId}/success?code=00`,
    cancelUrl: `${frontendUrl}/payment/${registrationId}`,
  });

  const qrCode = (payosRes as any).qrCode as string | undefined;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      payosOrderCode: String(orderCode),
      checkoutUrl: payosRes.checkoutUrl,
      qrCode: qrCode ?? null,
    },
  });

  res.json({ payment, checkoutUrl: payosRes.checkoutUrl, qrCode: qrCode ?? null });
});

// PayOS webhook
router.post("/webhook/payos", async (req: Request, res: Response) => {
  try {
    const webhookData = payos.webhooks.verify(req.body);

    if (!webhookData || webhookData.code !== "00") {
      res.json({ success: false, reason: "Not a success event" });
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: {
        payosOrderCode: String(webhookData.orderCode),
        status: "PENDING",
      },
      include: { registration: { include: { event: true, distance: true } } },
    });

    if (!payment) {
      res.json({ success: false, reason: "Payment not found or already processed" });
      return;
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          payosRef: String(webhookData.reference ?? webhookData.orderCode),
        },
      }),
      prisma.registration.update({
        where: { id: payment.registrationId },
        data: { status: "PAID" },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("PayOS webhook error:", err);
    res.status(400).json({ success: false, error: "Invalid webhook data" });
  }
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
