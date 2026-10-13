CREATE TABLE "auction_refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"auctionItemId" integer NOT NULL,
	"accessPaymentId" integer NOT NULL,
	"userId" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"reason" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"gatewayReference" varchar(191),
	"processedById" integer,
	"processedAt" timestamp,
	"emailSentAt" timestamp,
	"processedEmailSentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auction_refunds_accessPaymentId_unique" UNIQUE("accessPaymentId")
);
--> statement-breakpoint
CREATE TABLE "auction_settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"auctionItemId" integer NOT NULL,
	"winnerId" integer,
	"winningBidAmount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"winnerEmailSentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auction_settlements_auctionItemId_unique" UNIQUE("auctionItemId")
);
--> statement-breakpoint
ALTER TABLE "auction_items" ADD COLUMN "reservePriceDisclosed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "postalAddress" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "addressLine1" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "addressLine2" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "businessName" varchar(191);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nationalId" varchar(100);--> statement-breakpoint
ALTER TABLE "auction_refunds" ADD CONSTRAINT "auction_refunds_auctionItemId_auction_items_id_fk" FOREIGN KEY ("auctionItemId") REFERENCES "public"."auction_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_refunds" ADD CONSTRAINT "auction_refunds_accessPaymentId_auction_access_payments_id_fk" FOREIGN KEY ("accessPaymentId") REFERENCES "public"."auction_access_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_refunds" ADD CONSTRAINT "auction_refunds_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_refunds" ADD CONSTRAINT "auction_refunds_processedById_users_id_fk" FOREIGN KEY ("processedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_settlements" ADD CONSTRAINT "auction_settlements_auctionItemId_auction_items_id_fk" FOREIGN KEY ("auctionItemId") REFERENCES "public"."auction_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_settlements" ADD CONSTRAINT "auction_settlements_winnerId_users_id_fk" FOREIGN KEY ("winnerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auction_refunds_status_idx" ON "auction_refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auction_refunds_userId_idx" ON "auction_refunds" USING btree ("userId");