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

export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  stateText: text("state_text").notNull().default(""),
  structuredStateJson: text("structured_state_json"),
  surveyJson: text("survey_json").notNull().default("{}"),
  categoryProfilesJson: text("category_profiles_json").notNull().default("{}"),
  completion: integer("completion").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const decisions = sqliteTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inputType: text("input_type").notNull(),
    inputLabel: text("input_label").notNull(),
    inputJson: text("input_json").notNull(),
    answersJson: text("answers_json").notNull(),
    resultJson: text("result_json"),
    verdict: text("verdict"),
    status: text("status").notNull().default("pending"),
    categoryId: text("category_id"),
    subcategoryId: text("subcategory_id"),
    recheckAt: text("recheck_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_decisions_user_created").on(table.userId, table.createdAt),
    index("idx_decisions_user_status").on(table.userId, table.status),
    index("idx_decisions_user_recheck").on(table.userId, table.recheckAt),
  ],
);

export const subscriptions = sqliteTable("subscriptions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tier: text("tier").notNull().default("essential"),
  status: text("status").notNull().default("active"),
  provider: text("provider"),
  providerCustomerId: text("provider_customer_id"),
  providerSubscriptionId: text("provider_subscription_id"),
  currentPeriodEnd: integer("current_period_end"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const purchaseFeedback = sqliteTable(
  "purchase_feedback",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    decisionId: text("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    rating: integer("rating"),
    wouldChooseAgain: integer("would_choose_again"),
    note: text("note"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_purchase_feedback_decision_stage").on(table.decisionId, table.stage),
    index("idx_purchase_feedback_user_created").on(table.userId, table.createdAt),
  ],
);


export const analyticsSessions = sqliteTable("analytics_sessions", {
  sessionId: text("session_id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  userId: text("user_id"),
  firstSeen: integer("first_seen").notNull(),
  lastSeen: integer("last_seen").notNull(),
  entryPath: text("entry_path").notNull(),
  currentPath: text("current_path").notNull(),
  referrerHost: text("referrer_host"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  device: text("device").notNull().default("unknown"),
  language: text("language").notNull().default("ko"),
  country: text("country"),
  pageViews: integer("page_views").notNull().default(0),
}, (table) => [
  index("idx_analytics_sessions_last_seen").on(table.lastSeen),
  index("idx_analytics_sessions_user").on(table.userId, table.lastSeen),
]);

export const analyticsEvents = sqliteTable("analytics_events", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id"),
  name: text("name").notNull(),
  path: text("path").notNull(),
  propertiesJson: text("properties_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_analytics_events_created").on(table.createdAt),
  index("idx_analytics_events_name_created").on(table.name, table.createdAt),
]);

export const purchaseOutcomes = sqliteTable("purchase_outcomes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  decisionId: text("decision_id").notNull().unique().references(() => decisions.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  purchasePrice: integer("purchase_price"),
  satisfaction: integer("satisfaction"),
  wouldChooseAgain: integer("would_choose_again"),
  note: text("note"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
