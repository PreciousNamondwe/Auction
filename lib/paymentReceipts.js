import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments, users } from "@/lib/db/schema";

export async function getPaymentReceiptDetails(reference) {
  const [row] = await db
    .select({
      id: payments.id,
      userId: payments.userId,
      amount: payments.amount,
      reference: payments.reference,
      gatewayStatus: payments.gatewayStatus,
      purpose: payments.purpose,
      createdAt: payments.createdAt,
      receiptEmailSentAt: payments.receiptEmailSentAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .where(eq(payments.reference, reference))
    .limit(1);

  if (!row) return null;
  const { userName, userEmail, ...payment } = row;
  return { payment, user: { name: userName, email: userEmail } };
}

export async function createPaymentReceiptPdf(payment, user) {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.08, 0.16, 0.19);
  const muted = rgb(0.35, 0.42, 0.44);
  const accent = rgb(0.25, 0.58, 0.06);
  const left = 56;

  page.drawText("TrustBid", { x: left, y: 720, size: 24, font: bold, color: ink });
  page.drawText("PAYMENT RECEIPT", { x: left, y: 682, size: 11, font: bold, color: accent });
  page.drawText(`Receipt #${payment.id}`, { x: left, y: 658, size: 10, font: regular, color: muted });
  page.drawLine({ start: { x: left, y: 640 }, end: { x: 556, y: 640 }, thickness: 1, color: rgb(0.85, 0.88, 0.88) });

  const details = [
    ["Name", user.name || "TrustBid user"],
    ["Email", user.email],
    ["Purpose", payment.purpose || "Payment"],
    ["Amount", `MWK ${Number(payment.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ["Status", payment.gatewayStatus],
    ["Date", new Date(payment.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC"],
    ["Transaction reference", payment.reference],
  ];

  let y = 602;
  for (const [label, value] of details) {
    page.drawText(label.toUpperCase(), { x: left, y, size: 8, font: bold, color: muted });
    y -= 17;
    page.drawText(String(value), { x: left, y, size: 11, font: regular, color: ink, maxWidth: 500 });
    y -= 36;
  }
  page.drawLine({ start: { x: left, y: y + 8 }, end: { x: 556, y: y + 8 }, thickness: 1, color: rgb(0.85, 0.88, 0.88) });
  page.drawText("This document confirms the transaction record shown above.", { x: left, y: y - 14, size: 9, font: regular, color: muted });
  return Buffer.from(await document.save());
}

export async function sendPaymentReceipt(reference) {
  const receipt = await getPaymentReceiptDetails(reference);
  if (!receipt || receipt.payment.gatewayStatus.toLowerCase() !== "completed") return false;
  if (receipt.payment.receiptEmailSentAt) return true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error("Receipt email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }

  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  const pdf = await createPaymentReceiptPdf(receipt.payment, receipt.user);
  const filename = `trustbid-receipt-${receipt.payment.reference.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

  await transporter.sendMail({
    from: SMTP_FROM,
    to: receipt.user.email,
    subject: `TrustBid payment receipt: ${receipt.payment.reference}`,
    text: `Hello ${receipt.user.name || "TrustBid user"},\n\nYour payment has been completed. Your receipt is attached.\n\nReference: ${receipt.payment.reference}\nAmount: MWK ${Number(receipt.payment.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nPurpose: ${receipt.payment.purpose}\n\nThank you,\nTrustBid`,
    attachments: [{ filename, content: pdf, contentType: "application/pdf" }],
  });

  await db.update(payments)
    .set({ receiptEmailSentAt: new Date() })
    .where(and(eq(payments.id, receipt.payment.id), isNull(payments.receiptEmailSentAt)));
  return true;
}
