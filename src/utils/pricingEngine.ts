import {
  EXCLUSIVITY_SPECS,
  INDUSTRY_TIER_BENCHMARKS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import {
  CalculatedDealResult,
  ContractClause,
  CreatorProfile,
  DealScope,
  DealWarning,
  EmailScenarioId,
  PerformanceProjection,
  SavedDealSnapshot,
} from '../types/calculator';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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
  result: CalculatedDealResult
): string {
  const platform = PLATFORM_SPECS[profile.platform];
  const niche = NICHE_BENCHMARKS[profile.niche];
  const usage = USAGE_RIGHTS_SPECS[scope.usageRightsTerm];
  const exclusivity = EXCLUSIVITY_SPECS[scope.exclusivityType];

  return [
    `# Sponsorship Rate Card & Scope Proposal`,
    ``,
    `**Channel Profile:** ${platform.label} · ${niche.label}`,
    `**Verified Reach Baseline:** ${formatNumber(profile.medianViews)} median views (last 10–15 posts) · ${result.breakdown.calculatedER.toFixed(1)}% High-Intent Engagement Rate`,
    ``,
    `## Requested Scope Quote: ${formatCurrencyExact(result.breakdown.totalRecommendedRate)}`,
    `- **Base Creation Fee (${platform.deliverableUnit}):** ${formatCurrencyExact(result.breakdown.baseCreationFee)}`,
    `- **Paid Usage Rights (${usage.label}):** ${formatCurrencyExact(result.breakdown.usageRightsFee)}`,
    scope.whitelistingEnabled
      ? `- **Whitelisting / Paid Boosting (${scope.whitelistingExpirationDays}-day cap):** ${formatCurrencyExact(result.breakdown.whitelistingFee)}`
      : `- **Whitelisting:** Not included`,
    `- **Category Exclusivity (${exclusivity.label}):** ${formatCurrencyExact(result.breakdown.exclusivityFee)}`,
    scope.turnaroundWindow === 'rush_under_5d'
      ? `- **Rush Delivery (<5 business days):** ${formatCurrencyExact(result.breakdown.rushFee)}`
      : null,
    result.breakdown.excessRevisionCount > 0
      ? `- **Additional Revision Rounds (+${result.breakdown.excessRevisionCount} beyond 2-round cap):** ${formatCurrencyExact(result.breakdown.excessRevisionsFee)}`
      : `- **Revisions:** Up to 2 consolidated rounds included`,
    ``,
    `## Three-Tier Partnership Options`,
    `1. **${result.tieredPackages.tierA_Organic.name} — ${formatCurrencyExact(result.tieredPackages.tierA_Organic.fee)}**`,
    `   - ${result.tieredPackages.tierA_Organic.usageSummary} Exclusivity: ${result.tieredPackages.tierA_Organic.exclusivitySummary}`,
    `2. **${result.tieredPackages.tierB_StandardGrowth.name} — ${formatCurrencyExact(result.tieredPackages.tierB_StandardGrowth.fee)}**`,
    `   - ${result.tieredPackages.tierB_StandardGrowth.usageSummary} Exclusivity: ${result.tieredPackages.tierB_StandardGrowth.exclusivitySummary}`,
    `3. **${result.tieredPackages.tierC_FullScale.name} — ${formatCurrencyExact(result.tieredPackages.tierC_FullScale.fee)}**`,
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
  } = params;
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

1. ${tierA_Organic.name}: ${formatCurrencyExact(tierA_Organic.fee)}
   • Deliverables: ${platform.deliverableUnit}
   • Usage: 30-day organic reposting only (no paid ad usage, no exclusivity)

2. ${tierB_StandardGrowth.name} (Recommended): ${formatCurrencyExact(tierB_StandardGrowth.fee)}
   • Deliverables: ${platform.deliverableUnit} + 1 ad cutdown asset
   • Usage & Rights: 90-day paid social ad usage + 30-day exclusivity (up to 3 named direct competitors)

3. ${tierC_FullScale.name}: ${formatCurrencyExact(tierC_FullScale.fee)}
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

Thank you for sharing your target budget of ${formatCurrencyExact(offeredBudget > 0 ? offeredBudget : b.baseCreationFee * 0.6)} for the ${platform.label} collaboration.

To keep pricing fair and consistent across partners, my Base Creation Fee for ${platform.deliverableUnit}—reflecting ${formatNumber(profile.medianViews)} median views and ${b.calculatedER.toFixed(1)}% audience engagement—is ${formatCurrencyExact(b.baseCreationFee)}. The full requested scope including commercial rights (${USAGE_RIGHTS_SPECS[scope.usageRightsTerm].label}${scope.whitelistingEnabled ? ', whitelisting' : ''}${scope.exclusivityType !== 'none' ? ', and exclusivity' : ''}) totals ${formatCurrencyExact(b.totalRecommendedRate)}.

Rather than discounting production quality, I'd be happy to unbundle the commercial add-ons to fit closer to your target budget:
• Option 1 — Organic Distribution Only (${formatCurrencyExact(tierA_Organic.fee)}): Removes paid ad licensing and exclusivity while delivering the core organic post.
• Option 2 — Phased Licensing: Start at ${formatCurrencyExact(b.baseCreationFee)} for organic production, with an optional 30-day paid ad extension (${formatCurrencyExact(b.baseCreationFee * 0.25)}) triggered only if the creative hits your performance benchmarks.${flaggedSummary}

Let me know which structure works best for your team!

Best,
${creator}`,
      };

    case 'reject_perpetual':
      return {
        subject: `Re: ${brand} Agreement — Usage Term & Licensing Alignment`,
        body: `Hi ${brand} Team,

I'm excited to move forward on the ${platform.label} deliverable. While reviewing the agreement, I noticed the usage clause currently grants perpetual, worldwide commercial rights.

My standard Base Creation Fee of ${formatCurrencyExact(b.baseCreationFee)} covers creative production and organic posting. Because perpetual rights permanently transfer commercial exploitation of my likeness and prevent future licensing renewals, a full perpetual IP buyout carries a 350% buyout fee (${formatCurrencyExact(b.baseCreationFee * 3.5)}), bringing the total buyout package to ${formatCurrencyExact(b.baseCreationFee * 4.5)}.

Most brand partners prefer a fixed-term license, which keeps costs significantly lower:
• 90-Day Paid Digital Ad Usage: +${formatCurrencyExact(b.baseCreationFee * 0.5)} (Total: ${formatCurrencyExact(b.baseCreationFee * 1.5)})
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
1. Narrow the restriction from a blanket vertical prohibition (which carries a 200% opportunity-cost surcharge of ${formatCurrencyExact(b.baseCreationFee * 2)}) to a list of three (3) named direct competitors: [Competitor 1], [Competitor 2], and [Competitor 3].
2. Align the exclusivity window to 30 days from publication (+30% of Base Fee = ${formatCurrencyExact(b.baseCreationFee * 0.3)}) or 60 days (+60% = ${formatCurrencyExact(b.baseCreationFee * 0.6)}), expiring automatically at the end of the term.

That brings the Base Fee (${formatCurrencyExact(b.baseCreationFee)}) + 30-Day Named Exclusivity (${formatCurrencyExact(b.baseCreationFee * 0.3)}) to ${formatCurrencyExact(b.baseCreationFee * 1.3)}.${flaggedSummary}

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
2. Revision Cap: The ${formatCurrencyExact(b.baseCreationFee)} Base Fee includes 2 consolidated rounds of edits aligned with the approved brief; additional out-of-scope rounds are billed at ${formatCurrencyExact(scope.excessRevisionFeePerRound || 200)}/round.
3. Milestone Kill Fee: 50% of the total fee (${formatCurrencyExact(b.totalRecommendedRate * 0.5)}) upon cancellation after execution/scheduling, and 100% (${formatCurrencyExact(b.totalRecommendedRate)}) if cancelled after initial draft delivery.${flaggedSummary}

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

export function generateComparisonMarkdown(deals: SavedDealSnapshot[]): string {
  if (deals.length === 0) return '';
  const headers = ['Dimension', ...deals.map((d) => d.name)];
  const sep = headers.map(() => '---');
  const projections = deals.map((d) => calculatePerformanceProjection(d));

  const rows: string[][] = [
    ['Platform', ...deals.map((d) => PLATFORM_SPECS[d.profile.platform].label)],
    ['Niche', ...deals.map((d) => NICHE_BENCHMARKS[d.profile.niche].label)],
    ['Median Views', ...deals.map((d) => formatNumber(d.profile.medianViews))],
    ['Engagement Rate', ...deals.map((d) => `${d.result.breakdown.calculatedER.toFixed(1)}%`)],
    ['Base Creation Fee', ...deals.map((d) => formatCurrencyExact(d.result.breakdown.baseCreationFee))],
    ['Paid Usage Rights', ...deals.map((d) => `${USAGE_RIGHTS_SPECS[d.scope.usageRightsTerm].label} (${formatCurrencyExact(d.result.breakdown.usageRightsFee)})`)],
    ['Whitelisting', ...deals.map((d) => (d.scope.whitelistingEnabled ? `Yes (${formatCurrencyExact(d.result.breakdown.whitelistingFee)})` : 'No ($0)'))],
    ['Exclusivity', ...deals.map((d) => `${EXCLUSIVITY_SPECS[d.scope.exclusivityType].label} (${formatCurrencyExact(d.result.breakdown.exclusivityFee)})`)],
    ['Total Recommended Rate', ...deals.map((d) => formatCurrencyExact(d.result.breakdown.totalRecommendedRate))],
    ['Target CPA', ...projections.map((p) => (p.targetCpa !== null ? formatCurrencyExact(p.targetCpa) : 'Not set'))],
    [
      'Target Monthly Revenue',
      ...deals.map((d) =>
        typeof d.targetMonthlyRevenue === 'number' && d.targetMonthlyRevenue > 0
          ? formatCurrencyExact(d.targetMonthlyRevenue)
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
          ? `~${formatNumber(p.projectedConversions)} est. conv. (${formatNumber(p.breakEvenConversions)} needed @ ${formatCurrencyExact(p.targetCpa!)})`
          : `~${formatNumber(p.projectedConversions)} est. conv.`
      ),
    ],
    ['Option A (Organic)', ...deals.map((d) => formatCurrencyExact(d.result.tieredPackages.tierA_Organic.fee))],
    ['Option B (Growth)', ...deals.map((d) => formatCurrencyExact(d.result.tieredPackages.tierB_StandardGrowth.fee))],
    ['Option C (Scale)', ...deals.map((d) => formatCurrencyExact(d.result.tieredPackages.tierC_FullScale.fee))],
    ['Tags', ...deals.map((d) => (d.tags && d.tags.length > 0 ? d.tags.join(', ') : '—'))],
    ['Negotiation Notes', ...deals.map((d) => (d.notes?.trim() ? d.notes.replace(/\r?\n/g, ' ') : '—'))],
  ];

  return [
    `# Creator Rate Deal Comparison`,
    ``,
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}
