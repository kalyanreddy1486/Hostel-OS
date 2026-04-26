import QRCode from "qrcode";

export async function generateQrDataUrl(
  value: string,
): Promise<string | null> {
  try {
    return await QRCode.toDataURL(value, {
      margin: 1,
      width: 160,
      color: { dark: "#111827", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch {
    return null;
  }
}
