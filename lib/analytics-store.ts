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
      FROM users u ORDER BY CASE WHEN last_seen>u.updated_at THEN last_seen ELSE u.updated_at END DESC LIMIT 40`).all<Record<string, unknown>>(),
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


export async function getAdminTimeSeries(days:number) {
  const db=await ensureAnalyticsSchema();
  const safeDays=[1,7,30,90].includes(days)?days:7;
  const start=Date.now()-safeDays*86_400_000;
  const [traffic,decisions,revenue,ai] = await Promise.all([
    db.prepare(`SELECT date(created_at/1000,'unixepoch','+9 hours') day,
      COUNT(DISTINCT visitor_id) visitors,COUNT(DISTINCT session_id) sessions
      FROM analytics_events WHERE name='page_view' AND created_at>=? GROUP BY day ORDER BY day`).bind(start).all<Record<string,unknown>>(),
    db.prepare(`SELECT date(updated_at/1000,'unixepoch','+9 hours') day,COUNT(*) decisions
      FROM decisions WHERE status='completed' AND updated_at>=? GROUP BY day ORDER BY day`).bind(start).all<Record<string,unknown>>(),
    db.prepare(`SELECT date(paid_at/1000,'unixepoch','+9 hours') day,COUNT(*) orders,COALESCE(SUM(amount),0) revenue
      FROM billing_orders WHERE status='paid' AND paid_at>=? GROUP BY day ORDER BY day`).bind(start).all<Record<string,unknown>>(),
    db.prepare(`SELECT date(updated_at/1000,'unixepoch','+9 hours') day,COALESCE(SUM(actual_micro),0) micro
      FROM credit_runs WHERE state='completed' AND updated_at>=? GROUP BY day ORDER BY day`).bind(start).all<Record<string,unknown>>(),
  ]);
  const byDay=new Map<string,{day:string;visitors:number;sessions:number;decisions:number;orders:number;revenue:number;aiCost:number}>();
  const ensure=(day:string)=>{let row=byDay.get(day);if(!row){row={day,visitors:0,sessions:0,decisions:0,orders:0,revenue:0,aiCost:0};byDay.set(day,row);}return row;};
  for(const row of traffic.results??[]){const x=ensure(String(row.day));x.visitors=Number(row.visitors||0);x.sessions=Number(row.sessions||0);}
  for(const row of decisions.results??[]){ensure(String(row.day)).decisions=Number(row.decisions||0);}
  for(const row of revenue.results??[]){const x=ensure(String(row.day));x.orders=Number(row.orders||0);x.revenue=Number(row.revenue||0);}
  const fx=safeFx();
  for(const row of ai.results??[]){ensure(String(row.day)).aiCost=Math.round(Number(row.micro||0)/1_000_000*fx);}
  return [...byDay.values()].sort((a,b)=>a.day.localeCompare(b.day)).map((row)=>({...row,contribution:row.revenue-row.aiCost}));
}

export async function getAdminSegmentAnalytics(input:{
  days:number;source?:string|null;device?:string|null;country?:string|null;language?:string|null;
}) {
  const db=await ensureAnalyticsSchema();
  const days=[1,7,30,90].includes(input.days)?input.days:7;
  const start=Date.now()-days*86_400_000;
  const clauses=["first_seen>=?"];const values:unknown[]=[start];
  if(input.source){clauses.push("(LOWER(COALESCE(utm_source,''))=LOWER(?) OR LOWER(COALESCE(referrer_host,''))=LOWER(?))");values.push(input.source,input.source);}
  if(input.device){clauses.push("device=?");values.push(input.device);}
  if(input.country){clauses.push("country=?");values.push(input.country.toUpperCase());}
  if(input.language){clauses.push("LOWER(language) LIKE LOWER(?)");values.push(input.language+"%");}
  const where=clauses.join(" AND ");
  const sessionSql=`SELECT session_id,visitor_id,user_id FROM analytics_sessions WHERE ${where}`;
  const [audience,funnel,commercial] = await Promise.all([
    db.prepare(`SELECT COUNT(*) sessions,COUNT(DISTINCT visitor_id) visitors,COUNT(DISTINCT user_id) knownUsers FROM (${sessionSql})`).bind(...values).first<Record<string,number>>(),
    db.prepare(`WITH matched AS (${sessionSql})
      SELECT
       COUNT(DISTINCT CASE WHEN e.name='page_view' THEN e.session_id END) visits,
       COUNT(DISTINCT CASE WHEN e.name='lens_input' THEN e.session_id END) lens,
       COUNT(DISTINCT CASE WHEN e.name='advisor_completed' THEN e.session_id END) advisor,
       COUNT(DISTINCT CASE WHEN e.name='decision_started' THEN e.session_id END) started,
       COUNT(DISTINCT CASE WHEN e.name='decision_completed' THEN e.session_id END) completed,
       COUNT(DISTINCT CASE WHEN e.name='checkout_started' THEN e.session_id END) checkout
      FROM analytics_events e JOIN matched m ON m.session_id=e.session_id WHERE e.created_at>=?`).bind(...values,start).first<Record<string,number>>(),
    db.prepare(`WITH matched AS (${sessionSql}), userset AS (SELECT DISTINCT user_id FROM matched WHERE user_id IS NOT NULL)
      SELECT
       (SELECT COUNT(*) FROM decisions d JOIN userset u ON u.user_id=d.user_id WHERE d.status='completed' AND d.updated_at>=?) decisions,
       (SELECT COUNT(*) FROM billing_orders b JOIN userset u ON u.user_id=b.user_id WHERE b.status='paid' AND b.paid_at>=?) paidOrders,
       (SELECT COALESCE(SUM(amount),0) FROM billing_orders b JOIN userset u ON u.user_id=b.user_id WHERE b.status='paid' AND b.paid_at>=?) revenue
    `).bind(...values,start,start,start).first<Record<string,number>>(),
  ]);
  const visits=Number(funnel?.visits||0),completed=Number(funnel?.completed||0),checkout=Number(funnel?.checkout||0);
  return {
    rangeDays:days,
    filter:{source:input.source??null,device:input.device??null,country:input.country??null,language:input.language??null},
    audience:{sessions:Number(audience?.sessions||0),visitors:Number(audience?.visitors||0),knownUsers:Number(audience?.knownUsers||0)},
    funnel:{visits,lens:Number(funnel?.lens||0),advisor:Number(funnel?.advisor||0),started:Number(funnel?.started||0),completed,checkout},
    rates:{visitToDecisionPct:visits?round1(completed/visits*100):0,visitToCheckoutPct:visits?round1(checkout/visits*100):0},
    commercial:{decisions:Number(commercial?.decisions||0),paidOrders:Number(commercial?.paidOrders||0),revenue:Number(commercial?.revenue||0)},
  };
}

export async function findAdminUsers(query:string,limit:number) {
  const db=await ensureAnalyticsSchema();
  const safeLimit=Math.max(1,Math.min(50,Math.trunc(limit||20)));
  const like=`%${query.trim().toLowerCase().slice(0,120)}%`;
  const rows=await db.prepare(`SELECT u.id,u.email,u.display_name,u.created_at,u.updated_at,
    COALESCE((SELECT completion FROM user_profiles p WHERE p.user_id=u.id),0) completion,
    COALESCE((SELECT MAX(last_seen) FROM analytics_sessions s WHERE s.user_id=u.id),0) last_seen,
    (SELECT COUNT(*) FROM decisions d WHERE d.user_id=u.id AND d.status='completed') decisions,
    COALESCE((SELECT SUM(amount) FROM billing_orders b WHERE b.user_id=u.id AND b.status='paid'),0) revenue
    FROM users u WHERE LOWER(u.email) LIKE ? OR LOWER(u.display_name) LIKE ?
    ORDER BY CASE WHEN COALESCE((SELECT MAX(last_seen) FROM analytics_sessions s2 WHERE s2.user_id=u.id),0)>u.updated_at
      THEN COALESCE((SELECT MAX(last_seen) FROM analytics_sessions s3 WHERE s3.user_id=u.id),0) ELSE u.updated_at END DESC LIMIT ?`)
    .bind(like,like,safeLimit).all<Record<string,unknown>>();
  return (rows.results??[]).map(row=>({
    id:String(row.id||""),email:String(row.email||""),displayName:String(row.display_name||""),
    createdAt:Number(row.created_at||0),lastSeen:Number(row.last_seen||0),completion:Number(row.completion||0),
    decisions:Number(row.decisions||0),revenue:Number(row.revenue||0),
  }));
}

export async function getAdminUserJourney(email:string,limit:number) {
  const db=await ensureAnalyticsSchema();
  const safeLimit=Math.max(5,Math.min(100,Math.trunc(limit||40)));
  const user=await db.prepare(`SELECT id,email,display_name,created_at,updated_at FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1`).bind(email.trim()).first<Record<string,unknown>>();
  if(!user)return null;
  const userId=String(user.id);
  const [profile,events,decisions,orders,feedback,outcomes]=await Promise.all([
    db.prepare(`SELECT completion,updated_at FROM user_profiles WHERE user_id=?`).bind(userId).first<Record<string,unknown>>(),
    db.prepare(`SELECT name,path,properties_json,created_at FROM analytics_events WHERE user_id=? ORDER BY created_at DESC LIMIT ?`).bind(userId,safeLimit).all<Record<string,unknown>>(),
    db.prepare(`SELECT id,input_type,input_label,verdict,status,created_at,updated_at FROM decisions WHERE user_id=? ORDER BY created_at DESC LIMIT ?`).bind(userId,safeLimit).all<Record<string,unknown>>(),
    db.prepare(`SELECT id,product_id,amount,credits,status,created_at,paid_at FROM billing_orders WHERE user_id=? ORDER BY created_at DESC LIMIT ?`).bind(userId,safeLimit).all<Record<string,unknown>>(),
    db.prepare(`SELECT decision_id,stage,rating,would_choose_again,note,created_at FROM purchase_feedback WHERE user_id=? ORDER BY created_at DESC LIMIT ?`).bind(userId,safeLimit).all<Record<string,unknown>>(),
    db.prepare(`SELECT decision_id,status,purchase_price,satisfaction,would_choose_again,note,updated_at FROM purchase_outcomes WHERE user_id=? ORDER BY updated_at DESC LIMIT ?`).bind(userId,safeLimit).all<Record<string,unknown>>(),
  ]);
  return {
    user:{id:userId,email:String(user.email||""),displayName:String(user.display_name||""),createdAt:Number(user.created_at||0),updatedAt:Number(user.updated_at||0),profileCompletion:Number(profile?.completion||0)},
    events:(events.results??[]).map(row=>({name:String(row.name||""),path:String(row.path||""),createdAt:Number(row.created_at||0),properties:safeJson(String(row.properties_json||"{}"))})),
    decisions:decisions.results??[],orders:orders.results??[],feedback:feedback.results??[],outcomes:outcomes.results??[],
  };
}
