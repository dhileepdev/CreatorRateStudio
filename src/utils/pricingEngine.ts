import {
  CURRENCY_SPECS,
  EXCLUSIVITY_SPECS,
  INDUSTRY_TIER_BENCHMARKS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import {
  BenchmarkDeviation,
  CalculatedDealResult,
  CampaignRoiEstimate,
  ClauseCategory,
  ContractClause,
  ContractRiskAssessment,
  ContractRiskLevel,
  CreatorProfile,
  CurrencyCode,
  CurrencySpec,
  DealScope,
  DealWarning,
  EmailScenarioId,
  LegalLibraryEntry,
  LegalTermAuditEvaluation,
  PerformanceProjection,
  SavedDealSnapshot,
} from '../types/calculator';

const liveExchangeRates: Partial<Record<CurrencyCode, number>> = {};

export function setLiveExchangeRates(
  rates: Partial<Record<CurrencyCode, number>>
): void {
  for (const [code, rate] of Object.entries(rates)) {
    const key = code as CurrencyCode;
    if (
      key in CURRENCY_SPECS &&
      typeof rate === 'number' &&
      Number.isFinite(rate) &&
      rate > 0
    ) {
      liveExchangeRates[key] = key === 'USD' ? 1.0 : rate;
    }
  }
}

export function getCurrencySpec(currency: CurrencyCode = 'USD'): CurrencySpec {
  const baseSpec = CURRENCY_SPECS[currency] ?? CURRENCY_SPECS.USD;
  const liveRate = liveExchangeRates[baseSpec.code];
  if (typeof liveRate === 'number' && Number.isFinite(liveRate) && liveRate > 0) {
    return {
      ...baseSpec,
      rateFromUsd: liveRate,
    };
  }
  return baseSpec;
}

export function convertUsdToCurrency(
  amountUsd: number,
  currency: CurrencyCode = 'USD'
): number {
  const spec = getCurrencySpec(currency);
  const converted = amountUsd * spec.rateFromUsd;
  return spec.decimals === 0 ? Math.round(converted) : converted;
}

export function formatCurrency(
  amountUsd: number,
  currency: CurrencyCode = 'USD'
): string {
  const spec = getCurrencySpec(currency);
  const converted = convertUsdToCurrency(amountUsd, currency);
  const isWhole = Math.abs(converted - Math.round(converted)) < 0.005;
  const maxFrac = spec.decimals;
  const minFrac = spec.decimals === 0 || isWhole ? 0 : spec.decimals;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: spec.code,
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  }).format(isWhole && maxFrac > 0 ? Math.round(converted) : converted);
}

export function formatCurrencyExact(
  amountUsd: number,
  currency: CurrencyCode = 'USD'
): string {
  const spec = getCurrencySpec(currency);
  const converted = convertUsdToCurrency(amountUsd, currency);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: spec.code,
    minimumFractionDigits: spec.decimals,
    maximumFractionDigits: spec.decimals,
  }).format(converted);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function getEngagementCoefficient(erPercent: number): {
  multiplier: number;
  label: string;
} {
  if (erPercent >= 8.0) {
    return { multiplier: 1.3, label: 'High Commercial Intent (+30%)' };
  }
  if (erPercent >= 4.0) {
    return { multiplier: 1.15, label: 'Above-Average Engagement (+15%)' };
  }
  if (erPercent >= 2.0) {
    return { multiplier: 1.0, label: 'Standard Industry Baseline (1.00x)' };
  }
  return { multiplier: 0.85, label: 'Low Conversion Risk (-15%)' };
}

export function getFollowerTier(followers: number): CalculatedDealResult['followerTier'] {
  const found =
    INDUSTRY_TIER_BENCHMARKS.find(
      (row) => followers >= row.minFollowers && followers <= row.maxFollowers
    ) ?? INDUSTRY_TIER_BENCHMARKS[0];
  return {
    id: found.id,
    label: found.tierName,
    rangeLabel: found.followerRange,
  };
}

export function calculateDealRate(
  profile: CreatorProfile,
  scope: DealScope
): CalculatedDealResult {
  const nicheSpec = NICHE_BENCHMARKS[profile.niche];
  const platformSpec = PLATFORM_SPECS[profile.platform];

  const activeCpm =
    profile.customCpm !== null && profile.customCpm > 0
      ? profile.customCpm
      : nicheSpec.defaultCpm;

  const platformMultiplier =
    profile.platform === 'youtube_longform'
      ? Math.min(6.0, Math.max(4.0, profile.youtubeMultiplier || 5.0))
      : platformSpec.multiplier;

  const safeMedianViews = Math.max(0, profile.medianViews);
  const safeFollowers = Math.max(0, profile.followerCount);

  const totalHighIntentEngagements =
    Math.max(0, profile.engagementMetrics.comments) +
    Math.max(0, profile.engagementMetrics.shares) +
    Math.max(0, profile.engagementMetrics.saves);

  const calculatedER =
    safeMedianViews > 0 ? (totalHighIntentEngagements / safeMedianViews) * 100 : 0;

  const { multiplier: engagementMultiplier, label: engagementTierLabel } =
    getEngagementCoefficient(calculatedER);

  const rawReachValue =
    (safeMedianViews / 1000) * activeCpm * platformMultiplier * engagementMultiplier;

  // Enforce minimum $100.00 equitable production baseline floor when user floor is lower
  const requestedFloor = Math.max(0, profile.productionFloorCost);
  const effectiveFloorCost = Math.max(100, requestedFloor);
  const floorEnforced = requestedFloor < 100 || rawReachValue < 100;

  const baseCreationFee = rawReachValue + effectiveFloorCost;

  // Contract Scope Rider Multipliers
  const usageSpec = USAGE_RIGHTS_SPECS[scope.usageRightsTerm];
  const usageMultiplier = usageSpec.multiplier;
  const usageRightsFee = baseCreationFee * usageMultiplier;

  let whitelistingFee = 0;
  let whitelistingBasis = 'Not included';
  if (scope.whitelistingEnabled) {
    const baseBasedFee = baseCreationFee * 0.2;
    const adSpendBasedFee = Math.max(0, scope.whitelistingAdSpendEstimate) * 0.15;
    if (adSpendBasedFee > baseBasedFee) {
      whitelistingFee = adSpendBasedFee;
      whitelistingBasis = `15% of ${formatCurrency(scope.whitelistingAdSpendEstimate)} ad spend`;
    } else {
      whitelistingFee = baseBasedFee;
      whitelistingBasis = '20% of Base Creation Fee';
    }
  }

  const exclusivitySpec = EXCLUSIVITY_SPECS[scope.exclusivityType];
  const exclusivityMultiplier = exclusivitySpec.multiplier;
  const exclusivityFee = baseCreationFee * exclusivityMultiplier;

  const rushFee = scope.turnaroundWindow === 'rush_under_5d' ? baseCreationFee * 0.25 : 0;

  const excessRevisionCount = Math.max(0, scope.includedRevisionRounds - 2);
  const excessRevisionsFee =
    excessRevisionCount * Math.max(150, scope.excessRevisionFeePerRound || 200);

  const totalCommercialRiders =
    usageRightsFee + whitelistingFee + exclusivityFee + rushFee + excessRevisionsFee;

  const totalRecommendedRate = baseCreationFee + totalCommercialRiders;

  // 15.3% US Self-Employment Tax Set-Aside (2026 OBBBA reminder)
  const estimatedSelfEmploymentTax = totalRecommendedRate * 0.153;
  const estimatedNetAfterSETax = totalRecommendedRate - estimatedSelfEmploymentTax;

  // Three-Tier Package Matrix (Fluencify Negotiation Framework)
  const tierA_Organic = {
    id: 'tierA' as const,
    name: 'Option A: Organic Distribution',
    subtitle: 'Entry scope for lean brand budgets without paid ad rights',
    deliverables: [
      platformSpec.deliverableUnit,
      'Up to 2 consolidated revision rounds included',
      'Standard 14-day turnaround window',
    ],
    usageSummary: 'Organic brand profile reposting for 30 days. No paid advertising usage.',
    exclusivitySummary: 'None (Creator retains full category freedom)',
    fee: baseCreationFee,
    lineItems: [{ label: 'Base Creation Fee', amount: baseCreationFee }],
  };

  const tierB_Usage90 = baseCreationFee * 0.5;
  const tierB_Excl30 = baseCreationFee * 0.3;
  const tierB_StandardGrowth = {
    id: 'tierB' as const,
    name: 'Option B: Standard Commercial Growth',
    subtitle: 'Recommended anchor balancing creative ROI and paid distribution',
    recommended: true,
    deliverables: [
      platformSpec.deliverableUnit,
      '1 Cutdown / Hook Variation asset for brand paid ads',
      'Up to 2 consolidated revision rounds included',
    ],
    usageSummary: '90-Day Paid Social Ad Usage across Meta & TikTok.',
    exclusivitySummary: '30-Day Named Direct Competitor Exclusivity (max 3 brands).',
    fee: baseCreationFee + tierB_Usage90 + tierB_Excl30,
    lineItems: [
      { label: 'Base Creation Fee', amount: baseCreationFee },
      { label: '90-Day Paid Ad Usage (50%)', amount: tierB_Usage90 },
      { label: '30-Day Named Exclusivity (30%)', amount: tierB_Excl30 },
    ],
  };

  const tierC_Usage180 = baseCreationFee * 0.85;
  const tierC_Whitelisting = Math.max(
    baseCreationFee * 0.2,
    Math.max(0, scope.whitelistingAdSpendEstimate) * 0.15
  );
  const tierC_Excl60 = baseCreationFee * 0.6;
  const tierC_FullScale = {
    id: 'tierC' as const,
    name: 'Option C: Comprehensive Scale & Whitelisting',
    subtitle: 'Full-funnel paid acquisition rights with creator handle authority',
    deliverables: [
      `Full Campaign Package (${platformSpec.shortLabel})`,
      'Clean raw footage + 3-Frame Instagram Story sequence',
      'Whitelisting / Spark Ad handle authorization',
    ],
    usageSummary: '180-Day Paid Social Ad Usage + Handle Whitelisting.',
    exclusivitySummary: '60-Day Named Direct Competitor Exclusivity (max 3 brands).',
    fee: baseCreationFee + tierC_Usage180 + tierC_Whitelisting + tierC_Excl60,
    lineItems: [
      { label: 'Base Creation Fee', amount: baseCreationFee },
      { label: '180-Day Paid Ad Usage (85%)', amount: tierC_Usage180 },
      { label: 'Handle Whitelisting Access (20%+)', amount: tierC_Whitelisting },
      { label: '60-Day Named Exclusivity (60%)', amount: tierC_Excl60 },
    ],
  };

  // Defensive Guardrails & Edge-Case Warnings
  const warnings: DealWarning[] = [];

  if (safeFollowers > 0 && safeMedianViews > safeFollowers * 10) {
    warnings.push({
      id: 'viral_anomaly',
      severity: 'warning',
      title: 'Viral View Anomaly Detected (>1,000% of Followers)',
      message:
        'Your entered median views exceed total followers by more than 1,000%. Confirm this figure represents your median across your last 10–15 non-viral posts rather than a single outlier.',
      actionHint: 'Use median (not mean) across 10–15 recent posts for defensible quoting.',
    });
  }

  if (safeFollowers > 100000 && safeMedianViews > 0 && safeMedianViews < 5000) {
    warnings.push({
      id: 'reach_decay',
      severity: 'info',
      title: 'Reach-to-Follower Discrepancy (>100K Followers, <5K Views)',
      message:
        'Pricing strictly by follower count would overquote relative to current organic feed velocity. Quote transparently on verified median views and monetize commercial value via paid ad usage and whitelisting riders.',
    });
  }

  if (rawReachValue < 100) {
    warnings.push({
      id: 'production_floor',
      severity: 'info',
      title: 'Equitable $100 Production Floor Active',
      message: `Pure view-based reach value (${formatCurrencyExact(rawReachValue)}) sits below production overhead. The $100.00 minimum production floor protects your filming, editing, and equipment time.`,
    });
  }

  if (scope.usageRightsTerm === 'perpetual_buyout') {
    warnings.push({
      id: 'perpetual_buyout',
      severity: 'critical',
      title: 'Perpetual Commercial Rights Buyout Warning',
      message:
        'Warning: Granting perpetual commercial rights transfers indefinite likeness and content exploitation rights. A mandatory 350% buyout surcharge has been applied. We strongly recommend countering with a 90-day renewable license.',
      actionHint: 'Counter with 90-day renewable license (+50%)',
    });
  }

  if (scope.exclusivityType === 'blanket_vertical_prohibition') {
    warnings.push({
      id: 'blanket_exclusivity',
      severity: 'critical',
      title: 'Broad Industry Exclusivity Warning',
      message:
        'Blanket vertical exclusivity blocks your primary sponsorship income across an entire category. A 200% penalty surcharge has been added. Narrow this clause to 3 named direct competitors.',
      actionHint: 'Use the "Defend Exclusivity Pricing" script below',
    });
  }

  return {
    breakdown: {
      activeCpm,
      platformMultiplier,
      rawReachValue,
      calculatedER,
      engagementTierLabel,
      engagementMultiplier,
      effectiveFloorCost,
      floorEnforced,
      baseCreationFee,
      usageRightsFee,
      usageMultiplier,
      whitelistingFee,
      whitelistingBasis,
      exclusivityFee,
      exclusivityMultiplier,
      rushFee,
      excessRevisionsFee,
      excessRevisionCount,
      totalCommercialRiders,
      totalRecommendedRate,
      estimatedSelfEmploymentTax,
      estimatedNetAfterSETax,
    },
    followerTier: getFollowerTier(safeFollowers),
    tieredPackages: {
      tierA_Organic,
      tierB_StandardGrowth,
      tierC_FullScale,
    },
    warnings,
  };
}

export function generateRateCardMarkdown(
  profile: CreatorProfile,
  scope: DealScope,
  result: CalculatedDealResult,
  currency: CurrencyCode = 'USD'
): string {
  const platform = PLATFORM_SPECS[profile.platform];
  const niche = NICHE_BENCHMARKS[profile.niche];
  const usage = USAGE_RIGHTS_SPECS[scope.usageRightsTerm];
  const exclusivity = EXCLUSIVITY_SPECS[scope.exclusivityType];

  return [
    `# Sponsorship Rate Card & Scope Proposal (${currency})`,
    ``,
    `**Channel Profile:** ${platform.label} · ${niche.label}`,
    `**Verified Reach Baseline:** ${formatNumber(profile.medianViews)} median views (last 10–15 posts) · ${result.breakdown.calculatedER.toFixed(1)}% High-Intent Engagement Rate`,
    ``,
    `## Requested Scope Quote: ${formatCurrencyExact(result.breakdown.totalRecommendedRate, currency)}`,
    `- **Base Creation Fee (${platform.deliverableUnit}):** ${formatCurrencyExact(result.breakdown.baseCreationFee, currency)}`,
    `- **Paid Usage Rights (${usage.label}):** ${formatCurrencyExact(result.breakdown.usageRightsFee, currency)}`,
    scope.whitelistingEnabled
      ? `- **Whitelisting / Paid Boosting (${scope.whitelistingExpirationDays}-day cap):** ${formatCurrencyExact(result.breakdown.whitelistingFee, currency)}`
      : `- **Whitelisting:** Not included`,
    `- **Category Exclusivity (${exclusivity.label}):** ${formatCurrencyExact(result.breakdown.exclusivityFee, currency)}`,
    scope.turnaroundWindow === 'rush_under_5d'
      ? `- **Rush Delivery (<5 business days):** ${formatCurrencyExact(result.breakdown.rushFee, currency)}`
      : null,
    result.breakdown.excessRevisionCount > 0
      ? `- **Additional Revision Rounds (+${result.breakdown.excessRevisionCount} beyond 2-round cap):** ${formatCurrencyExact(result.breakdown.excessRevisionsFee, currency)}`
      : `- **Revisions:** Up to 2 consolidated rounds included`,
    ``,
    `## Three-Tier Partnership Options`,
    `1. **${result.tieredPackages.tierA_Organic.name} — ${formatCurrencyExact(result.tieredPackages.tierA_Organic.fee, currency)}**`,
    `   - ${result.tieredPackages.tierA_Organic.usageSummary} Exclusivity: ${result.tieredPackages.tierA_Organic.exclusivitySummary}`,
    `2. **${result.tieredPackages.tierB_StandardGrowth.name} — ${formatCurrencyExact(result.tieredPackages.tierB_StandardGrowth.fee, currency)}**`,
    `   - ${result.tieredPackages.tierB_StandardGrowth.usageSummary} Exclusivity: ${result.tieredPackages.tierB_StandardGrowth.exclusivitySummary}`,
    `3. **${result.tieredPackages.tierC_FullScale.name} — ${formatCurrencyExact(result.tieredPackages.tierC_FullScale.fee, currency)}**`,
    `   - ${result.tieredPackages.tierC_FullScale.usageSummary} Exclusivity: ${result.tieredPackages.tierC_FullScale.exclusivitySummary}`,
    ``,
    `*Standard Terms: Net-14 payment upon deliverable submission · 50%/100% milestone kill fee · FTC #ad compliance required.*`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function generateNegotiationEmail(params: {
  scenario: EmailScenarioId;
  brandName: string;
  creatorName: string;
  offeredBudget: number;
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
  flaggedClauses: ContractClause[];
  currency?: CurrencyCode;
}): { subject: string; body: string } {
  const {
    scenario,
    brandName,
    creatorName,
    offeredBudget,
    profile,
    scope,
    result,
    flaggedClauses,
    currency = 'USD',
  } = params;
  const fmt = (val: number) => formatCurrencyExact(val, currency);
  const brand = brandName.trim() || '[Brand Name]';
  const creator = creatorName.trim() || '[Your Name]';
  const platform = PLATFORM_SPECS[profile.platform];
  const { tierA_Organic, tierB_StandardGrowth, tierC_FullScale } = result.tieredPackages;
  const b = result.breakdown;

  const flaggedSummary =
    flaggedClauses.length > 0
      ? `\n\nIn reviewing the draft agreement, I also noted ${flaggedClauses.length} standard redline item${flaggedClauses.length > 1 ? 's' : ''} (${flaggedClauses.map((c) => c.clauseTitle).join(', ')}) that I'd like to align on—happy to share clean replacement wording once we confirm scope.`
      : '';

  switch (scenario) {
    case 'three_tier_anchor':
      return {
        subject: `Partnership Proposal & Scope Options — ${brand} x ${creator}`,
        body: `Hi ${brand} Team,

Thank you for reaching out—I'd love to collaborate on an upcoming ${platform.shortLabel} campaign.

Based on my verified median reach of ${formatNumber(profile.medianViews)} views per post and ${b.calculatedER.toFixed(1)}% high-intent engagement rate (saves, shares, and comments), I've structured three partnership options so you can select the commercial rights and distribution level that best fits your campaign goals:

1. ${tierA_Organic.name}: ${fmt(tierA_Organic.fee)}
   • Deliverables: ${platform.deliverableUnit}
   • Usage: 30-day organic reposting only (no paid ad usage, no exclusivity)

2. ${tierB_StandardGrowth.name} (Recommended): ${fmt(tierB_StandardGrowth.fee)}
   • Deliverables: ${platform.deliverableUnit} + 1 ad cutdown asset
   • Usage & Rights: 90-day paid social ad usage + 30-day exclusivity (up to 3 named direct competitors)

3. ${tierC_FullScale.name}: ${fmt(tierC_FullScale.fee)}
   • Deliverables: Full campaign package + clean raw footage + 3-frame Story sequence
   • Usage & Rights: 180-day paid ad usage + handle whitelisting + 60-day named competitor exclusivity

All packages include up to 2 consolidated revision rounds and standard Net-14 payment terms upon delivery.${flaggedSummary}

Let me know which option aligns best with your Q4 objectives and I can send over production dates.

Best,
${creator}`,
      };

    case 'lowball_pushback':
      return {
        subject: `Re: ${brand} Partnership Scope & Budget Alignment`,
        body: `Hi ${brand} Team,

Thank you for sharing your target budget of ${fmt(offeredBudget > 0 ? offeredBudget : b.baseCreationFee * 0.6)} for the ${platform.label} collaboration.

To keep pricing fair and consistent across partners, my Base Creation Fee for ${platform.deliverableUnit}—reflecting ${formatNumber(profile.medianViews)} median views and ${b.calculatedER.toFixed(1)}% audience engagement—is ${fmt(b.baseCreationFee)}. The full requested scope including commercial rights (${USAGE_RIGHTS_SPECS[scope.usageRightsTerm].label}${scope.whitelistingEnabled ? ', whitelisting' : ''}${scope.exclusivityType !== 'none' ? ', and exclusivity' : ''}) totals ${fmt(b.totalRecommendedRate)}.

Rather than discounting production quality, I'd be happy to unbundle the commercial add-ons to fit closer to your target budget:
• Option 1 — Organic Distribution Only (${fmt(tierA_Organic.fee)}): Removes paid ad licensing and exclusivity while delivering the core organic post.
• Option 2 — Phased Licensing: Start at ${fmt(b.baseCreationFee)} for organic production, with an optional 30-day paid ad extension (${fmt(b.baseCreationFee * 0.25)}) triggered only if the creative hits your performance benchmarks.${flaggedSummary}

Let me know which structure works best for your team!

Best,
${creator}`,
      };

    case 'reject_perpetual':
      return {
        subject: `Re: ${brand} Agreement — Usage Term & Licensing Alignment`,
        body: `Hi ${brand} Team,

I'm excited to move forward on the ${platform.label} deliverable. While reviewing the agreement, I noticed the usage clause currently grants perpetual, worldwide commercial rights.

My standard Base Creation Fee of ${fmt(b.baseCreationFee)} covers creative production and organic posting. Because perpetual rights permanently transfer commercial exploitation of my likeness and prevent future licensing renewals, a full perpetual IP buyout carries a 350% buyout fee (${fmt(b.baseCreationFee * 3.5)}), bringing the total buyout package to ${fmt(b.baseCreationFee * 4.5)}.

Most brand partners prefer a fixed-term license, which keeps costs significantly lower:
• 90-Day Paid Digital Ad Usage: +${fmt(b.baseCreationFee * 0.5)} (Total: ${fmt(b.baseCreationFee * 1.5)})
• Guaranteed Renewal Rate: Locked in at 50% of Base Fee per additional 90-day window if the ad performs well, commencing on the date of first commercial ad deployment.

Please let me know if you'd like to update Section [Usage Rights] to the 90-day renewable license so we can lock in filming dates.${flaggedSummary}

Best,
${creator}`,
      };

    case 'defend_exclusivity':
      return {
        subject: `Re: ${brand} Category Exclusivity Scope`,
        body: `Hi ${brand} Team,

Thanks for sending over the brief! Regarding the category exclusivity request: because brand partnerships across ${NICHE_BENCHMARKS[profile.niche].label} represent my primary studio revenue, any category blackout carries a direct opportunity cost by requiring me to turn down incoming campaigns.

To keep your budget focused on campaign performance while protecting your competitive positioning, I recommend two adjustments:
1. Narrow the restriction from a blanket vertical prohibition (which carries a 200% opportunity-cost surcharge of ${fmt(b.baseCreationFee * 2)}) to a list of three (3) named direct competitors: [Competitor 1], [Competitor 2], and [Competitor 3].
2. Align the exclusivity window to 30 days from publication (+30% of Base Fee = ${fmt(b.baseCreationFee * 0.3)}) or 60 days (+60% = ${fmt(b.baseCreationFee * 0.6)}), expiring automatically at the end of the term.

That brings the Base Fee (${fmt(b.baseCreationFee)}) + 30-Day Named Exclusivity (${fmt(b.baseCreationFee * 0.3)}) to ${fmt(b.baseCreationFee * 1.3)}.${flaggedSummary}

Happy to get those three competitor names inserted into the schedule today!

Best,
${creator}`,
      };

    case 'kill_fee_payment':
      return {
        subject: `Re: ${brand} Contract Terms — Payment Schedule & Kill Fee`,
        body: `Hi ${brand} Team,

Before signing, I'd like to finalize three standard administrative terms so both our teams have clear expectations:

1. Payment Timing: Net-14 from deliverable submission (or 50% upon execution / 50% within 14 days of delivery), not conditioned on end-client disbursement or delayed review cycles. Brand feedback window is 5 business days per round.
2. Revision Cap: The ${fmt(b.baseCreationFee)} Base Fee includes 2 consolidated rounds of edits aligned with the approved brief; additional out-of-scope rounds are billed at ${fmt(scope.excessRevisionFeePerRound || 200)}/round.
3. Milestone Kill Fee: 50% of the total fee (${fmt(b.totalRecommendedRate * 0.5)}) upon cancellation after execution/scheduling, and 100% (${fmt(b.totalRecommendedRate)}) if cancelled after initial draft delivery.${flaggedSummary}

Once these updates are reflected in the PDF, I'm ready to sign and kick off pre-production.

Best,
${creator}`,
      };
  }
}

export function calculatePerformanceProjection(
  deal: SavedDealSnapshot
): PerformanceProjection {
  const { comments, shares, saves } = deal.profile.engagementMetrics;
  const totalEngagements = Math.max(0, comments) + Math.max(0, shares) + Math.max(0, saves);
  const calculatedER = deal.result.breakdown.calculatedER;
  const totalRate = deal.result.breakdown.totalRecommendedRate;

  // High-intent actions (saves, shares, comments) convert at rates scaling with engagement quality
  let engagementCaptureRate = 0.025;
  if (calculatedER >= 8.0) {
    engagementCaptureRate = 0.06;
  } else if (calculatedER >= 4.0) {
    engagementCaptureRate = 0.045;
  } else if (calculatedER >= 2.0) {
    engagementCaptureRate = 0.035;
  }

  const projectedConversions = Math.round(totalEngagements * engagementCaptureRate);
  const projectedCpa =
    projectedConversions > 0 ? totalRate / projectedConversions : 0;

  const hasValidTargetCpa =
    typeof deal.targetCpa === 'number' &&
    Number.isFinite(deal.targetCpa) &&
    deal.targetCpa > 0;
  const targetCpa = hasValidTargetCpa ? (deal.targetCpa as number) : null;

  const breakEvenConversions =
    targetCpa !== null ? Math.ceil(totalRate / targetCpa) : null;

  const requiredEngagementConversionRate =
    breakEvenConversions !== null && totalEngagements > 0
      ? (breakEvenConversions / totalEngagements) * 100
      : null;

  const meetsTargetCpa =
    breakEvenConversions !== null
      ? projectedConversions >= breakEvenConversions
      : null;

  return {
    totalEngagements,
    calculatedER,
    engagementCaptureRate,
    projectedConversions,
    projectedCpa,
    targetCpa,
    breakEvenConversions,
    requiredEngagementConversionRate,
    meetsTargetCpa,
  };
}

export function calculateCampaignRoi(params: {
  profile: CreatorProfile;
  result: CalculatedDealResult;
  targetCpaUsd: number;
  avgOrderValueUsd: number;
}): CampaignRoiEstimate {
  const { profile, result, targetCpaUsd, avgOrderValueUsd } = params;
  const dealRateUsd = Math.max(0, result.breakdown.totalRecommendedRate);
  const safeTargetCpa = Math.max(0.01, targetCpaUsd);
  const safeAov = Math.max(0, avgOrderValueUsd);

  const unitsAtTargetCpa = Math.ceil(dealRateUsd / safeTargetCpa);
  const revenueAtTargetCpa = unitsAtTargetCpa * safeAov;
  const roasAtTargetCpa = dealRateUsd > 0 ? revenueAtTargetCpa / dealRateUsd : 0;

  const { comments, shares, saves } = profile.engagementMetrics;
  const totalEngagements =
    Math.max(0, comments) + Math.max(0, shares) + Math.max(0, saves);
  const calculatedER = result.breakdown.calculatedER;

  let engagementCaptureRate = 0.025;
  if (calculatedER >= 8.0) {
    engagementCaptureRate = 0.06;
  } else if (calculatedER >= 4.0) {
    engagementCaptureRate = 0.045;
  } else if (calculatedER >= 2.0) {
    engagementCaptureRate = 0.035;
  }

  const projectedUnitsSold = Math.round(totalEngagements * engagementCaptureRate);
  const projectedRevenue = projectedUnitsSold * safeAov;
  const projectedRoas = dealRateUsd > 0 ? projectedRevenue / dealRateUsd : 0;
  const projectedCpaUsd =
    projectedUnitsSold > 0 ? dealRateUsd / projectedUnitsSold : 0;
  const meetsTargetCpa =
    projectedUnitsSold > 0 && projectedCpaUsd <= safeTargetCpa;

  return {
    dealRateUsd,
    targetCpaUsd: safeTargetCpa,
    avgOrderValueUsd: safeAov,
    unitsAtTargetCpa,
    revenueAtTargetCpa,
    roasAtTargetCpa,
    projectedUnitsSold,
    projectedRevenue,
    projectedRoas,
    projectedCpaUsd,
    engagementCaptureRate,
    totalEngagements,
    meetsTargetCpa,
  };
}

export function calculateNicheTierBenchmark(
  deal: SavedDealSnapshot
): BenchmarkDeviation {
  const tierId =
    deal.result?.followerTier?.id ?? getFollowerTier(deal.profile.followerCount).id;
  const tierRow =
    INDUSTRY_TIER_BENCHMARKS.find((row) => row.id === tierId) ??
    INDUSTRY_TIER_BENCHMARKS[0];
  const nicheSpec = NICHE_BENCHMARKS[deal.profile.niche];
  const platformSpec = PLATFORM_SPECS[deal.profile.platform];

  let tierPlatformBaseUsd = tierRow.instagramReelUsd;
  switch (deal.profile.platform) {
    case 'tiktok':
      tierPlatformBaseUsd = tierRow.tiktokVideoUsd;
      break;
    case 'youtube_longform':
      tierPlatformBaseUsd = tierRow.youtubeLongFormUsd;
      break;
    case 'instagram_story':
      tierPlatformBaseUsd = tierRow.instagramReelUsd * 0.35;
      break;
    case 'cross_post_bundle':
      tierPlatformBaseUsd = tierRow.instagramReelUsd * 1.4;
      break;
    case 'youtube_shorts':
    case 'instagram_reels':
    default:
      tierPlatformBaseUsd = tierRow.instagramReelUsd;
      break;
  }

  // Scale the general tier baseline ($30 broad CPM) by the deal's Niche default CPM
  const nicheScaleFactor = nicheSpec.defaultCpm / 30;
  const averageBenchmark =
    Math.round(tierPlatformBaseUsd * nicheScaleFactor * 100) / 100;

  const totalDealRate = deal.result.breakdown.totalRecommendedRate;
  const deviationAmount = totalDealRate - averageBenchmark;
  const deviationPct =
    averageBenchmark > 0 ? (deviationAmount / averageBenchmark) * 100 : 0;
  const isOutlier = Math.abs(deviationPct) > 25;
  const direction: BenchmarkDeviation['direction'] = isOutlier
    ? deviationPct > 0
      ? 'above'
      : 'below'
    : 'aligned';

  return {
    averageBenchmark,
    tierLabel: tierRow.tierName,
    nicheLabel: nicheSpec.label,
    platformLabel: platformSpec.shortLabel,
    deviationAmount,
    deviationPct,
    isOutlier,
    direction,
  };
}

export function generateComparisonMarkdown(
  deals: SavedDealSnapshot[],
  currency: CurrencyCode = 'USD'
): string {
  if (deals.length === 0) return '';
  const fmt = (val: number) => formatCurrencyExact(val, currency);
  const headers = ['Dimension', ...deals.map((d) => d.name)];
  const sep = headers.map(() => '---');
  const projections = deals.map((d) => calculatePerformanceProjection(d));
  const benchmarks = deals.map((d) => calculateNicheTierBenchmark(d));

  const rows: string[][] = [
    ['Platform', ...deals.map((d) => PLATFORM_SPECS[d.profile.platform].label)],
    ['Niche', ...deals.map((d) => NICHE_BENCHMARKS[d.profile.niche].label)],
    ['Median Views', ...deals.map((d) => formatNumber(d.profile.medianViews))],
    ['Engagement Rate', ...deals.map((d) => `${d.result.breakdown.calculatedER.toFixed(1)}%`)],
    ['Base Creation Fee', ...deals.map((d) => fmt(d.result.breakdown.baseCreationFee))],
    ['Paid Usage Rights', ...deals.map((d) => `${USAGE_RIGHTS_SPECS[d.scope.usageRightsTerm].label} (${fmt(d.result.breakdown.usageRightsFee)})`)],
    ['Whitelisting', ...deals.map((d) => (d.scope.whitelistingEnabled ? `Yes (${fmt(d.result.breakdown.whitelistingFee)})` : `No (${fmt(0)})`))],
    ['Exclusivity', ...deals.map((d) => `${EXCLUSIVITY_SPECS[d.scope.exclusivityType].label} (${fmt(d.result.breakdown.exclusivityFee)})`)],
    ['Total Recommended Rate', ...deals.map((d) => fmt(d.result.breakdown.totalRecommendedRate))],
    [
      'Niche/Tier Average Benchmark',
      ...benchmarks.map(
        (b) =>
          `${fmt(b.averageBenchmark)} (${b.deviationPct >= 0 ? '+' : ''}${b.deviationPct.toFixed(1)}%${
            b.isOutlier ? ' · >25% deviation' : ''
          })`
      ),
    ],
    ['Target CPA', ...projections.map((p) => (p.targetCpa !== null ? fmt(p.targetCpa) : 'Not set'))],
    [
      'Target Monthly Revenue',
      ...deals.map((d) =>
        typeof d.targetMonthlyRevenue === 'number' && d.targetMonthlyRevenue > 0
          ? fmt(d.targetMonthlyRevenue)
          : 'Not set'
      ),
    ],
    [
      'Deals Needed for Monthly Goal',
      ...deals.map((d) => {
        const rev = d.targetMonthlyRevenue;
        const rate = d.result.breakdown.totalRecommendedRate;
        if (typeof rev === 'number' && rev > 0 && rate > 0) {
          return `${Math.ceil(rev / rate)} deals/mo (${(rev / rate).toFixed(1)}x)`;
        }
        return '—';
      }),
    ],
    [
      'Performance Projection',
      ...projections.map((p) =>
        p.breakEvenConversions !== null
          ? `~${formatNumber(p.projectedConversions)} est. conv. (${formatNumber(p.breakEvenConversions)} needed @ ${fmt(p.targetCpa!)})`
          : `~${formatNumber(p.projectedConversions)} est. conv.`
      ),
    ],
    ['Option A (Organic)', ...deals.map((d) => fmt(d.result.tieredPackages.tierA_Organic.fee))],
    ['Option B (Growth)', ...deals.map((d) => fmt(d.result.tieredPackages.tierB_StandardGrowth.fee))],
    ['Option C (Scale)', ...deals.map((d) => fmt(d.result.tieredPackages.tierC_FullScale.fee))],
    ['Tags', ...deals.map((d) => (d.tags && d.tags.length > 0 ? d.tags.join(', ') : '—'))],
    ['Negotiation Notes', ...deals.map((d) => (d.notes?.trim() ? d.notes.replace(/\r?\n/g, ' ') : '—'))],
  ];

  return [
    `# Creator Rate Deal Comparison (${currency})`,
    ``,
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

const CLAUSE_PREDATORY_WEIGHTS: Record<number, number> = {
  1: 7, // Undefined Payment Timing
  2: 7, // Performance-Only Contingency
  3: 6, // Conditional Pay-When-Paid
  4: 9, // Work Made for Hire / IP Stripping
  5: 9, // Perpetual Usage Rights
  6: 4, // Uncapped Whitelisting
  7: 4, // Premature Usage Clock
  8: 7, // Broad Blanket Exclusivity
  9: 4, // Post-Termination Non-Compete
  10: 4, // Unlimited Revisions
  11: 4, // Indefinite Post Hosting
  12: 7, // Cancellation Without Kill Fee
  13: 3, // One-Sided Morality Clause
  14: 8, // Uncapped Indemnification
  15: 8, // FTC Disclosure Suppression
};

const ALL_CLAUSE_CATEGORIES: ClauseCategory[] = [
  'Payment',
  'Rights & IP',
  'Exclusivity',
  'Liability & Scope',
];

export function calculateContractRiskScore(
  flaggedClauses: ContractClause[],
  allClauses: ContractClause[] = []
): ContractRiskAssessment {
  const baseWeightSum = flaggedClauses.reduce(
    (sum, c) => sum + (CLAUSE_PREDATORY_WEIGHTS[c.clauseId] ?? (c.severity === 'critical' ? 7 : 4)),
    0
  );

  const distinctCategories = new Set(flaggedClauses.map((c) => c.category));
  const compoundBonus =
    distinctCategories.size > 1 ? Math.min(9, (distinctCategories.size - 1) * 3) : 0;

  const rawExposure = Math.min(100, baseWeightSum + compoundBonus);
  const score =
    flaggedClauses.length === 0
      ? 1
      : Math.min(100, Math.max(1, Math.round(1 + 99 * Math.pow(rawExposure / 100, 0.68))));

  let level: ContractRiskLevel = 'low';
  let levelLabel = 'Low Risk';
  let summary =
    'No predatory red-flag clauses selected. Standard contract hygiene check recommended.';

  if (score >= 75) {
    level = 'critical';
    levelLabel = 'Critical Risk';
    summary =
      'Severe predatory exposure across IP ownership, payout certainty, or legal liability. Do not sign without full replacement clauses.';
  } else if (score >= 50) {
    level = 'high';
    levelLabel = 'High Risk';
    summary =
      'High commercial risk from stacked predatory terms. Require redlines on flagged rights, payment, or indemnity clauses.';
  } else if (score >= 25) {
    level = 'moderate';
    levelLabel = 'Moderate Risk';
    summary =
      'Material red-flag clauses detected in your draft. Send replacement wording before executing the SOW.';
  } else if (flaggedClauses.length > 0) {
    summary =
      'Limited predatory exposure detected. Apply targeted redline fixes for the flagged item(s) below.';
  }

  const criticalCount = flaggedClauses.filter((c) => c.severity === 'critical').length;
  const warningCount = flaggedClauses.filter((c) => c.severity === 'warning').length;

  const categoryBreakdown = ALL_CLAUSE_CATEGORIES.map((category) => {
    const catFlagged = flaggedClauses.filter((c) => c.category === category);
    const catTotal = allClauses.filter((c) => c.category === category).length;
    const weightPoints = catFlagged.reduce(
      (sum, c) => sum + (CLAUSE_PREDATORY_WEIGHTS[c.clauseId] ?? 5),
      0
    );
    return {
      category,
      flaggedCount: catFlagged.length,
      totalCount: catTotal,
      weightPoints,
    };
  });

  const topDrivers = [...flaggedClauses]
    .map((c) => ({
      clauseId: c.clauseId,
      clauseTitle: c.clauseTitle,
      category: c.category,
      severity: c.severity,
      weightPoints:
        CLAUSE_PREDATORY_WEIGHTS[c.clauseId] ?? (c.severity === 'critical' ? 7 : 4),
    }))
    .sort((a, b) => b.weightPoints - a.weightPoints || a.clauseId - b.clauseId)
    .slice(0, 4);

  return {
    score,
    level,
    levelLabel,
    summary,
    criticalCount,
    warningCount,
    flaggedCount: flaggedClauses.length,
    categoryBreakdown,
    topDrivers,
  };
}

export function searchAndEvaluateLegalLibrary(params: {
  entries: LegalLibraryEntry[];
  allClauses: ContractClause[];
  flaggedClauseIds: number[];
  query: string;
  categoryFilter: 'All' | ClauseCategory;
}): LegalTermAuditEvaluation[] {
  const { entries, allClauses, flaggedClauseIds, query, categoryFilter } = params;
  const normalizedQuery = query.trim().toLowerCase();
  const tokens = normalizedQuery
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const flaggedSet = new Set(flaggedClauseIds);
  const currentFlaggedClauses = allClauses.filter((c) => flaggedSet.has(c.clauseId));
  const currentAssessment = calculateContractRiskScore(
    currentFlaggedClauses,
    allClauses
  );

  const scoredResults: Array<{
    evaluation: LegalTermAuditEvaluation;
    relevance: number;
  }> = [];

  for (const entry of entries) {
    if (categoryFilter !== 'All' && entry.category !== categoryFilter) {
      continue;
    }

    const clause = allClauses.find((c) => c.clauseId === entry.relatedClauseId);
    if (!clause) continue;

    let relevance = 1;
    if (tokens.length > 0) {
      const termLower = entry.term.toLowerCase();
      const aliasesLower = entry.aliases.map((a) => a.toLowerCase());
      const titleLower = clause.clauseTitle.toLowerCase();
      const haystack = [
        termLower,
        ...aliasesLower,
        entry.standardDefinition.toLowerCase(),
        entry.balancedStandard.toLowerCase(),
        titleLower,
        clause.redFlagPattern.toLowerCase(),
        clause.advice.toLowerCase(),
        entry.category.toLowerCase(),
      ].join(' ');

      const allTokensMatch = tokens.every((tok) => haystack.includes(tok));
      if (!allTokensMatch) {
        continue;
      }

      relevance = 0;
      if (termLower === normalizedQuery) {
        relevance += 100;
      } else if (termLower.startsWith(normalizedQuery)) {
        relevance += 60;
      } else if (termLower.includes(normalizedQuery)) {
        relevance += 40;
      }

      if (aliasesLower.some((a) => a === normalizedQuery)) {
        relevance += 75;
      } else if (aliasesLower.some((a) => a.includes(normalizedQuery))) {
        relevance += 35;
      }

      if (titleLower.includes(normalizedQuery)) {
        relevance += 30;
      }

      for (const tok of tokens) {
        if (termLower.includes(tok)) relevance += 12;
        if (aliasesLower.some((a) => a.includes(tok))) relevance += 8;
        if (clause.redFlagPattern.toLowerCase().includes(tok)) relevance += 4;
      }
    }

    const standaloneAssessment = calculateContractRiskScore([clause], allClauses);
    const isFlaggedInAudit = flaggedSet.has(clause.clauseId);

    const projectedClauses = isFlaggedInAudit
      ? currentFlaggedClauses
      : [...currentFlaggedClauses, clause];
    const projectedAssessment = calculateContractRiskScore(
      projectedClauses,
      allClauses
    );

    const auditScoreDelta = isFlaggedInAudit
      ? Math.max(
          0,
          currentAssessment.score -
            calculateContractRiskScore(
              currentFlaggedClauses.filter((c) => c.clauseId !== clause.clauseId),
              allClauses
            ).score
        )
      : Math.max(0, projectedAssessment.score - currentAssessment.score);

    const clauseWeightPoints =
      CLAUSE_PREDATORY_WEIGHTS[clause.clauseId] ??
      (clause.severity === 'critical' ? 7 : 4);

    scoredResults.push({
      relevance,
      evaluation: {
        entry,
        clause,
        isFlaggedInAudit,
        standaloneScore: standaloneAssessment.score,
        standaloneLevel: standaloneAssessment.level,
        standaloneLevelLabel: standaloneAssessment.levelLabel,
        clauseWeightPoints,
        projectedAuditScoreIfFlagged: projectedAssessment.score,
        auditScoreDelta,
      },
    });
  }

  if (tokens.length > 0) {
    scoredResults.sort(
      (a, b) =>
        b.relevance - a.relevance ||
        b.evaluation.clauseWeightPoints - a.evaluation.clauseWeightPoints ||
        a.evaluation.clause.clauseId - b.evaluation.clause.clauseId
    );
  }

  return scoredResults.map((item) => item.evaluation);
}

export interface InflationAdjustedDeal {
  result: CalculatedDealResult;
  multiplier: number;
  annualInflationPct: number;
  years: number;
  upliftAmount: number;
}

export function applyInflationAdjustment(
  baseResult: CalculatedDealResult,
  annualInflationPct: number,
  years = 1
): InflationAdjustedDeal {
  const safePct = Number.isFinite(annualInflationPct)
    ? Math.max(0, Math.min(50, annualInflationPct))
    : 0;
  const safeYears = Number.isFinite(years)
    ? Math.max(1, Math.min(10, Math.round(years)))
    : 1;
  const multiplier = Math.pow(1 + safePct / 100, safeYears);

  const scale = (amount: number) => Math.round(amount * multiplier * 100) / 100;
  const b = baseResult.breakdown;

  const totalRecommendedRate = scale(b.totalRecommendedRate);
  const upliftAmount = Math.max(0, totalRecommendedRate - b.totalRecommendedRate);
  const estimatedSelfEmploymentTax = totalRecommendedRate * 0.153;
  const estimatedNetAfterSETax =
    totalRecommendedRate - estimatedSelfEmploymentTax;

  const scaleTier = (
    tier: CalculatedDealResult['tieredPackages']['tierA_Organic']
  ) => {
    const baseFee = tier.fee;
    const adjustedFee = scale(baseFee);
    const tierUplift = Math.max(0, adjustedFee - baseFee);
    return {
      ...tier,
      fee: adjustedFee,
      lineItems:
        tierUplift > 0
          ? [
              ...tier.lineItems,
              {
                label: `Inflation Adjustment (+${safePct.toFixed(1)}% · ${safeYears}yr)`,
                amount: tierUplift,
              },
            ]
          : tier.lineItems,
    };
  };

  return {
    multiplier,
    annualInflationPct: safePct,
    years: safeYears,
    upliftAmount,
    result: {
      ...baseResult,
      breakdown: {
        ...b,
        activeCpm: scale(b.activeCpm),
        rawReachValue: scale(b.rawReachValue),
        effectiveFloorCost: scale(b.effectiveFloorCost),
        baseCreationFee: scale(b.baseCreationFee),
        usageRightsFee: scale(b.usageRightsFee),
        whitelistingFee: scale(b.whitelistingFee),
        exclusivityFee: scale(b.exclusivityFee),
        rushFee: scale(b.rushFee),
        excessRevisionsFee: scale(b.excessRevisionsFee),
        totalCommercialRiders: scale(b.totalCommercialRiders),
        totalRecommendedRate,
        estimatedSelfEmploymentTax,
        estimatedNetAfterSETax,
      },
      tieredPackages: {
        tierA_Organic: scaleTier(baseResult.tieredPackages.tierA_Organic),
        tierB_StandardGrowth: scaleTier(
          baseResult.tieredPackages.tierB_StandardGrowth
        ),
        tierC_FullScale: scaleTier(baseResult.tieredPackages.tierC_FullScale),
      },
    },
  };
}

