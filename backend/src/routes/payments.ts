import { Router, Request, Response } from "express";
import { PayOS } from "@payos/node";
import { prisma } from "../lib/prisma";
import { sendConfirmationEmail, sendRegistrationSuccessEmail } from "../services/email";
import { updateBibInSheet } from "../services/sheets";

// Global fallback PayOS instance using env vars
const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID!,
  apiKey: process.env.PAYOS_API_KEY!,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
});

function getPayosInstance(admin: { payosClientId: string | null; payosApiKey: string | null; payosChecksumKey: string | null } | null | undefined): PayOS {
  if (admin?.payosClientId && admin?.payosApiKey && admin?.payosChecksumKey) {
    return new PayOS({ clientId: admin.payosClientId, apiKey: admin.payosApiKey, checksumKey: admin.payosChecksumKey });
  }
  return payos;
}

// Parse EMVCo TLV QR string to extract the actual transfer content (tag 62, sub-tag 08)
function parseQrTransferContent(qr: string): string | null {
  try {
    let i = 0;
    while (i + 4 <= qr.length) {
      const tag = qr.slice(i, i + 2);
      const len = parseInt(qr.slice(i + 2, i + 4), 10);
      if (isNaN(len)) break;
      const value = qr.slice(i + 4, i + 4 + len);
      if (tag === "62") {
        let j = 0;
        while (j + 4 <= value.length) {
          const subTag = value.slice(j, j + 2);
          const subLen = parseInt(value.slice(j + 2, j + 4), 10);
          if (isNaN(subLen)) break;
          const subValue = value.slice(j + 4, j + 4 + subLen);
          if (subTag === "08") return subValue;
          j += 4 + subLen;
        }
      }
      i += 4 + len;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

const router = Router();

// Get payment info + create PayOS checkout link if needed
router.get("/:registrationId", async (req: Request, res: Response) => {
  const registrationId = req.params.registrationId as string;
  const payment = await prisma.payment.findUnique({
    where: { registrationId },
    include: {
      registration: {
        include: {
          event: { include: { createdBy: { select: { payosClientId: true, payosApiKey: true, payosChecksumKey: true } } } },
          distance: true,
        },
      },
    },
  });
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  if (payment.status !== "PENDING") {
    res.json({
      payment,
      checkoutUrl: payment.checkoutUrl,
      qrCode: payment.qrCode,
      bankBin: payment.bankBin,
      bankAccountNumber: payment.bankAccountNumber,
      bankAccountName: payment.bankAccountName,
      description: (payment.qrCode ? parseQrTransferContent(payment.qrCode) : null) ?? `BIB${registrationId.slice(-6).toUpperCase()}`,
    });
    return;
  }

  // Return cached data if already created
  if (payment.checkoutUrl && payment.payosOrderCode) {
    res.json({
      payment,
      checkoutUrl: payment.checkoutUrl,
      qrCode: payment.qrCode,
      bankBin: payment.bankBin,
      bankAccountNumber: payment.bankAccountNumber,
      bankAccountName: payment.bankAccountName,
      description: (payment.qrCode ? parseQrTransferContent(payment.qrCode) : null) ?? `BIB${registrationId.slice(-6).toUpperCase()}`,
    });
    return;
  }

  // Create PayOS payment link using event's admin credentials (or fallback)
  const payosInstance = getPayosInstance(payment.registration.event.createdBy);
  const orderCode = Date.now();
  const description = `BIB${registrationId.slice(-6).toUpperCase()}`;
  const frontendUrl = process.env.FRONTEND_URL ?? "https://bib1s.com";

  const payosRes = await payosInstance.paymentRequests.create({
    orderCode,
    amount: payment.amount,
    description,
    returnUrl: `${frontendUrl}/payment/${registrationId}/success?code=00`,
    cancelUrl: `${frontendUrl}/payment/${registrationId}`,
  });

  const r = payosRes as any;
  const qrCode = r.qrCode as string | undefined;
  const bankBin = r.bin as string | undefined;
  const bankAccountNumber = r.accountNumber as string | undefined;
  const bankAccountName = r.accountName as string | undefined;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      payosOrderCode: String(orderCode),
      checkoutUrl: payosRes.checkoutUrl,
      qrCode: qrCode ?? null,
      bankBin: bankBin ?? null,
      bankAccountNumber: bankAccountNumber ?? null,
      bankAccountName: bankAccountName ?? null,
    },
  });

  res.json({
    payment,
    checkoutUrl: payosRes.checkoutUrl,
    qrCode: qrCode ?? null,
    bankBin: bankBin ?? null,
    bankAccountNumber: bankAccountNumber ?? null,
    bankAccountName: bankAccountName ?? null,
    description: (qrCode ? parseQrTransferContent(qrCode) : null) ?? description,
  });
});

async function processPayosWebhook(payosInstance: PayOS, body: any, res: Response) {
  // verify() throws if signature is invalid
  const verified = await payosInstance.webhooks.verify(body) as any;

  const successCode = body?.code === "00" || verified?.code === "00";
  if (!successCode) {
    res.json({ success: false, reason: "Not a success event" });
    return;
  }

  const orderCode = String(verified?.orderCode ?? body?.data?.orderCode);
  const reference = String(verified?.reference ?? verified?.orderCode ?? body?.data?.reference ?? orderCode);

  const payment = await prisma.payment.findFirst({
    where: { payosOrderCode: orderCode, status: "PENDING" },
    include: { registration: { include: { event: true, distance: true, teamMembers: { orderBy: { memberIndex: "asc" } } } } },
  });

  if (!payment) {
    res.json({ success: false, reason: "Payment not found or already processed" });
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date(), payosRef: reference },
    }),
    prisma.registration.update({
      where: { id: payment.registrationId },
      data: { status: "PAID" },
    }),
  ]);

  const reg = payment.registration;
  if (reg.email) {
    const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const needsContinue = (reg.event as any).requireDisclaimer || (reg.event as any).requireBibSpin;
    const continueUrl = needsContinue
      ? `${frontend.replace(/\/$/, "")}/payment/${reg.id}/success?step=waiver`
      : undefined;
    sendRegistrationSuccessEmail({
      to: reg.email,
      fullName: reg.fullName ?? null,
      registrationId: reg.id,
      eventName: reg.event.name,
      distanceName: reg.distance.name,
      eventDate: reg.event.eventDate ? new Date(reg.event.eventDate).toISOString().split("T")[0] : null,
      location: reg.event.location ?? null,
      dob: reg.dob ? reg.dob.toISOString().split("T")[0] : null,
      phone: reg.phone ?? null,
      idNumber: reg.idNumber ?? null,
      shirtSize: reg.shirtSize ?? null,
      bloodType: reg.bloodType ?? null,
      medicalConditions: reg.medicalConditions ?? null,
      emergencyName: reg.emergencyName ?? null,
      emergencyPhone: reg.emergencyPhone ?? null,
      continueUrl,
      teamMembers: reg.teamMembers.length > 0 ? reg.teamMembers : undefined,
    }).catch(console.error);
  }

  res.json({ success: true });
}

// PayOS webhook — GET for URL verification by PayOS dashboard
router.get("/webhook/payos", (_req: Request, res: Response) => {
  res.json({ success: true });
});
router.get("/webhook/payos/:adminId", (_req: Request, res: Response) => {
  res.json({ success: true });
});

// Per-admin webhook: PayOS signs with the admin's checksumKey → must use that admin's credentials.
router.post("/webhook/payos/:adminId", async (req: Request, res: Response) => {
  const adminId = String(req.params.adminId);
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { payosClientId: true, payosApiKey: true, payosChecksumKey: true },
    });
    if (!admin?.payosClientId || !admin?.payosApiKey || !admin?.payosChecksumKey) {
      console.error(`PayOS webhook: admin ${adminId} not found or has no PayOS credentials`);
      res.status(400).json({ success: false, error: "Admin PayOS credentials not configured" });
      return;
    }
    const payosInstance = new PayOS({ clientId: admin.payosClientId, apiKey: admin.payosApiKey, checksumKey: admin.payosChecksumKey });
    await processPayosWebhook(payosInstance, req.body, res);
  } catch (err) {
    console.error(`PayOS webhook error (adminId=${adminId}):`, err);
    res.status(400).json({ success: false, error: "Invalid webhook data" });
  }
});

// Generic webhook (backward compat) — resolves admin via orderCode
router.post("/webhook/payos", async (req: Request, res: Response) => {
  try {
    const rawOrderCode = String(req.body?.data?.orderCode ?? req.body?.orderCode ?? "");
    let payosInstance = payos;
    if (rawOrderCode) {
      const existing = await prisma.payment.findFirst({
        where: { payosOrderCode: rawOrderCode },
        select: {
          registration: {
            select: {
              event: {
                select: { createdBy: { select: { payosClientId: true, payosApiKey: true, payosChecksumKey: true } } },
              },
            },
          },
        },
      });
      const adminCreds = existing?.registration?.event?.createdBy;
      if (adminCreds?.payosClientId && adminCreds?.payosApiKey && adminCreds?.payosChecksumKey) {
        payosInstance = new PayOS({ clientId: adminCreds.payosClientId, apiKey: adminCreds.payosApiKey, checksumKey: adminCreds.payosChecksumKey });
      } else if (!rawOrderCode) {
        console.warn("PayOS generic webhook: no orderCode in body, using global credentials");
      } else if (!existing) {
        console.warn(`PayOS generic webhook: no payment found for orderCode ${rawOrderCode}, using global credentials`);
      }
    }
    await processPayosWebhook(payosInstance, req.body, res);
  } catch (err) {
    console.error("PayOS webhook error:", err);
    res.status(400).json({ success: false, error: "Invalid webhook data" });
  }
});

// Dev-only: instantly confirm payment (skip PayOS webhook)
router.post("/dev-confirm/:registrationId", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Not available in production" });
    return;
  }

  const registrationId = req.params.registrationId as string;
  const payment = await prisma.payment.findUnique({
    where: { registrationId },
    include: { registration: { include: { event: true, distance: true, teamMembers: { orderBy: { memberIndex: "asc" } } } } },
  });

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  if (payment.status === "PAID") {
    res.json({ already: true });
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date(), payosRef: "dev-bypass" },
    }),
    prisma.registration.update({
      where: { id: registrationId },
      data: { status: "PAID" },
    }),
  ]);

  const reg = payment.registration;
  if (reg.email) {
    const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const needsContinue = (reg.event as any).requireDisclaimer || (reg.event as any).requireBibSpin;
    const continueUrl = needsContinue
      ? `${frontend.replace(/\/$/, "")}/payment/${reg.id}/success?step=waiver`
      : undefined;
    sendRegistrationSuccessEmail({
      to: reg.email,
      fullName: reg.fullName ?? null,
      registrationId: reg.id,
      eventName: reg.event.name,
      distanceName: reg.distance.name,
      eventDate: reg.event.eventDate ? new Date(reg.event.eventDate).toISOString().split("T")[0] : null,
      location: reg.event.location ?? null,
      dob: reg.dob ? reg.dob.toISOString().split("T")[0] : null,
      phone: reg.phone ?? null,
      idNumber: reg.idNumber ?? null,
      shirtSize: reg.shirtSize ?? null,
      bloodType: reg.bloodType ?? null,
      medicalConditions: reg.medicalConditions ?? null,
      emergencyName: reg.emergencyName ?? null,
      emergencyPhone: reg.emergencyPhone ?? null,
      continueUrl,
      teamMembers: reg.teamMembers.length > 0 ? reg.teamMembers : undefined,
    }).catch(console.error);
  }

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

  const assigned = await prisma.registration.findMany({
    where: {
      distanceId,
      bibNumber: { gte: bibStart, lte: bibEnd },
      NOT: { id: registration.id },
    },
    select: { bibNumber: true },
  });

  const assignedSet = new Set(assigned.map((r: { bibNumber: number | null }) => r.bibNumber));
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
    include: { distance: true, event: true, payment: true, teamMembers: { orderBy: { memberIndex: "asc" } } },
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

  const updated = await prisma.$transaction(async (tx: any) => {
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

  if (registration.email) {
    sendConfirmationEmail({
      to: registration.email,
      fullName: registration.fullName ?? null,
      eventName: updated.event.name,
      distanceName: updated.distance.name,
      bibNumber,
      registrationId: registration.id,
      eventDate: updated.event.eventDate?.toLocaleDateString("vi-VN") ?? null,
      location: updated.event.location ?? null,
      phone: registration.phone ?? null,
      dob: registration.dob?.toLocaleDateString("vi-VN") ?? null,
      idNumber: registration.idNumber ?? null,
      shirtSize: registration.shirtSize ?? null,
      bloodType: registration.bloodType ?? null,
      medicalConditions: registration.medicalConditions ?? null,
      emergencyName: registration.emergencyName ?? null,
      emergencyPhone: registration.emergencyPhone ?? null,
      teamMembers: registration.teamMembers.length > 0 ? registration.teamMembers : undefined,
    }).catch(console.error);
  }

  updateBibInSheet(registration.id, bibNumber).catch(console.error);

  res.json(updated);
});

export default router;
