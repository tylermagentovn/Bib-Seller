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

// Google Sheets sync temporarily disabled
export async function appendRegistrationToSheet(_data: RegistrationRow) {}

export async function updateBibInSheet(_registrationId: string, _bibNumber: number) {}
