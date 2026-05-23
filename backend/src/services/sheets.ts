import { google } from "googleapis";

function getAuthClient() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

interface RegistrationRow {
  registrationId: string;
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  eventName: string;
  distanceName: string;
  bibNumber: number | null;
  status: string;
  createdAt: string;
  emergencyName: string;
  emergencyPhone: string;
}

export async function appendRegistrationToSheet(data: RegistrationRow) {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const values = [[
      data.registrationId,
      data.fullName,
      data.phone,
      data.email,
      data.dob,
      data.eventName,
      data.distanceName,
      data.bibNumber ?? "",
      data.status,
      data.emergencyName,
      data.emergencyPhone,
      data.createdAt,
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:L",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  } catch (err) {
    // Log but don't fail — Sheet is not source of truth
    console.error("Google Sheets sync failed:", err);
  }
}

export async function updateBibInSheet(registrationId: string, bibNumber: number) {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:A",
    });

    const rows = response.data.values ?? [];
    const rowIndex = rows.findIndex((r) => r[0] === registrationId);
    if (rowIndex === -1) return;

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Sheet1!H${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[bibNumber]] },
    });
  } catch (err) {
    console.error("Google Sheets BIB update failed:", err);
  }
}
