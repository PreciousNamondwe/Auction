CREATE TYPE "public"."Role" AS ENUM('BIDDER', 'AUCTIONEER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "asset_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"auctionItemId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"location" varchar(255) NOT NULL,
	"category" varchar(100) DEFAULT 'OTHER' NOT NULL,
	"salesType" varchar(50) DEFAULT 'PROPERTY' NOT NULL,
	"salePrice" numeric(14, 2),
	"isSold" boolean DEFAULT false NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"documentUrl" text,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auction_access_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"auctionItemId" integer NOT NULL,
	"feeType" varchar(50) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"paymentRef" varchar(191),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auction_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetId" integer NOT NULL,
	"reservePrice" numeric(14, 2) NOT NULL,
	"startingBid" numeric(14, 2) NOT NULL,
	"depositAmount" numeric(12, 2) NOT NULL,
	"biddingFee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"startTime" timestamp DEFAULT now() NOT NULL,
	"endTime" timestamp NOT NULL,
	"status" varchar(32) DEFAULT 'UPCOMING' NOT NULL,
	"liveRoomId" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auction_items_liveRoomId_unique" UNIQUE("liveRoomId")
);
--> statement-breakpoint
CREATE TABLE "auction_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"auctionItemId" integer NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auction_registrations_userId_auctionItemId_key" UNIQUE("userId","auctionItemId")
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"isWinningBid" boolean DEFAULT false NOT NULL,
	"bidderId" integer NOT NULL,
	"auctionItemId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetId" integer NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"stockCount" integer DEFAULT 1 NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"reference" varchar(191) NOT NULL,
	"gatewayStatus" varchar(191) NOT NULL,
	"purpose" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(191) NOT NULL,
	"email" varchar(191) NOT NULL,
	"password" text NOT NULL,
	"phoneNumber" varchar(20) NOT NULL,
	"role" "Role" DEFAULT 'BIDDER' NOT NULL,
	"isVerified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "asset_images" ADD CONSTRAINT "asset_images_auctionItemId_auction_items_id_fk" FOREIGN KEY ("auctionItemId") REFERENCES "public"."auction_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_access_payments" ADD CONSTRAINT "auction_access_payments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_access_payments" ADD CONSTRAINT "auction_access_payments_auctionItemId_auction_items_id_fk" FOREIGN KEY ("auctionItemId") REFERENCES "public"."auction_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_items" ADD CONSTRAINT "auction_items_assetId_assets_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_registrations" ADD CONSTRAINT "auction_registrations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_registrations" ADD CONSTRAINT "auction_registrations_auctionItemId_auction_items_id_fk" FOREIGN KEY ("auctionItemId") REFERENCES "public"."auction_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidderId_users_id_fk" FOREIGN KEY ("bidderId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_auctionItemId_auction_items_id_fk" FOREIGN KEY ("auctionItemId") REFERENCES "public"."auction_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sales" ADD CONSTRAINT "daily_sales_assetId_assets_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auction_access_payments_userId_auctionItemId_feeType_key" ON "auction_access_payments" USING btree ("userId","auctionItemId","feeType");--> statement-breakpoint
CREATE INDEX "auction_access_payments_userId_status_idx" ON "auction_access_payments" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "auction_items_status_idx" ON "auction_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bids_auctionItemId_amount_idx" ON "bids" USING btree ("auctionItemId","amount" DESC NULLS LAST);