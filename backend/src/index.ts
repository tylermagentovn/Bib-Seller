import "dotenv/config";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import eventsRouter from "./routes/events";
import registrationsRouter from "./routes/registrations";
import paymentsRouter from "./routes/payments";
import { prisma } from "./lib/prisma";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "*" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/registrations", registrationsRouter);
app.use("/api/payments", paymentsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message === "BIB_TAKEN") {
    res.status(409).json({ error: "BIB number already taken, please spin again" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Payment expiry cron: runs every minute
setInterval(async () => {
  try {
    const now = new Date();
    const expired = await prisma.payment.findMany({
      where: { status: "PENDING", expiresAt: { lt: now } },
      select: { id: true, registrationId: true },
    });
    for (const p of expired) {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: p.id }, data: { status: "EXPIRED" } }),
        prisma.registration.update({
          where: { id: p.registrationId },
          data: { status: "CANCELLED" },
        }),
      ]);
    }
    if (expired.length > 0) {
      console.log(`Expired ${expired.length} pending payments`);
    }
  } catch (err) {
    console.error("Payment expiry cron error:", err);
  }
}, 60_000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
