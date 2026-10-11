import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, users } from "@/lib/db/schema";

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[Rent reminders] CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Rent reminder job is not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.error("[Rent reminders] SMTP settings are incomplete.");
    return NextResponse.json({ error: "Email delivery is not configured." }, { status: 500 });
  }

  const now = new Date();
  const day = now.getUTCDate();
  const month = now.toISOString().slice(0, 7);
  const leases = await db.select({
    id: assets.id,
    title: assets.title,
    monthlyRent: assets.monthlyRent,
    rentDueDay: assets.rentDueDay,
    lastRentReminderMonth: assets.lastRentReminderMonth,
    ownerName: users.name,
    ownerEmail: users.email,
  }).from(assets)
    .innerJoin(users, eq(assets.createdById, users.id))
    .where(and(
      eq(assets.listingType, "LEASE"),
      eq(assets.isSold, false),
      eq(assets.rentDueDay, day),
      isNotNull(assets.monthlyRent),
    ));

  const port = Number(SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  let sent = 0;
  for (const lease of leases) {
    if (lease.lastRentReminderMonth === month) continue;
    await transporter.sendMail({
      from: SMTP_FROM,
      to: lease.ownerEmail,
      subject: `Monthly rent due: ${lease.title}`,
      text: `Hello ${lease.ownerName || "Auctioneer"},\n\nThe monthly rent of MWK ${Number(lease.monthlyRent).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} is due today for the lease listing "${lease.title}".\n\nThis is your scheduled rent reminder.`,
    });
    await db.update(assets)
      .set({ lastRentReminderMonth: month })
      .where(and(
        eq(assets.id, lease.id),
        isNotNull(assets.rentDueDay),
      ));
    sent += 1;
  }

  return NextResponse.json({ success: true, sent });
}
