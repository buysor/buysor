import { getD1Binding } from "@/db";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS analytics_sessions (
    session_id TEXT PRIMARY KEY NOT NULL, visitor_id TEXT NOT NULL, user_id TEXT,
    first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, entry_path TEXT NOT NULL, current_path TEXT NOT NULL,
    referrer_host TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
    device TEXT NOT NULL DEFAULT 'unknown', language TEXT NOT NULL DEFAULT 'ko', country TEXT,
    page_views INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_seen ON analytics_sessions(last_seen)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user ON analytics_sessions(user_id,last_seen)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_sessions_source ON analytics_sessions(utm_source,first_seen)`,
  `CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY NOT NULL, visitor_id TEXT NOT NULL, session_id TEXT NOT NULL, user_id TEXT,
    name TEXT NOT NULL, path TEXT NOT NULL, properties_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created ON analytics_events(name,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_session_created ON analytics_events(session_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS purchase_outcomes (
    id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, decision_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK(status IN ('bought','waiting','not_bought')), purchase_price INTEGER,
    satisfaction INTEGER CHECK(satisfaction IS NULL OR (satisfaction BETWEEN 1 AND 5)),
    would_choose_again INTEGER CHECK(would_choose_again IS NULL OR would_choose_again IN (0,1)),
    note TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS idx_purchase_outcomes_user_updated ON purchase_outcomes(user_id,updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_purchase_outcomes_status_updated ON purchase_outcomes(status,updated_at)`,
];

let ready: Promise<void> | null = null;

export async function ensureAnalyticsSchema() {
  const db = getD1Binding();
  if (!ready) {
    ready = db.batch(SCHEMA.map((sql) => db.prepare(sql))).then(() => undefined).catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
  return db;
}

export type AnalyticsEventInput = {
  id: string;
  visitorId: string;
  sessionId: string;
  name: string;
  path: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  device: string;
  language: string;
  propertiesJson: string;
  userId: string | null;
  country: string | null;
};

export async function recordAnalyticsEvent(input: AnalyticsEventInput) {
  const db = await ensureAnalyticsSchema();
  const now = Date.now();
  const pageView = input.name === "page_view" ? 1 : 0;
  await db.prepare(`
    INSERT INTO analytics_sessions(
      session_id,visitor_id,user_id,first_seen,last_seen,entry_path,current_path,referrer_host,
      utm_source,utm_medium,utm_campaign,utm_content,utm_term,device,language,country,page_views
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(session_id) DO UPDATE SET
      user_id=COALESCE(excluded.user_id,analytics_sessions.user_id),
      last_seen=excluded.last_seen,
      current_path=excluded.current_path,
      referrer_host=COALESCE(analytics_sessions.referrer_host,excluded.referrer_host),
      utm_source=COALESCE(analytics_sessions.utm_source,excluded.utm_source),
      utm_medium=COALESCE(analytics_sessions.utm_medium,excluded.utm_medium),
      utm_campaign=COALESCE(analytics_sessions.utm_campaign,excluded.utm_campaign),
      utm_content=COALESCE(analytics_sessions.utm_content,excluded.utm_content),
      utm_term=COALESCE(analytics_sessions.utm_term,excluded.utm_term),
      device=excluded.device,
      language=excluded.language,
      country=COALESCE(analytics_sessions.country,excluded.country),
      page_views=analytics_sessions.page_views+?
  `).bind(
    input.sessionId,input.visitorId,input.userId,now,now,input.path,input.path,input.referrerHost,
    input.utmSource,input.utmMedium,input.utmCampaign,input.utmContent,input.utmTerm,
    input.device,input.language,input.country,pageView,pageView,
  ).run();

  if (input.name !== "session_heartbeat") {
    await db.prepare(`INSERT OR IGNORE INTO analytics_events
      (id,visitor_id,session_id,user_id,name,path,properties_json,created_at)
      VALUES(?,?,?,?,?,?,?,?)`)
      .bind(input.id,input.visitorId,input.sessionId,input.userId,input.name,input.path,input.propertiesJson,now)
      .run();
  }
}

type CountRow = { n: number };
type SumRow = { n: number; amount?: number | null; micro?: number | null; avg?: number | null };

export async function getAdminAnalytics(rangeDays: number) {
  const db = await ensureAnalyticsSchema();
  const now = Date.now();
  const rangeStart = now - rangeDays * 86_400_000;
  const todayStart = startOfKoreaDay(now);
  const activeSince = now - 5 * 60_000;
  const fx = safeFx();

  const [
    activeNow, visitorsToday, sessionsToday, newUsersToday, decisionsToday, revenueToday, aiToday,
    funnel, sourceRows, pathRows, countryRows, verdictRows, inputRows, feedbackRow, outcomeRow,
    recentEvents, recentUsers,
  ] = await Promise.all([
    db.prepare(`SELECT COUNT(*) n FROM analytics_sessions WHERE last_seen>=?`).bind(activeSince).first<CountRow>(),
    db.prepare(`SELECT COUNT(DISTINCT visitor_id) n FROM analytics_events WHERE name='page_view' AND created_at>=?`).bind(todayStart).first<CountRow>(),
    db.prepare(`SELECT COUNT(DISTINCT session_id) n FROM analytics_events WHERE name='page_view' AND created_at>=?`).bind(todayStart).first<CountRow>(),
    db.prepare(`SELECT COUNT(*) n FROM users WHERE created_at>=?`).bind(todayStart).first<CountRow>(),
    db.prepare(`SELECT COUNT(*) n FROM decisions WHERE status='completed' AND updated_at>=?`).bind(todayStart).first<CountRow>(),
    db.prepare(`SELECT COUNT(*) n,COALESCE(SUM(amount),0) amount FROM billing_orders WHERE status='paid' AND paid_at>=?`).bind(todayStart).first<SumRow>(),
    db.prepare(`SELECT COALESCE(SUM(actual_micro),0) micro FROM credit_runs WHERE state='completed' AND updated_at>=?`).bind(todayStart).first<SumRow>(),
    db.prepare(`SELECT
      COUNT(DISTINCT CASE WHEN name='page_view' THEN session_id END) visits,
      COUNT(DISTINCT CASE WHEN name='lens_input' THEN session_id END) lens,
      COUNT(DISTINCT CASE WHEN name='advisor_completed' THEN session_id END) advisor,
      COUNT(DISTINCT CASE WHEN name='decision_started' THEN session_id END) started,
      COUNT(DISTINCT CASE WHEN name='decision_completed' THEN session_id END) completed,
      COUNT(DISTINCT CASE WHEN name='checkout_started' THEN session_id END) checkout
      FROM analytics_events WHERE created_at>=?`).bind(rangeStart).first<Record<string, number>>(),
    db.prepare(`SELECT COALESCE(NULLIF(utm_source,''),NULLIF(referrer_host,''),'Direct') label,COUNT(*) n
      FROM analytics_sessions WHERE first_seen>=? GROUP BY label ORDER BY n DESC LIMIT 8`).bind(rangeStart).all<{label:string;n:number}>(),
    db.prepare(`SELECT path label,COUNT(*) n FROM analytics_events WHERE name='page_view' AND created_at>=?
      GROUP BY path ORDER BY n DESC LIMIT 10`).bind(rangeStart).all<{label:string;n:number}>(),
    db.prepare(`SELECT COALESCE(country,'—') label,COUNT(*) n FROM analytics_sessions WHERE first_seen>=?
      GROUP BY label ORDER BY n DESC LIMIT 8`).bind(rangeStart).all<{label:string;n:number}>(),
    db.prepare(`SELECT COALESCE(verdict,'—') label,COUNT(*) n FROM decisions WHERE status='completed' AND updated_at>=?
      GROUP BY verdict ORDER BY n DESC`).bind(rangeStart).all<{label:string;n:number}>(),
    db.prepare(`SELECT input_type label,COUNT(*) n FROM decisions WHERE created_at>=?
      GROUP BY input_type ORDER BY n DESC`).bind(rangeStart).all<{label:string;n:number}>(),
    db.prepare(`SELECT COUNT(*) n,AVG(rating) avg FROM purchase_feedback WHERE stage='decision_helpfulness' AND created_at>=?`)
      .bind(rangeStart).first<SumRow>(),
    db.prepare(`SELECT COUNT(*) n,AVG(CASE WHEN status='bought' THEN satisfaction END) avg,
      COALESCE(SUM(CASE WHEN status='bought' THEN purchase_price ELSE 0 END),0) amount
      FROM purchase_outcomes WHERE updated_at>=?`).bind(rangeStart).first<SumRow>(),
    db.prepare(`SELECT e.name,e.path,e.properties_json,e.created_at,e.visitor_id,u.email
      FROM analytics_events e LEFT JOIN users u ON u.id=e.user_id
      ORDER BY e.created_at DESC LIMIT 60`).all<Record<string, unknown>>(),
    db.prepare(`SELECT u.id,u.email,u.created_at,u.updated_at,
      COALESCE((SELECT completion FROM user_profiles p WHERE p.user_id=u.id),0) completion,
      (SELECT COUNT(*) FROM decisions d WHERE d.user_id=u.id AND d.status='completed') decisions,
      COALESCE((SELECT SUM(amount) FROM billing_orders b WHERE b.user_id=u.id AND b.status='paid'),0) revenue,
      COALESCE((SELECT MAX(last_seen) FROM analytics_sessions s WHERE s.user_id=u.id),0) last_seen
      FROM users u ORDER BY MAX(u.updated_at,last_seen) DESC LIMIT 40`).all<Record<string, unknown>>(),
  ]);

  const aiMicro = Number(aiToday?.micro || 0);
  return {
    generatedAt: now,
    rangeDays,
    summary: {
      activeNow: Number(activeNow?.n || 0),
      visitorsToday: Number(visitorsToday?.n || 0),
      sessionsToday: Number(sessionsToday?.n || 0),
      newUsersToday: Number(newUsersToday?.n || 0),
      decisionsToday: Number(decisionsToday?.n || 0),
      paidOrdersToday: Number(revenueToday?.n || 0),
      revenueToday: Number(revenueToday?.amount || 0),
      aiCostToday: Math.round((aiMicro / 1_000_000) * fx),
      contributionToday: Math.round(Number(revenueToday?.amount || 0) - ((aiMicro / 1_000_000) * fx)),
      helpfulnessAvg: round1(Number(feedbackRow?.avg || 0)),
      feedbackCount: Number(feedbackRow?.n || 0),
      outcomeCount: Number(outcomeRow?.n || 0),
      satisfactionAvg: round1(Number(outcomeRow?.avg || 0)),
      recordedPurchaseValue: Number(outcomeRow?.amount || 0),
    },
    funnel: {
      visits:Number(funnel?.visits || 0), lens:Number(funnel?.lens || 0), advisor:Number(funnel?.advisor || 0),
      started:Number(funnel?.started || 0), completed:Number(funnel?.completed || 0), checkout:Number(funnel?.checkout || 0),
    },
    sources: sourceRows.results ?? [],
    paths: pathRows.results ?? [],
    countries: countryRows.results ?? [],
    verdicts: verdictRows.results ?? [],
    inputTypes: inputRows.results ?? [],
    recentEvents: (recentEvents.results ?? []).map((row) => ({
      name:String(row.name || ""), path:String(row.path || ""), createdAt:Number(row.created_at || 0),
      visitorId:String(row.visitor_id || "").slice(0,8), email:typeof row.email==="string"?row.email:null,
      properties:safeJson(typeof row.properties_json==="string"?row.properties_json:"{}"),
    })),
    recentUsers: (recentUsers.results ?? []).map((row) => ({
      id:String(row.id || ""), email:String(row.email || ""), createdAt:Number(row.created_at || 0),
      updatedAt:Number(row.updated_at || 0), completion:Number(row.completion || 0),
      decisions:Number(row.decisions || 0), revenue:Number(row.revenue || 0), lastSeen:Number(row.last_seen || 0),
    })),
  };
}

function startOfKoreaDay(now:number) {
  const shifted = new Date(now + 9 * 60 * 60_000);
  return Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate()) - 9 * 60 * 60_000;
}
function safeFx() {
  const value=Number(process.env.AI_FX_KRW_PER_USD || "1600");
  return Number.isFinite(value) && value>0 ? value : 1600;
}
function round1(value:number){return Math.round(value*10)/10;}
function safeJson(value:string){try{return JSON.parse(value) as Record<string,unknown>;}catch{return {};}}
