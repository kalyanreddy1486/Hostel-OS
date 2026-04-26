/**
 * ID-proof compression — server-side only.
 *
 * Most ID proofs come from a phone camera and are 1-5 MB JPEGs (or PDFs
 * containing one full-resolution JPEG). At ~300 DPI a smartphone capture
 * is far higher resolution than needed for a legible Aadhaar / PAN scan;
 * 200 DPI is plenty.
 *
 * Strategy:
 *   - Image input (jpg/png/webp/heic): downsize to max 1500px on the long
 *     edge, re-encode JPEG q80, wrap in a single-page PDF.
 *   - PDF input: re-save through pdf-lib with object streams enabled;
 *     gives a modest 10-30% reduction without touching embedded images.
 *     (Heavy PDF re-compression needs ghostscript which is awkward on
 *     Vercel; the bulk of bloat is image-side anyway.)
 *
 * Always returns a PDF buffer + final byte size. Storage stays
 * homogeneous (all .pdf in the bucket, same render path on download).
 */

import sharp from "sharp";
import { PDFDocument, PageSizes } from "pdf-lib";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_DIMENSION = 1500; // px on the long edge — plenty for legibility
const JPEG_QUALITY = 80;

export type CompressedIdProof = {
  bytes: Uint8Array;
  contentType: "application/pdf";
  size: number;
};

export async function compressIdProof(file: File): Promise<CompressedIdProof> {
  const inputBytes = new Uint8Array(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    return compressPdf(inputBytes);
  }
  if (IMAGE_TYPES.has(file.type.toLowerCase())) {
    return imageToCompressedPdf(inputBytes);
  }
  throw new Error(
    "ID proof must be a PDF or an image (JPG/PNG/WebP/HEIC).",
  );
}

async function compressPdf(input: Uint8Array): Promise<CompressedIdProof> {
  const doc = await PDFDocument.load(input, {
    ignoreEncryption: false,
    throwOnInvalidObject: false,
  });
  // pdf-lib re-emits the document; with object streams (newer PDF spec)
  // and dropping unused objects, this typically saves 10-30%.
  const out = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  // If the re-saved version is somehow LARGER than the input (e.g. pdf-lib
  // expanded compressed streams it didn't recognise), fall back to the
  // original bytes — never make the file bigger.
  if (out.byteLength >= input.byteLength) {
    return {
      bytes: input,
      contentType: "application/pdf",
      size: input.byteLength,
    };
  }
  return {
    bytes: out,
    contentType: "application/pdf",
    size: out.byteLength,
  };
}

async function imageToCompressedPdf(
  input: Uint8Array,
): Promise<CompressedIdProof> {
  // Downsize + re-encode as JPEG. `withMetadata: false` strips EXIF
  // (PII like GPS coordinates from the phone).
  const jpeg = await sharp(input)
    .rotate() // auto-rotate based on EXIF before stripping
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const doc = await PDFDocument.create();
  const img = await doc.embedJpg(jpeg.data);
  // Fit the image on an A4 page, centered, preserving aspect ratio.
  const [pageW, pageH] = PageSizes.A4;
  const scale = Math.min(pageW / img.width, pageH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;

  const page = doc.addPage(PageSizes.A4);
  page.drawImage(img, { x, y, width: drawW, height: drawH });
  const out = await doc.save({ useObjectStreams: true });

  return {
    bytes: out,
    contentType: "application/pdf",
    size: out.byteLength,
  };
}
