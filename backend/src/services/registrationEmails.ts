import { Prisma } from "@prisma/client";
import { sendConfirmationEmail, sendRegistrationSuccessEmail } from "./email";

type RegistrationWithDetails = Prisma.RegistrationGetPayload<{
  include: { event: true; distance: true; teamMembers: true };
}> & {
  customFieldValues?: Prisma.CustomFieldValueGetPayload<{ include: { fieldDef: true } }>[];
};

function emailCustomFields(reg: RegistrationWithDetails) {
  const fields = (reg.customFieldValues ?? [])
    .filter((v) => v.fieldDef.includeInEmail && v.value !== "")
    .sort((a, b) => a.fieldDef.order - b.fieldDef.order)
    .map((v) => {
      let value = v.value;
      try {
        const parsed = JSON.parse(v.value);
        if (Array.isArray(parsed)) value = parsed.join(", ");
      } catch {}
      return { label: v.fieldDef.label, value };
    });
  return fields.length > 0 ? fields : undefined;
}

// "Thanh toán thành công" email; links back to the waiver/BIB steps when the event still needs them.
export function sendPaidRegistrationEmail(reg: RegistrationWithDetails & { email: string }) {
  const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const needsContinue = reg.event.requireDisclaimer || reg.event.requireBibSpin;
  return sendRegistrationSuccessEmail({
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
    continueUrl: needsContinue ? `${frontend.replace(/\/$/, "")}/payment/${reg.id}/success?step=waiver` : undefined,
    teamMembers: reg.teamMembers.length > 0 ? reg.teamMembers : undefined,
    customFields: emailCustomFields(reg),
  });
}

// "Xác nhận BIB" email, sent once the runner has a BIB number.
export function sendBibConfirmationEmail(reg: RegistrationWithDetails & { email: string; bibNumber: number }) {
  return sendConfirmationEmail({
    to: reg.email,
    fullName: reg.fullName ?? null,
    eventName: reg.event.name,
    distanceName: reg.distance.name,
    bibNumber: reg.bibNumber,
    registrationId: reg.id,
    eventDate: reg.event.eventDate?.toLocaleDateString("vi-VN") ?? null,
    location: reg.event.location ?? null,
    phone: reg.phone ?? null,
    dob: reg.dob?.toLocaleDateString("vi-VN") ?? null,
    idNumber: reg.idNumber ?? null,
    shirtSize: reg.shirtSize ?? null,
    bloodType: reg.bloodType ?? null,
    medicalConditions: reg.medicalConditions ?? null,
    emergencyName: reg.emergencyName ?? null,
    emergencyPhone: reg.emergencyPhone ?? null,
    teamMembers: reg.teamMembers.length > 0 ? reg.teamMembers : undefined,
  });
}
