export type SubscriptionTier = "free" | "member";
export type DecisionVerdict = "BUY" | "WAIT" | "SKIP";
export type DecisionInputType = "photo" | "link" | "name" | "category";

export type StructuredUserState = {
  currentProduct: string | null;
  painPoint: string | null;
  comfortableBudget: string | null;
  maximumBudget: string | null;
  usedAccepted: boolean | null;
  urgency: string | null;
  expectedUsePeriod: string | null;
  environment: string | null;
  futurePlan: string | null;
  mustHaves: string[];
  avoid: string[];
  uncertainties: string[];
};

export type UserModelPayload = {
  stateText: string;
  structuredState: StructuredUserState | null;
  survey: Record<string, string | number>;
  categoryProfiles: Record<string, Record<string, string | number>>;
  completion: number;
  updatedAt?: number;
};

export type DecisionDraft = {
  type: DecisionInputType;
  value: string;
  note?: string;
  imageDataUrl?: string;
  imageName?: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  createdAt: number;
};

export type DecisionAnswers = {
  purpose?: string;
  budget?: string;
  current?: string;
  condition?: string;
  timing?: string;
  note?: string;
};

export type DecisionAlternative = {
  name: string;
  whenBetter: string;
  reason: string;
};

export type DecisionResult = {
  verdict: DecisionVerdict;
  headline: string;
  summary: string;
  confidence: number;
  topPick: {
    name: string;
    why: string;
    targetPrice: string | null;
    condition: string | null;
  } | null;
  reasons: string[];
  tradeoffs: string[];
  alternatives: DecisionAlternative[];
  waitFor: string | null;
  avoid: string[];
  missingInformation: string[];
  userModelUsed: string[];
  recheckAt: string | null;
};

export type DecisionHistoryItem = {
  id: string;
  createdAt: number;
  inputType: DecisionInputType;
  inputLabel: string;
  categoryId: string | null;
  subcategoryId: string | null;
  verdict: DecisionVerdict | null;
  status: "pending" | "completed" | "failed";
  result: DecisionResult | null;
};

export type ReportMetric = {
  label: string;
  value: string;
  note: string;
};

export type ReportBar = {
  label: string;
  value: number;
  note: string;
};

export type PremiumReportData = {
  priorities: Array<{
    id: string;
    title: string;
    verdict: DecisionVerdict;
    reason: string;
    confidence: number;
  }>;
  timeline: Array<{
    id: string;
    title: string;
    when: string;
    action: string;
  }>;
  riskFlags: string[];
  scenarioCandidates: Array<{
    decisionId: string;
    title: string;
    alternatives: DecisionAlternative[];
  }>;
};

export type ReportData = {
  tier: SubscriptionTier;
  locked: boolean;
  period: "weekly" | "monthly";
  hasData: boolean;
  rangeLabel: string;
  metrics: ReportMetric[];
  categoryBars: ReportBar[];
  patterns: string[];
  recheck: Array<{
    id: string;
    title: string;
    note: string;
    verdict: DecisionVerdict | null;
    recheckAt: string | null;
  }>;
  historyCount: number;
  premium: PremiumReportData;
};
