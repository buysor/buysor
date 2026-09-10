import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const attendance = sqliteTable(
  "attendance",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attendanceDate: text("attendance_date").notNull(),
    dailyReward: integer("daily_reward").notNull().default(0),
    milestoneReward: integer("milestone_reward").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_attendance_user_date").on(
      table.userId,
      table.attendanceDate,
    ),
    index("idx_attendance_user_created").on(table.userId, table.createdAt),
  ],
);

export const creditLedger = sqliteTable(
  "credit_ledger",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    source: text("source").notNull(),
    referenceKey: text("reference_key").notNull(),
    expiresOn: text("expires_on").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_credit_ledger_reference").on(table.referenceKey),
    index("idx_credit_ledger_user_expiry").on(table.userId, table.expiresOn),
  ],
);
