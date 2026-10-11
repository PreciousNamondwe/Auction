CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetId" integer NOT NULL,
	"dailySaleId" integer,
	"buyerId" integer NOT NULL,
	"sellerId" integer NOT NULL,
	"kind" varchar(32) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"paymentRef" varchar(191) NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_paymentRef_unique" UNIQUE("paymentRef")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "clientName" varchar(191);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "listingType" varchar(20) DEFAULT 'AUCTION' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "monthlyRent" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "rentDueDay" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "lastRentReminderMonth" varchar(7);--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_assetId_assets_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_dailySaleId_daily_sales_id_fk" FOREIGN KEY ("dailySaleId") REFERENCES "public"."daily_sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_buyerId_users_id_fk" FOREIGN KEY ("buyerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_sellerId_users_id_fk" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
UPDATE "assets" SET "listingType" = 'SALE' WHERE "salesType" = 'DAILY_SALE';--> statement-breakpoint
UPDATE "auction_access_payments" SET "feeType" = 'ENTRY_FEE' WHERE "feeType" = 'SECURITY_DEPOSIT';--> statement-breakpoint
UPDATE "auction_access_payments" SET "feeType" = 'BIDDING_DEPOSIT' WHERE "feeType" = 'BIDDING_FEE';--> statement-breakpoint
UPDATE "assets" SET "clientName" = "location" WHERE "clientName" IS NULL;