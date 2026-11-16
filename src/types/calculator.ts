export type PlatformId =
  | 'instagram_reels'
  | 'tiktok'
  | 'youtube_longform'
  | 'youtube_shorts'
  | 'instagram_story'
  | 'cross_post_bundle';

export type NicheId =
  | 'finance_tech'
  | 'health_wellness'
  | 'tech_electronics'
  | 'lifestyle_beauty'
  | 'food_travel'
  | 'gaming';

export type UsageRightsTerm =
  | 'organic_only'
  | 'paid_30d'
  | 'paid_90d'
  | 'paid_180d'
  | 'paid_365d'
  | 'perpetual_buyout';

export type ExclusivityType =
  | 'none'
  | 'named_competitors_30d'
  | 'named_competitors_60d'
  | 'named_competitors_90d'
  | 'blanket_vertical_prohibition';

export type TurnaroundWindow = 'standard_14d' | 'rush_under_5d';

export interface CreatorProfile {
  platform: PlatformId;
  youtubeMultiplier: number; // 4.0 to 6.0 when youtube_longform is active
  niche: NicheId;
  customCpm: number | null; // Optional override within/near niche benchmark
  followerCount: number;
  medianViews: number;
  engagementMetrics: {
    comments: number;
    shares: number;
    saves: number;
  };
  productionFloorCost: number;
}

export interface DealScope {
  usageRightsTerm: UsageRightsTerm;
  whitelistingEnabled: boolean;
  whitelistingAdSpendEstimate: number;
  whitelistingExpirationDays: number;
  exclusivityType: ExclusivityType;
  turnaroundWindow: TurnaroundWindow;
  includedRevisionRounds: number;
  excessRevisionFeePerRound: number;
}

export interface TieredPackage {
  id: 'tierA' | 'tierB' | 'tierC';
  name: string;
  subtitle: string;
  recommended?: boolean;
  deliverables: string[];
  usageSummary: string;
  exclusivitySummary: string;
  fee: number;
  lineItems: Array<{ label: string; amount: number }>;
}

export interface DealWarning {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionHint?: string;
}

export interface CalculatedDealResult {
  breakdown: {
    activeCpm: number;
    platformMultiplier: number;
    rawReachValue: number;
    calculatedER: number;
    engagementTierLabel: string;
    engagementMultiplier: number;
    effectiveFloorCost: number;
    floorEnforced: boolean;
    baseCreationFee: number;
    usageRightsFee: number;
    usageMultiplier: number;
    whitelistingFee: number;
    whitelistingBasis: string;
    exclusivityFee: number;
    exclusivityMultiplier: number;
    rushFee: number;
    excessRevisionsFee: number;
    excessRevisionCount: number;
    totalCommercialRiders: number;
    totalRecommendedRate: number;
    estimatedSelfEmploymentTax: number;
    estimatedNetAfterSETax: number;
  };
  followerTier: {
    id: 'nano' | 'micro' | 'mid' | 'macro' | 'mega';
    label: string;
    rangeLabel: string;
  };
  tieredPackages: {
    tierA_Organic: TieredPackage;
    tierB_StandardGrowth: TieredPackage;
    tierC_FullScale: TieredPackage;
  };
  warnings: DealWarning[];
}

export type ClauseCategory = 'Payment' | 'Rights & IP' | 'Exclusivity' | 'Liability & Scope';

export interface ContractClause {
  clauseId: number;
  clauseTitle: string;
  category: ClauseCategory;
  severity: 'warning' | 'critical';
  redFlagPattern: string;
  advice: string;
  replacementText: string;
}

export type EmailScenarioId =
  | 'three_tier_anchor'
  | 'lowball_pushback'
  | 'reject_perpetual'
  | 'defend_exclusivity'
  | 'kill_fee_payment';

export const DEFAULT_DEAL_TAGS = [
  'High Priority',
  'Negotiation Pending',
  'Closed',
  'Follow-Up Needed',
  'Draft',
] as const;

export interface SavedDealSnapshot {
  id: string;
  name: string;
  tags?: string[];
  notes?: string;
  targetCpa?: number;
  targetMonthlyRevenue?: number;
  savedAt: string;
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
}

export interface PerformanceProjection {
  totalEngagements: number;
  calculatedER: number;
  engagementCaptureRate: number;
  projectedConversions: number;
  projectedCpa: number;
  targetCpa: number | null;
  breakEvenConversions: number | null;
  requiredEngagementConversionRate: number | null;
  meetsTargetCpa: boolean | null;
}

export type AppView = 'workbench' | 'comparison';

export type NegotiationCoachFocus =
  | 'balanced'
  | 'defend_scope'
  | 'anchor_up'
  | 'rights_exclusivity';

export interface NegotiationCoachDiscrepancy {
  dimension: string;
  deltaSummary: string;
  strategicImpact: string;
}

export interface NegotiationCoachTalkingPoint {
  title: string;
  targetDealName: string;
  rationale: string;
  scriptQuote: string;
}

export interface NegotiationCoachAnalysis {
  executiveSummary: string;
  keyDiscrepancies: NegotiationCoachDiscrepancy[];
  talkingPoints: NegotiationCoachTalkingPoint[];
  counterOfferRecommendation: {
    recommendedAnchorRate: number;
    recommendedFloorRate: number;
    concessionPlaybook: string;
  };
}
