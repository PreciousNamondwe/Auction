import { auth } from "@/auth";
import { createPaymentReceiptPdf, getPaymentReceiptDetails } from "@/lib/paymentReceipts";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await params;
    const receipt = await getPaymentReceiptDetails(reference);
    if (!receipt || receipt.payment.userId !== Number(session.user.id)) {
      return Response.json({ error: "Receipt not found" }, { status: 404 });
    }
    if (!["completed", "success"].includes(receipt.payment.gatewayStatus.toLowerCase())) {
      return Response.json({ error: "A receipt is available after payment is completed" }, { status: 409 });
    }

    const pdf = await createPaymentReceiptPdf(receipt.payment, receipt.user);
    const filename = `trustbid-receipt-${reference.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[Payment Receipt Download]", error);
    return Response.json({ error: "Could not generate receipt" }, { status: 500 });
  }
}
