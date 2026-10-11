import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const createdAt = () => timestamp("createdAt", { mode: "date" }).notNull().defaultNow();
const updatedAt = () => timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date());
export const roleEnum = pgEnum("Role", ["BIDDER", "AUCTIONEER", "ADMIN"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  password: text("password").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  role: roleEnum("role").notNull().default("BIDDER"),
  isVerified: boolean("isVerified").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("OTHER"),
  salesType: varchar("salesType", { length: 50 }).notNull().default("PROPERTY"),
  salePrice: numeric("salePrice", { precision: 14, scale: 2 }),
  isSold: boolean("isSold").notNull().default(false),
  attributes: jsonb("attributes").notNull().default({}),
  documentUrl: text("documentUrl"),
  createdById: integer("createdById").notNull().references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const auctionItems = pgTable("auction_items", {
  id: serial("id").primaryKey(),
  assetId: integer("assetId").notNull().references(() => assets.id, { onDelete: "cascade" }),
  reservePrice: numeric("reservePrice", { precision: 14, scale: 2 }).notNull(),
  startingBid: numeric("startingBid", { precision: 14, scale: 2 }).notNull(),
  depositAmount: numeric("depositAmount", { precision: 12, scale: 2 }).notNull(),
  biddingFee: numeric("biddingFee", { precision: 12, scale: 2 }).notNull().default("0"),
  startTime: timestamp("startTime", { mode: "date" }).notNull().defaultNow(),
  endTime: timestamp("endTime", { mode: "date" }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("UPCOMING"),
  liveRoomId: varchar("liveRoomId", { length: 100 }).unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("auction_items_status_idx").on(table.status)]);

export const assetImages = pgTable("asset_images", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  isPrimary: boolean("isPrimary").notNull().default(false),
  auctionItemId: integer("auctionItemId").notNull().references(() => auctionItems.id, { onDelete: "cascade" }),
});

export const auctionRegistrations = pgTable("auction_registrations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  auctionItemId: integer("auctionItemId").notNull().references(() => auctionItems.id),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  createdAt: createdAt(),
}, (table) => [unique("auction_registrations_userId_auctionItemId_key").on(table.userId, table.auctionItemId)]);

export const dailySales = pgTable("daily_sales", {
  id: serial("id").primaryKey(),
  assetId: integer("assetId").notNull().references(() => assets.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  stockCount: integer("stockCount").notNull().default(1),
  isAvailable: boolean("isAvailable").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const auctionAccessPayments = pgTable("auction_access_payments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  auctionItemId: integer("auctionItemId").notNull().references(() => auctionItems.id, { onDelete: "cascade" }),
  feeType: varchar("feeType", { length: 50 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentRef: varchar("paymentRef", { length: 191 }),
  status: varchar("status", { length: 50 }).notNull().default("PENDING"),
  paidAt: timestamp("paidAt", { mode: "date" }),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("auction_access_payments_userId_auctionItemId_feeType_key").on(table.userId, table.auctionItemId, table.feeType),
  index("auction_access_payments_userId_status_idx").on(table.userId, table.status),
]);

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: createdAt(),
  isWinningBid: boolean("isWinningBid").notNull().default(false),
  bidderId: integer("bidderId").notNull().references(() => users.id),
  auctionItemId: integer("auctionItemId").notNull().references(() => auctionItems.id, { onDelete: "cascade" }),
}, (table) => [index("bids_auctionItemId_amount_idx").on(table.auctionItemId, table.amount.desc())]);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 191 }).notNull().unique(),
  gatewayStatus: varchar("gatewayStatus", { length: 191 }).notNull(),
  purpose: text("purpose").notNull(),
  receiptEmailSentAt: timestamp("receiptEmailSentAt", { mode: "date" }),
  createdAt: createdAt(),
});

export const usersRelations = relations(users, ({ many }) => ({
  bids: many(bids),
  payments: many(payments),
  assets: many(assets),
  registrations: many(auctionRegistrations),
  accessPayments: many(auctionAccessPayments),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  createdBy: one(users, { fields: [assets.createdById], references: [users.id] }),
  auctionItems: many(auctionItems),
  saleItems: many(dailySales),
}));

export const auctionItemsRelations = relations(auctionItems, ({ one, many }) => ({
  asset: one(assets, { fields: [auctionItems.assetId], references: [assets.id] }),
  bids: many(bids),
  images: many(assetImages),
  registrations: many(auctionRegistrations),
  accessPayments: many(auctionAccessPayments),
}));

export const assetImagesRelations = relations(assetImages, ({ one }) => ({
  auctionItem: one(auctionItems, { fields: [assetImages.auctionItemId], references: [auctionItems.id] }),
}));

export const auctionRegistrationsRelations = relations(auctionRegistrations, ({ one }) => ({
  user: one(users, { fields: [auctionRegistrations.userId], references: [users.id] }),
  auctionItem: one(auctionItems, { fields: [auctionRegistrations.auctionItemId], references: [auctionItems.id] }),
}));

export const dailySalesRelations = relations(dailySales, ({ one }) => ({
  asset: one(assets, { fields: [dailySales.assetId], references: [assets.id] }),
}));

export const auctionAccessPaymentsRelations = relations(auctionAccessPayments, ({ one }) => ({
  user: one(users, { fields: [auctionAccessPayments.userId], references: [users.id] }),
  auctionItem: one(auctionItems, { fields: [auctionAccessPayments.auctionItemId], references: [auctionItems.id] }),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  bidder: one(users, { fields: [bids.bidderId], references: [users.id] }),
  auctionItem: one(auctionItems, { fields: [bids.auctionItemId], references: [auctionItems.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));