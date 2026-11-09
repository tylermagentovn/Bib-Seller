function tlv(tag: string, value: string): string {
  return tag + String(value.length).padStart(2, "0") + value;
}

// CRC-16/CCITT-FALSE, as required by the EMVCo QR spec for tag 63.
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// NAPAS VietQR payload for a bank-account transfer, scannable by any Vietnamese banking app.
export function buildVietQr(opts: { bin: string; accountNumber: string; amount: number; description: string }): string {
  const beneficiary = tlv("00", opts.bin) + tlv("01", opts.accountNumber);
  const merchantInfo = tlv("00", "A000000727") + tlv("01", beneficiary) + tlv("02", "QRIBFTTA");
  const payload =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("38", merchantInfo) +
    tlv("53", "704") +
    tlv("54", String(opts.amount)) +
    tlv("58", "VN") +
    tlv("62", tlv("08", opts.description)) +
    "6304";
  return payload + crc16(payload);
}
