import { Router, Request, Response } from "express";
import crypto from "crypto";
import { PayOS } from "@payos/node";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendBibConfirmationEmail, sendPaidRegistrationEmail } from "../services/registrationEmails";
import { updateBibInSheet } from "../services/sheets";
import { buildVietQr } from "../services/vietqr";

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

// No 0/O/1/I/L so the code stays unambiguous if a payer types it by hand.
const TRANSFER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateTransferCode(): string {
  let code = "BIB";
  for (let i = 0; i < 8; i++) code += TRANSFER_CODE_ALPHABET[crypto.randomInt(TRANSFER_CODE_ALPHABET.length)];
  return code;
}

// Banks may strip spaces or glue extra text onto the transfer content, so collect every overlapping candidate.
function extractTransferCodes(text: string): string[] {
  return [...text.toUpperCase().matchAll(/(?=(BIB[A-Z0-9]{8}))/g)].map((m) => m[1]);
}

function hasValidSepayApiKey(header: string | undefined, key: string): boolean {
  const expected = Buffer.from(`Apikey ${key}`);
  const received = Buffer.from(header ?? "");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

type PaidRegistration = Prisma.RegistrationGetPayload<{
  include: { event: true; distance: true; teamMembers: true };
}>;

function notifyRegistrationPaid(reg: PaidRegistration) {
  if (!reg.email) return;
  sendPaidRegistrationEmail({ ...reg, email: reg.email }).catch(console.error);
}

const router = Router();

// Get payment info + create the organizer's QR (SePay) or PayOS checkout link if needed
router.get("/:registrationId", async (req: Request, res: Response) => {
  const registrationId = req.params.registrationId as string;
  const payment = await prisma.payment.findUnique({
    where: { registrationId },
    include: {
      registration: {
        include: {
          event: {
            include: {
              createdBy: {
                select: {
                  payosClientId: true,
                  payosApiKey: true,
                  payosChecksumKey: true,
                  paymentProvider: true,
                  sepayBankBin: true,
                  sepayAccountNumber: true,
                  sepayAccountName: true,
                },
              },
            },
          },
          distance: true,
        },
      },
    },
  });
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  // Public endpoint: never serialize the registration relation (it carries the organizer's payment keys).
  const { registration, ...publicPayment } = payment;

  if (
    payment.status !== "PENDING" ||
    (payment.provider === "SEPAY" && payment.qrCode) ||
    (payment.checkoutUrl && payment.payosOrderCode)
  ) {
    res.json({
      payment: publicPayment,
      checkoutUrl: payment.checkoutUrl,
      qrCode: payment.qrCode,
      bankBin: payment.bankBin,
      bankAccountNumber: payment.bankAccountNumber,
      bankAccountName: payment.bankAccountName,
      description: (payment.qrCode ? parseQrTransferContent(payment.qrCode) : null) ?? `BIB${registrationId.slice(-6).toUpperCase()}`,
    });
    return;
  }

  const owner = registration.event.createdBy;
  if (owner?.paymentProvider === "SEPAY" && owner.sepayBankBin && owner.sepayAccountNumber) {
    const transferCode = generateTransferCode();
    // Conditional write: a concurrent request must not replace a QR the payer may already be scanning.
    await prisma.payment.updateMany({
      where: { id: payment.id, qrCode: null },
      data: {
        provider: "SEPAY",
        transferCode,
        qrCode: buildVietQr({
          bin: owner.sepayBankBin,
          accountNumber: owner.sepayAccountNumber,
          amount: payment.amount,
          description: transferCode,
        }),
        bankBin: owner.sepayBankBin,
        bankAccountNumber: owner.sepayAccountNumber,
        bankAccountName: owner.sepayAccountName,
      },
    });
    const saved = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    res.json({
      payment: saved,
      checkoutUrl: null,
      qrCode: saved.qrCode,
      bankBin: saved.bankBin,
      bankAccountNumber: saved.bankAccountNumber,
      bankAccountName: saved.bankAccountName,
      description: saved.transferCode ?? transferCode,
    });
    return;
  }

  // Create PayOS payment link using event's admin credentials (or fallback)
  const payosInstance = getPayosInstance(owner);
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
      provider: "PAYOS",
      payosOrderCode: String(orderCode),
      checkoutUrl: payosRes.checkoutUrl,
      qrCode: qrCode ?? null,
      bankBin: bankBin ?? null,
      bankAccountNumber: bankAccountNumber ?? null,
      bankAccountName: bankAccountName ?? null,
    },
  });

  res.json({
    payment: publicPayment,
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

  notifyRegistrationPaid(payment.registration);

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

  notifyRegistrationPaid(payment.registration);

  res.json({ success: true });
});

// SePay bank-transfer webhook, one URL per organizer (each has its own API key and bank account).
router.post("/webhook/sepay/:adminId", async (req: Request, res: Response) => {
  const adminId = String(req.params.adminId);
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { sepayWebhookKey: true, sepayAccountNumber: true },
  });
  if (!admin?.sepayWebhookKey || !hasValidSepayApiKey(req.headers.authorization, admin.sepayWebhookKey)) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  // Unmatched or ignored transactions are still acknowledged: SePay retrying them cannot change the outcome.
  const tx = req.body ?? {};
  const txId = String(tx.id ?? "");
  const amount = Number(tx.transferAmount);
  if (tx.transferType !== "in" || !txId || !Number.isFinite(amount)) {
    res.json({ success: true });
    return;
  }

  // Only money that reached this organizer's own account can confirm their registrations.
  const receivingAccounts = [tx.accountNumber, tx.subAccount].filter(Boolean).map(String);
  if (!admin.sepayAccountNumber || !receivingAccounts.includes(admin.sepayAccountNumber)) {
    console.warn(`SePay webhook (admin ${adminId}): tx ${txId} went to another account, ignored`);
    res.json({ success: true });
    return;
  }

  const codes = extractTransferCodes(`${tx.code ?? ""} ${tx.content ?? ""}`);
  const payment = codes.length === 0 ? null : await prisma.payment.findFirst({
    where: { transferCode: { in: codes }, provider: "SEPAY", registration: { event: { createdById: adminId } } },
    include: { registration: { include: { event: true, distance: true, teamMembers: { orderBy: { memberIndex: "asc" } } } } },
  });
  if (!payment) {
    console.warn(`SePay webhook (admin ${adminId}): tx ${txId} matched no payment, content="${tx.content}" amount=${amount}`);
    res.json({ success: true });
    return;
  }
  if (payment.status === "PAID") {
    res.json({ success: true });
    return;
  }
  if (amount < payment.amount) {
    console.warn(`SePay webhook: tx ${txId} underpaid registration ${payment.registrationId} (${amount} < ${payment.amount})`);
    res.json({ success: true });
    return;
  }

  // A transfer can land after the expiry cron cancelled the registration; the money arrived, so accept it.
  const wasExpired = payment.status === "EXPIRED";
  const transitioned = await prisma.$transaction(async (db) => {
    const { count } = await db.payment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date(), sepayTransactionId: txId },
    });
    if (count === 0) return false;
    await db.registration.update({ where: { id: payment.registrationId }, data: { status: "PAID" } });
    return true;
  });

  if (transitioned) {
    if (wasExpired) console.warn(`SePay webhook: late payment accepted for registration ${payment.registrationId}`);
    notifyRegistrationPaid(payment.registration);
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
    sendBibConfirmationEmail({ ...registration, email: registration.email, bibNumber }).catch(console.error);
  }

  updateBibInSheet(registration.id, bibNumber).catch(console.error);

  res.json(updated);
});

export default router;
