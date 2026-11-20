import {
  ContractClause,
  CreatorProfile,
  CurrencyCode,
  CurrencySpec,
  DealScope,
  ExclusivityType,
  NicheId,
  PlatformId,
  UsageRightsTerm,
} from '../types/calculator';

export const CURRENCY_ORDER: CurrencyCode[] = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'INR',
];

export const CURRENCY_SPECS: Record<CurrencyCode, CurrencySpec> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateFromUsd: 1.0,
    decimals: 2,
    tier: 'free',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateFromUsd: 0.92,
    decimals: 2,
    tier: 'free',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rateFromUsd: 0.79,
    decimals: 2,
    tier: 'pro',
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    rateFromUsd: 1.38,
    decimals: 2,
    tier: 'pro',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    rateFromUsd: 1.52,
    decimals: 2,
    tier: 'pro',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    rateFromUsd: 151,
    decimals: 0,
    tier: 'pro',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    rateFromUsd: 84.5,
    decimals: 2,
    tier: 'pro',
  },
};

export interface NicheBenchmark {
  id: NicheId;
  label: string;
  cpmMin: number;
  cpmMax: number;
  defaultCpm: number;
  notes: string;
}

export const NICHE_BENCHMARKS: Record<NicheId, NicheBenchmark> = {
  finance_tech: {
    id: 'finance_tech',
    label: 'Finance, FinTech & B2B SaaS',
    cpmMin: 40,
    cpmMax: 80,
    defaultCpm: 60,
    notes: 'Highest LTV audience; strong B2B and financial conversion intent.',
  },
  health_wellness: {
    id: 'health_wellness',
    label: 'Health, Medical & Wellness',
    cpmMin: 30,
    cpmMax: 60,
    defaultCpm: 45,
    notes: 'High trust requirement and strict FTC/medical claim compliance.',
  },
  tech_electronics: {
    id: 'tech_electronics',
    label: 'Technology, Software & Consumer Electronics',
    cpmMin: 25,
    cpmMax: 50,
    defaultCpm: 37.5,
    notes: 'High-consideration product evaluations and hardware launches.',
  },
  lifestyle_beauty: {
    id: 'lifestyle_beauty',
    label: 'Lifestyle, Beauty & Fashion',
    cpmMin: 20,
    cpmMax: 40,
    defaultCpm: 30,
    notes: 'Visual creative production with high paid-social whitelisting demand.',
  },
  food_travel: {
    id: 'food_travel',
    label: 'Food, Travel & Entertainment',
    cpmMin: 15,
    cpmMax: 30,
    defaultCpm: 22.5,
    notes: 'Broad consumer reach; prioritize usage rights for hospitality/CPG.',
  },
  gaming: {
    id: 'gaming',
    label: 'Gaming & Esports',
    cpmMin: 8,
    cpmMax: 18,
    defaultCpm: 13,
    notes: 'High view volume; supplement base CPM with integration time & livestreaming.',
  },
};

export interface PlatformSpec {
  id: PlatformId;
  label: string;
  shortLabel: string;
  multiplier: number;
  deliverableUnit: string;
  description: string;
}

export const PLATFORM_SPECS: Record<PlatformId, PlatformSpec> = {
  instagram_reels: {
    id: 'instagram_reels',
    label: 'Instagram Reel',
    shortLabel: 'IG Reel',
    multiplier: 1.0,
    deliverableUnit: '1 Organic Instagram Reel',
    description: 'Baseline short-form vertical video (1.00x production unit).',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok Short-Form Video',
    shortLabel: 'TikTok',
    multiplier: 1.0,
    deliverableUnit: '1 Organic TikTok Video',
    description: 'Baseline algorithmic short-form video (1.00x production unit).',
  },
  youtube_longform: {
    id: 'youtube_longform',
    label: 'YouTube Long-Form Dedicated',
    shortLabel: 'YT Long-Form',
    multiplier: 5.0,
    deliverableUnit: '1 Dedicated YouTube Long-Form Video',
    description: '4.00x–6.00x multiplier reflecting watch time & high commercial intent.',
  },
  youtube_shorts: {
    id: 'youtube_shorts',
    label: 'YouTube Shorts',
    shortLabel: 'YT Shorts',
    multiplier: 1.0,
    deliverableUnit: '1 Organic YouTube Short',
    description: 'Short-form vertical feed placement (1.00x production unit).',
  },
  instagram_story: {
    id: 'instagram_story',
    label: 'Instagram Story Set (3–4 Frames)',
    shortLabel: 'IG Stories',
    multiplier: 0.35,
    deliverableUnit: '1 Instagram Story Set (3–4 Frames w/ Link)',
    description: 'Ephemeral 24-hour sequence with direct conversion link sticker (0.35x).',
  },
  cross_post_bundle: {
    id: 'cross_post_bundle',
    label: 'Platform Cross-Post Bundle',
    shortLabel: 'Cross-Post',
    multiplier: 1.4,
    deliverableUnit: '1 Multi-Platform Cross-Post Bundle (Reels + TikTok)',
    description: 'Native re-formatting and dual-channel organic distribution (1.40x).',
  },
};

export const USAGE_RIGHTS_SPECS: Record<
  UsageRightsTerm,
  { label: string; multiplier: number; benchmarkRange: string; description: string }
> = {
  organic_only: {
    label: 'Organic Only (No Paid Ads)',
    multiplier: 0,
    benchmarkRange: '0% (Base)',
    description: 'Published on creator channel; optional 30-day organic repost only.',
  },
  paid_30d: {
    label: '30-Day Paid Digital Ad Usage',
    multiplier: 0.25,
    benchmarkRange: '20% – 50%',
    description: 'Brand may run asset in paid social ads for 30 days from first live ad.',
  },
  paid_90d: {
    label: '90-Day Paid Digital Ad Usage',
    multiplier: 0.5,
    benchmarkRange: '40% – 75%',
    description: 'Standard quarterly paid acquisition window across Meta/TikTok.',
  },
  paid_180d: {
    label: '180-Day Paid Digital Ad Usage',
    multiplier: 0.85,
    benchmarkRange: '75% – 100%',
    description: 'Six-month commercial paid media distribution license.',
  },
  paid_365d: {
    label: '365-Day Paid Digital Ad Usage',
    multiplier: 1.25,
    benchmarkRange: '100% – 150%',
    description: 'Full annual commercial advertising rights across digital channels.',
  },
  perpetual_buyout: {
    label: 'Perpetual Buyout / Full IP Transfer',
    multiplier: 3.5,
    benchmarkRange: '300% – 500%',
    description: 'Indefinite commercial rights; triggers mandatory 350% buyout surcharge.',
  },
};

export const EXCLUSIVITY_SPECS: Record<
  ExclusivityType,
  { label: string; multiplier: number; benchmarkRange: string; description: string }
> = {
  none: {
    label: 'No Category Exclusivity',
    multiplier: 0,
    benchmarkRange: '0%',
    description: 'Creator remains free to work with any brand without restriction.',
  },
  named_competitors_30d: {
    label: '30-Day Named Competitor Lock',
    multiplier: 0.3,
    benchmarkRange: '20% – 40%',
    description: 'Bars collaborations with up to 3 explicitly named direct competitors for 30 days.',
  },
  named_competitors_60d: {
    label: '60-Day Named Competitor Lock',
    multiplier: 0.6,
    benchmarkRange: '50% – 75%',
    description: 'Bars collaborations with up to 3 explicitly named direct competitors for 60 days.',
  },
  named_competitors_90d: {
    label: '90-Day Named Competitor Lock',
    multiplier: 1.0,
    benchmarkRange: '80% – 100%',
    description: 'Full-quarter blackout against named direct competitors.',
  },
  blanket_vertical_prohibition: {
    label: 'Broad Blanket Vertical Prohibition',
    multiplier: 2.0,
    benchmarkRange: '200% Penalty',
    description: 'Prohibits entire industry vertical; severely restricts creator livelihood.',
  },
};

export interface TierBenchmarkRow {
  id: 'nano' | 'micro' | 'mid' | 'macro' | 'mega';
  tierName: string;
  followerRange: string;
  minFollowers: number;
  maxFollowers: number;
  instagramReel: string;
  tiktokVideo: string;
  youtubeLongForm: string;
  instagramReelUsd: number;
  tiktokVideoUsd: number;
  youtubeLongFormUsd: number;
  isPlus?: boolean;
  typicalER: string;
}

export const INDUSTRY_TIER_BENCHMARKS: TierBenchmarkRow[] = [
  {
    id: 'nano',
    tierName: 'Nano',
    followerRange: '1,000 – 10,000',
    minFollowers: 0,
    maxFollowers: 10000,
    instagramReel: '$48',
    tiktokVideo: '$82',
    youtubeLongForm: '$289',
    instagramReelUsd: 48,
    tiktokVideoUsd: 82,
    youtubeLongFormUsd: 289,
    typicalER: '8.0% – 12.0%',
  },
  {
    id: 'micro',
    tierName: 'Micro',
    followerRange: '10,000 – 50,000',
    minFollowers: 10001,
    maxFollowers: 50000,
    instagramReel: '$262',
    tiktokVideo: '$825',
    youtubeLongForm: '$1,575',
    instagramReelUsd: 262,
    tiktokVideoUsd: 825,
    youtubeLongFormUsd: 1575,
    typicalER: '4.0% – 8.0%',
  },
  {
    id: 'mid',
    tierName: 'Mid-Tier',
    followerRange: '50,000 – 500,000',
    minFollowers: 50001,
    maxFollowers: 500000,
    instagramReel: '$2,406',
    tiktokVideo: '$4,500',
    youtubeLongForm: '$14,437',
    instagramReelUsd: 2406,
    tiktokVideoUsd: 4500,
    youtubeLongFormUsd: 14437,
    typicalER: '2.0% – 4.0%',
  },
  {
    id: 'macro',
    tierName: 'Macro',
    followerRange: '500,000 – 1,000,000',
    minFollowers: 500001,
    maxFollowers: 1000000,
    instagramReel: '$6,562',
    tiktokVideo: '$11,250',
    youtubeLongForm: '$39,375',
    instagramReelUsd: 6562,
    tiktokVideoUsd: 11250,
    youtubeLongFormUsd: 39375,
    typicalER: '1.5% – 2.5%',
  },
  {
    id: 'mega',
    tierName: 'Mega',
    followerRange: '1,000,000+',
    minFollowers: 1000001,
    maxFollowers: Infinity,
    instagramReel: '$17,500+',
    tiktokVideo: '$30,000+',
    youtubeLongForm: '$105,000+',
    instagramReelUsd: 17500,
    tiktokVideoUsd: 30000,
    youtubeLongFormUsd: 105000,
    isPlus: true,
    typicalER: 'Under 2.0%',
  },
];

export interface CreatorPreset {
  id: string;
  label: string;
  description: string;
  profile: CreatorProfile;
  scope: DealScope;
}

export const CREATOR_PRESETS: CreatorPreset[] = [
  {
    id: 'worked_example',
    label: 'Mid-Tier FinTech (Worked Example)',
    description: '75K followers · 20K median views · 8.0% ER · IG Reel',
    profile: {
      platform: 'instagram_reels',
      youtubeMultiplier: 5.0,
      niche: 'finance_tech',
      customCpm: null,
      followerCount: 75000,
      medianViews: 20000,
      engagementMetrics: {
        comments: 400,
        shares: 500,
        saves: 700,
      },
      engagementVelocity: {
        enabled: true,
        recentLowViews: 14000,
        recentHighViews: 32000,
        recentLowER: 4.5,
        recentHighER: 9.5,
        sensitivity: 1.0,
      },
      productionFloorCost: 100,
    },
    scope: {
      usageRightsTerm: 'paid_90d',
      whitelistingEnabled: true,
      whitelistingAdSpendEstimate: 0,
      whitelistingExpirationDays: 90,
      exclusivityType: 'named_competitors_30d',
      turnaroundWindow: 'standard_14d',
      includedRevisionRounds: 2,
      excessRevisionFeePerRound: 200,
    },
  },
  {
    id: 'nano_beauty',
    label: 'Nano Beauty Creator',
    description: '6.5K followers · 4.2K median views · 10.5% ER · TikTok',
    profile: {
      platform: 'tiktok',
      youtubeMultiplier: 5.0,
      niche: 'lifestyle_beauty',
      customCpm: null,
      followerCount: 6500,
      medianViews: 4200,
      engagementMetrics: {
        comments: 140,
        shares: 110,
        saves: 191,
      },
      engagementVelocity: {
        enabled: true,
        recentLowViews: 2400,
        recentHighViews: 8500,
        recentLowER: 6.0,
        recentHighER: 13.0,
        sensitivity: 1.0,
      },
      productionFloorCost: 100,
    },
    scope: {
      usageRightsTerm: 'paid_30d',
      whitelistingEnabled: false,
      whitelistingAdSpendEstimate: 0,
      whitelistingExpirationDays: 30,
      exclusivityType: 'none',
      turnaroundWindow: 'standard_14d',
      includedRevisionRounds: 2,
      excessRevisionFeePerRound: 150,
    },
  },
  {
    id: 'micro_tech_yt',
    label: 'Micro Tech Reviewer (YouTube)',
    description: '34K followers · 18K median views · 5.2% ER · YouTube Long-Form',
    profile: {
      platform: 'youtube_longform',
      youtubeMultiplier: 5.0,
      niche: 'tech_electronics',
      customCpm: null,
      followerCount: 34000,
      medianViews: 18000,
      engagementMetrics: {
        comments: 420,
        shares: 210,
        saves: 306,
      },
      engagementVelocity: {
        enabled: true,
        recentLowViews: 12000,
        recentHighViews: 28000,
        recentLowER: 3.0,
        recentHighER: 6.5,
        sensitivity: 1.0,
      },
      productionFloorCost: 250,
    },
    scope: {
      usageRightsTerm: 'paid_90d',
      whitelistingEnabled: false,
      whitelistingAdSpendEstimate: 0,
      whitelistingExpirationDays: 90,
      exclusivityType: 'named_competitors_30d',
      turnaroundWindow: 'standard_14d',
      includedRevisionRounds: 2,
      excessRevisionFeePerRound: 250,
    },
  },
];

export const CONTRACT_RED_FLAGS: ContractClause[] = [
  {
    clauseId: 1,
    clauseTitle: 'Undefined Payment Timing',
    category: 'Payment',
    severity: 'critical',
    redFlagPattern: 'Payment triggers tied to "final brand approval", "campaign completion", or Net-60/90 without a fixed invoice date.',
    advice:
      'Approval delays can push payouts to 90–120 days. Tie payment strictly to deliverable submission and embed statutory Net-14 / Net-30 protections (New York Freelance Isn’t Free Act mandates payment within 30 days for contracts >= $800).',
    replacementText:
      'Brand shall remit 100% of the Creation Fee within fourteen (14) calendar days of Creator’s delivery of the agreed Deliverables (or 50% upon execution and 50% within 14 days of delivery). If Brand does not provide feedback within five (5) business days of submission, Deliverables are deemed approved and the invoice becomes immediately payable.',
  },
  {
    clauseId: 2,
    clauseTitle: 'Performance-Only Contingency',
    category: 'Payment',
    severity: 'critical',
    redFlagPattern: 'Compensation structured purely as affiliate commission, CPA, or conditional upon hitting view/conversion minimums.',
    advice:
      'Creative production, filming, editing, and audience access incur real labor and opportunity costs regardless of algorithmic fluctuations. Never accept 100% performance-only deals without a guaranteed base creation fee.',
    replacementText:
      'Creator’s Base Creation Fee is fully earned upon production and publication of the Deliverables and is not contingent upon impressions, clicks, conversions, sales volume, or algorithmic distribution. Any performance bonus or affiliate commission shall be strictly additive to the guaranteed Base Creation Fee.',
  },
  {
    clauseId: 3,
    clauseTitle: 'Conditional "Pay-When-Paid" Payouts',
    category: 'Payment',
    severity: 'critical',
    redFlagPattern: 'Agency agreements stating Creator will be paid only "after Agency receives funds from End-Client."',
    advice:
      'Independent creators should never act as unsecured creditors for an agency’s client credit risk. Payment obligation must rest unconditionally on the contracting entity.',
    replacementText:
      'Agency’s obligation to pay Creator under this Agreement is unconditional and shall not be delayed, reduced, or conditioned upon Agency’s receipt of payment from any End-Client or third party.',
  },
  {
    clauseId: 4,
    clauseTitle: 'Work Made for Hire / IP Stripping',
    category: 'Rights & IP',
    severity: 'critical',
    redFlagPattern: 'Terms classifying deliverables as "work made for hire" or assigning full copyright ownership to the brand.',
    advice:
      'Under US copyright law, independent creator authorship lasts life plus 70 years. Assigning copyright strips you of your own footage and blocks future licensing renewals.',
    replacementText:
      'Creator retains sole and exclusive copyright, title, and ownership of all Deliverables, raw footage, and underlying intellectual property. Subject to full payment, Creator grants Brand only a limited, non-exclusive, non-transferable license strictly for the Term and Territory specified in the Scope Schedule.',
  },
  {
    clauseId: 5,
    clauseTitle: 'Perpetual Usage Rights',
    category: 'Rights & IP',
    severity: 'critical',
    redFlagPattern: 'Licenses granted "in perpetuity, worldwide, across all media now known or hereafter devised."',
    advice:
      'Perpetual commercial usage lets a brand run your face and voice in paid ads forever without renewal fees. Counter with a fixed 30-to-90-day license or enforce the mandatory 350% buyout surcharge.',
    replacementText:
      'Paid digital advertising usage rights are granted strictly for [30 / 90] days from the date of first commercial ad deployment. Any continuation beyond the initial Term requires written renewal and payment of an additional licensing fee equal to [25% / 50%] of the Base Creation Fee per renewal period.',
  },
  {
    clauseId: 6,
    clauseTitle: 'Uncapped Whitelisting / Ad Access',
    category: 'Rights & IP',
    severity: 'warning',
    redFlagPattern: 'Open-ended Spark Ads or Meta Partnership permissions with no expiration date or ad spend limit.',
    advice:
      'Whitelisting turns your personal handle into a paid ad vehicle. Always enforce an explicit authorization expiration date and separate monthly/percentage compensation.',
    replacementText:
      'Whitelisting / Partnership Ad authorization (TikTok Spark Ads / Meta Partnership Ads) is granted solely for [30 / 90] days ending on [Expiration Date], at which point Creator may revoke ad-account access automatically. Whitelisting is billed separately at 20% of Base Fee or 15% of monthly ad spend, whichever is greater.',
  },
  {
    clauseId: 7,
    clauseTitle: 'Premature Usage Clock',
    category: 'Rights & IP',
    severity: 'warning',
    redFlagPattern: 'Licensing term starts "upon contract signature" rather than when the ad actually goes live.',
    advice:
      'If production and brand legal review take 45 days, a 90-day license measured from signing leaves ambiguity or premature expiration—or worse, lets brands delay launch while keeping perpetual organic drafts.',
    replacementText:
      'The Usage Term shall commence on the date Deliverables are first published or deployed in paid media by Brand ("Launch Date") and expire automatically upon completion of the specified Usage Term.',
  },
  {
    clauseId: 8,
    clauseTitle: 'Broad Blanket Exclusivity',
    category: 'Exclusivity',
    severity: 'critical',
    redFlagPattern: 'Bans working with "any competing products or services" without naming specific competitors.',
    advice:
      'Vague category exclusivity can lock you out of your primary income vertical for months. Restrict exclusivity strictly to 3 named direct commercial competitors.',
    replacementText:
      'During the Exclusivity Period of [30 / 60] days from publication, Creator agrees not to publish sponsored content for the following three (3) named direct competitors only: [Competitor 1], [Competitor 2], and [Competitor 3]. All other brands and adjacent sub-categories remain unrestricted.',
  },
  {
    clauseId: 9,
    clauseTitle: 'Post-Termination Non-Compete',
    category: 'Exclusivity',
    severity: 'warning',
    redFlagPattern: 'Exclusivity obligations surviving expiration or early termination of the sponsorship agreement.',
    advice:
      'If a brand cancels or concludes a campaign, they cannot continue restricting your livelihood without ongoing exclusivity retainer fees.',
    replacementText:
      'All exclusivity restrictions terminate immediately upon expiration of the paid Exclusivity Period or upon any early termination of this Agreement without fault by Creator.',
  },
  {
    clauseId: 10,
    clauseTitle: 'Unlimited Revisions ("Until Satisfied")',
    category: 'Liability & Scope',
    severity: 'warning',
    redFlagPattern: 'Requirement to edit and re-shoot "until Brand is fully satisfied" with no numeric cap.',
    advice:
      'Unlimited revisions turn a flat creative fee into unpaid hourly labor. Cap included rounds at two (2) consolidated feedback passes and charge $150–$350 per extra round.',
    replacementText:
      'The Base Creation Fee includes up to two (2) rounds of consolidated, non-substantive edits consistent with the approved creative brief. Any additional revision rounds or reshoots requested outside the original brief shall be billed at $[200.00] per round.',
  },
  {
    clauseId: 11,
    clauseTitle: 'Indefinite Post Hosting Mandate',
    category: 'Rights & IP',
    severity: 'warning',
    redFlagPattern: 'Mandate that Creator keep the sponsored post live on their public feed "forever" or "in perpetuity."',
    advice:
      'Creator feeds evolve and algorithms shift. Commit to keeping posts live and public for 12 months (365 days), after which Creator may archive at their discretion.',
    replacementText:
      'Creator shall keep the organic Deliverables published and publicly visible on Creator’s channel for a minimum of three hundred sixty-five (365) days following the initial post date, after which Creator may archive or remove the post without penalty.',
  },
  {
    clauseId: 12,
    clauseTitle: 'Cancellation Without Kill Fee',
    category: 'Payment',
    severity: 'critical',
    redFlagPattern: 'Brand may terminate "for convenience at any time" with zero payment for work already scheduled or filmed.',
    advice:
      'Once you book campaign dates and turn down competing inquiries, last-minute cancellation causes direct lost revenue. Enforce a 50% / 100% milestone kill fee.',
    replacementText:
      'If Brand cancels for convenience after Agreement execution but prior to content submission, Brand shall pay a non-refundable Kill Fee equal to 50% of the Total Fee. If cancelled after Creator has submitted initial drafts or filmed Deliverables, 100% of the Total Fee is due immediately.',
  },
  {
    clauseId: 13,
    clauseTitle: 'One-Sided Morality Clause',
    category: 'Liability & Scope',
    severity: 'warning',
    redFlagPattern: 'Brand may claw back fees for subjective "reputational harm" with no reciprocal protection for Creator.',
    advice:
      'Creators face equal reputational risk if a brand experiences a product recall, regulatory action, or public scandal. Morality clauses must be mutual and tied to verified misconduct.',
    replacementText:
      'Either party may terminate this Agreement upon written notice if the other party commits a felony or engages in verified public misconduct that causes material reputational harm. Creator retains all fees earned for Deliverables already produced prior to termination.',
  },
  {
    clauseId: 14,
    clauseTitle: 'Uncapped Indemnification',
    category: 'Liability & Scope',
    severity: 'critical',
    redFlagPattern: 'Creator indemnifies Brand against all third-party claims, legal fees, and consequential damages with no dollar cap.',
    advice:
      'An uncapped indemnity exposes your personal assets to corporate lawsuits over brand-supplied claims or product defects. Cap creator liability strictly at total fees actually paid.',
    replacementText:
      'Brand shall indemnify Creator against any claims arising from Brand’s products, services, or Brand-supplied talking points. Creator’s maximum aggregate liability under this Agreement for any claim shall not exceed the total fees actually paid to Creator hereunder.',
  },
  {
    clauseId: 15,
    clauseTitle: 'FTC Disclosure Suppression',
    category: 'Liability & Scope',
    severity: 'critical',
    redFlagPattern: 'Instructions to hide "#ad", bury disclosures below "See More", or present paid content as an organic review.',
    advice:
      'Failing to clearly and conspicuously disclose material connections exposes both brands and creators to FTC civil penalties up to $53,088 per violation.',
    replacementText:
      'Creator and Brand agree to comply strictly with the FTC Endorsement Guides (16 CFR Part 255). All Deliverables shall include clear, unavoidable disclosures (such as "#ad" or platform Paid Partnership labels) placed above the fold and audibly/visually in video.',
  },
];
