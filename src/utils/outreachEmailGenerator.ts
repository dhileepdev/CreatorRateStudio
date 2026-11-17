import {
  EXCLUSIVITY_SPECS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import {
  CurrencyCode,
  NegotiationCoachAnalysis,
  NegotiationCoachFocus,
  OutreachEmailTemplateId,
  SavedDealSnapshot,
} from '../types/calculator';
import {
  calculateNicheTierBenchmark,
  calculatePerformanceProjection,
  formatCurrencyExact,
  formatNumber,
} from './pricingEngine';

export interface OutreachTemplateOption {
  id: OutreachEmailTemplateId;
  label: string;
  description: string;
}

export const OUTREACH_TEMPLATE_OPTIONS: OutreachTemplateOption[] = [
  {
    id: 'counter_offer',
    label: 'Counter-Offer & Alignment',
    description: 'Uses deal notes, coach anchor rate & scope trade-offs',
  },
  {
    id: 'tiered_pitch',
    label: '3-Tier Sponsor Pitch',
    description: 'Presents Option A / B / C packages anchored by reach & ER',
  },
  {
    id: 'rights_exclusivity',
    label: 'Rights & Exclusivity',
    description: 'Monetizes paid usage, whitelisting & competitor lockouts',
  },
  {
    id: 'closing_followup',
    label: 'Terms & Closing',
    description: 'Confirms Net-14 payment, 2 revisions & kill-fee terms',
  },
];

export interface GeneratedOutreachResult {
  subject: string;
  body: string;
  usedNotes: boolean;
  usedAiCoach: boolean;
  anchorRateUsd: number;
  floorRateUsd: number;
}

function replacePlaceholders(
  text: string,
  brandName: string,
  contactName: string,
  creatorName: string
): string {
  const brand = brandName.trim() || '[Brand Name]';
  const contact = contactName.trim();
  const creator = creatorName.trim() || '[Your Name]';

  let out = text
    .replace(/\[Brand Name\]/gi, brand)
    .replace(/\[Sponsor Name\]/gi, brand)
    .replace(/\[Your Name\]/gi, creator)
    .replace(/\[Creator Name\]/gi, creator);

  if (contact) {
    out = out
      .replace(/\[Contact Name\]/gi, contact)
      .replace(/Hi\s+\[Brand Name\]\s+Team/gi, `Hi ${contact}`)
      .replace(/Hi\s+there/gi, `Hi ${contact}`);
  } else {
    out = out.replace(/\[Contact Name\]/gi, `${brand} Team`);
  }

  return out;
}

function normalizeNotesSentence(rawNotes: string | undefined): string {
  if (!rawNotes) return '';
  const cleaned = rawNotes.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const withoutTrailingPunct = cleaned.replace(/[.;]+$/, '');
  return withoutTrailingPunct;
}

function deriveCoachTargets(
  targetDeal: SavedDealSnapshot,
  comparisonDeals: SavedDealSnapshot[],
  focus: NegotiationCoachFocus,
  analysis: NegotiationCoachAnalysis | null
): {
  anchorRateUsd: number;
  floorRateUsd: number;
  riderSharePct: number;
  spreadSummaryUsd: number;
  matchedTalkingPoint: string | null;
  matchedDiscrepancy: string | null;
  concessionPlaybook: string | null;
} {
  const b = targetDeal.result.breakdown;
  const riderSharePct =
    b.totalRecommendedRate > 0
      ? Math.round((b.totalCommercialRiders / b.totalRecommendedRate) * 100)
      : 0;

  const allDeals = comparisonDeals.length > 0 ? comparisonDeals : [targetDeal];
  const rates = allDeals.map((d) => d.result.breakdown.totalRecommendedRate);
  const maxRate = Math.max(...rates);
  const minRate = Math.min(...rates);
  const spreadSummaryUsd = Math.max(0, maxRate - minRate);

  if (analysis) {
    const targetLower = targetDeal.name.toLowerCase();
    const matchedTp =
      analysis.talkingPoints.find(
        (tp) => tp.targetDealName.toLowerCase() === targetLower
      ) ??
      analysis.talkingPoints.find((tp) =>
        tp.targetDealName.toLowerCase().includes(targetLower.slice(0, 12))
      ) ??
      analysis.talkingPoints[0];

    const topDisc = analysis.keyDiscrepancies[0];

    return {
      anchorRateUsd: analysis.counterOfferRecommendation.recommendedAnchorRate,
      floorRateUsd: analysis.counterOfferRecommendation.recommendedFloorRate,
      riderSharePct,
      spreadSummaryUsd,
      matchedTalkingPoint: matchedTp ? matchedTp.scriptQuote : null,
      matchedDiscrepancy: topDisc
        ? `${topDisc.dimension} (${topDisc.deltaSummary}): ${topDisc.strategicImpact}`
        : null,
      concessionPlaybook: analysis.counterOfferRecommendation.concessionPlaybook,
    };
  }

  // Deterministic coach posture logic when AI analysis hasn't been fetched yet
  let anchorRateUsd = b.totalRecommendedRate;
  let floorRateUsd = b.baseCreationFee;

  if (focus === 'anchor_up') {
    anchorRateUsd = Math.max(
      b.totalRecommendedRate,
      targetDeal.result.tieredPackages.tierB_StandardGrowth.fee
    );
    floorRateUsd = Math.max(b.baseCreationFee, b.totalRecommendedRate * 0.85);
  } else if (focus === 'rights_exclusivity') {
    anchorRateUsd = Math.max(
      b.totalRecommendedRate,
      b.baseCreationFee + Math.max(b.totalCommercialRiders, b.baseCreationFee * 0.5)
    );
    floorRateUsd = b.baseCreationFee;
  } else if (focus === 'defend_scope') {
    anchorRateUsd = b.totalRecommendedRate;
    floorRateUsd = b.baseCreationFee;
  } else {
    anchorRateUsd = b.totalRecommendedRate;
    floorRateUsd = Math.max(b.baseCreationFee, b.totalRecommendedRate * 0.8);
  }

  return {
    anchorRateUsd,
    floorRateUsd,
    riderSharePct,
    spreadSummaryUsd,
    matchedTalkingPoint: null,
    matchedDiscrepancy: null,
    concessionPlaybook: null,
  };
}

function buildPostureParagraph(
  focus: NegotiationCoachFocus,
  targetDeal: SavedDealSnapshot,
  anchorRateUsd: number,
  floorRateUsd: number,
  currency: CurrencyCode,
  concessionPlaybook: string | null,
  matchedTalkingPoint: string | null
): string {
  const fmt = (val: number) => formatCurrencyExact(val, currency);
  const b = targetDeal.result.breakdown;
  const projection = calculatePerformanceProjection(targetDeal);

  if (matchedTalkingPoint) {
    return matchedTalkingPoint;
  }

  switch (focus) {
    case 'defend_scope':
      return `To protect creative quality and keep my pricing consistent across partners, my Base Creation Fee remains ${fmt(
        b.baseCreationFee
      )}. Rather than discounting production, we can align to your budget by trimming optional commercial riders (such as shortening paid usage or narrowing exclusivity) toward an organic-only floor of ${fmt(
        floorRateUsd
      )}.`;
    case 'anchor_up': {
      const roiSnippet =
        projection.targetCpa !== null
          ? ` At your ${fmt(projection.targetCpa)} Target CPA, this deliverable only needs ${formatNumber(
              projection.breakEvenConversions ?? 0
            )} conversions to break even against an estimated ~${formatNumber(
              projection.projectedConversions
            )} high-intent actions.`
          : '';
      return `Given my verified ${b.calculatedER.toFixed(
        1
      )}% high-intent engagement rate across ${formatNumber(
        targetDeal.profile.medianViews
      )} median views, the ${fmt(anchorRateUsd)} anchor reflects full-funnel campaign value.${roiSnippet}`;
    }
    case 'rights_exclusivity':
      return `A significant portion of the ${fmt(
        anchorRateUsd
      )} total comes from commercial licensing (${fmt(
        b.totalCommercialRiders
      )} in paid usage, whitelisting, and/or category exclusivity), which carries direct opportunity cost. I'm happy to modularize those riders on fixed 30-to-90-day terms rather than bundling indefinite lockouts.`;
    case 'balanced':
    default:
      return concessionPlaybook
        ? concessionPlaybook
        : `My recommended structure balances creative ROI at ${fmt(
            anchorRateUsd
          )} while keeping a clear fallback at ${fmt(
            floorRateUsd
          )} if we unbundle paid ad licensing or exclusivity riders.`;
  }
}

export function generateSponsorOutreachEmail(params: {
  templateId: OutreachEmailTemplateId;
  targetDeal: SavedDealSnapshot;
  comparisonDeals: SavedDealSnapshot[];
  focus: NegotiationCoachFocus;
  analysis: NegotiationCoachAnalysis | null;
  brandName: string;
  contactName: string;
  creatorName: string;
  currency: CurrencyCode;
}): GeneratedOutreachResult {
  const {
    templateId,
    targetDeal,
    comparisonDeals,
    focus,
    analysis,
    brandName,
    contactName,
    creatorName,
    currency,
  } = params;

  const fmt = (val: number) => formatCurrencyExact(val, currency);
  const brand = brandName.trim() || '[Brand Name]';
  const greetingName = contactName.trim() || `${brand} Team`;
  const creator = creatorName.trim() || '[Your Name]';

  const platform = PLATFORM_SPECS[targetDeal.profile.platform];
  const niche = NICHE_BENCHMARKS[targetDeal.profile.niche];
  const usageSpec = USAGE_RIGHTS_SPECS[targetDeal.scope.usageRightsTerm];
  const exclusivitySpec = EXCLUSIVITY_SPECS[targetDeal.scope.exclusivityType];
  const b = targetDeal.result.breakdown;
  const { tierA_Organic, tierB_StandardGrowth, tierC_FullScale } =
    targetDeal.result.tieredPackages;

  const cleanedNote = normalizeNotesSentence(targetDeal.notes);
  const usedNotes = cleanedNote.length > 0;

  const coach = deriveCoachTargets(targetDeal, comparisonDeals, focus, analysis);
  const benchmark = calculateNicheTierBenchmark(targetDeal);

  // If AI Coach analysis generated a tailored email and user picked 'ai_coach_draft'
  if (templateId === 'ai_coach_draft' && analysis?.outreachEmail) {
    return {
      subject: replacePlaceholders(
        analysis.outreachEmail.subject,
        brandName,
        contactName,
        creatorName
      ),
      body: replacePlaceholders(
        analysis.outreachEmail.body,
        brandName,
        contactName,
        creatorName
      ),
      usedNotes,
      usedAiCoach: true,
      anchorRateUsd: coach.anchorRateUsd,
      floorRateUsd: coach.floorRateUsd,
    };
  }

  const notesParagraph = usedNotes
    ? `Following up on our deal notes (${cleanedNote}), I want to make sure the commercial scope aligns cleanly with both your campaign goals and timeline.`
    : `I put together a transparent breakdown for our upcoming ${platform.shortLabel} collaboration so your team has clear visibility into production and licensing terms.`;

  const postureParagraph = buildPostureParagraph(
    focus,
    targetDeal,
    coach.anchorRateUsd,
    coach.floorRateUsd,
    currency,
    coach.concessionPlaybook,
    coach.matchedTalkingPoint
  );

  const discrepancyLine = coach.matchedDiscrepancy
    ? `\n\nKey Scope & Pricing Context: ${coach.matchedDiscrepancy}`
    : '';

  const riderLineParts = [
    `${usageSpec.label} (${fmt(b.usageRightsFee)})`,
    targetDeal.scope.whitelistingEnabled
      ? `${targetDeal.scope.whitelistingExpirationDays}-Day Whitelisting (${fmt(b.whitelistingFee)})`
      : null,
    targetDeal.scope.exclusivityType !== 'none'
      ? `${exclusivitySpec.label} (${fmt(b.exclusivityFee)})`
      : null,
    b.rushFee > 0 ? `Rush Turnaround (${fmt(b.rushFee)})` : null,
  ].filter(Boolean);

  const riderSummaryText =
    riderLineParts.length > 0
      ? riderLineParts.join(' · ')
      : 'Organic posting only (no paid licensing or category exclusivity)';

  switch (templateId) {
    case 'tiered_pitch': {
      return {
        subject: `${brand} x ${creator} — ${platform.shortLabel} Partnership Proposal (${fmt(
          coach.anchorRateUsd
        )})`,
        body: `Hi ${greetingName},

I'd love to partner with ${brand} on an upcoming ${platform.label} campaign targeting the ${niche.label} audience.

${notesParagraph}

Audience & Performance Baseline:
• Platform & Deliverable: ${platform.deliverableUnit}
• Verified Reach: ${formatNumber(targetDeal.profile.medianViews)} median views per post (last 10–15 posts)
• High-Intent Engagement: ${b.calculatedER.toFixed(1)}% ER (saves, shares & comments — benchmarked at ${fmt(
          benchmark.averageBenchmark
        )} for ${benchmark.tierLabel})

To give your team budget flexibility without compromising production quality, here are three structured options:

1. ${tierA_Organic.name} — ${fmt(tierA_Organic.fee)}
   • ${platform.deliverableUnit} + 30-day organic reposting (no paid ad rights or exclusivity)

2. ${tierB_StandardGrowth.name} (Recommended Anchor) — ${fmt(tierB_StandardGrowth.fee)}
   • ${platform.deliverableUnit} + 1 paid ad hook variation
   • 90-day paid social usage + 30-day named competitor exclusivity (up to 3 brands)

3. ${tierC_FullScale.name} — ${fmt(tierC_FullScale.fee)}
   • Full campaign package + clean raw footage + 3-frame Story sequence
   • 180-day paid ad usage + handle whitelisting + 60-day named competitor exclusivity

${postureParagraph}

All packages include ${targetDeal.scope.includedRevisionRounds} consolidated revision rounds and standard Net-14 payment terms. Let me know which tier works best for your campaign window and I'll share production dates!

Best,
${creator}`,
        usedNotes,
        usedAiCoach: Boolean(analysis),
        anchorRateUsd: coach.anchorRateUsd,
        floorRateUsd: coach.floorRateUsd,
      };
    }

    case 'rights_exclusivity': {
      return {
        subject: `Re: ${brand} x ${creator} — Commercial Rights, Usage & Exclusivity Scope`,
        body: `Hi ${greetingName},

Thank you for sending over the brief for the ${platform.label} partnership—I'm excited about the creative direction for ${brand}.

${notesParagraph}

To keep pricing transparent, I separate creative production from commercial licensing so you only pay for the exact distribution rights you plan to use:

• Base Creation Fee (${platform.deliverableUnit}): ${fmt(b.baseCreationFee)}
• Requested Commercial Riders: ${riderSummaryText}
• Total Recommended Package: ${fmt(coach.anchorRateUsd)}

${postureParagraph}${discrepancyLine}

If your team prefers to keep initial spend leaner, we can start at ${fmt(
          b.baseCreationFee
        )} for organic delivery and lock in a pre-negotiated 90-day paid usage add-on (+${fmt(
          b.baseCreationFee * 0.5
        )}) triggered only when you boost the top-performing cut. Similarly, narrowing any exclusivity to 3 named direct competitors for 30–60 days keeps costs focused on conversion rather than broad category lockouts.

Happy to jump on a quick 10-minute call or update the deal memo with whichever rights window fits best.

Best,
${creator}`,
        usedNotes,
        usedAiCoach: Boolean(analysis),
        anchorRateUsd: coach.anchorRateUsd,
        floorRateUsd: coach.floorRateUsd,
      };
    }

    case 'closing_followup': {
      return {
        subject: `Next Steps & Terms Confirmation — ${brand} x ${creator}`,
        body: `Hi ${greetingName},

Hope your week is going well! Checking in to confirm the final scope and commercial terms for our ${platform.label} campaign (${targetDeal.name}) so I can lock your shoot dates onto my production calendar.

${notesParagraph}

Proposed Agreement Summary:
• Deliverable: ${platform.deliverableUnit}
• Total Investment: ${fmt(coach.anchorRateUsd)} (Base Creation: ${fmt(
          b.baseCreationFee
        )} + Commercial Riders: ${fmt(b.totalCommercialRiders)})
• Usage & Exclusivity: ${riderSummaryText}
• Turnaround & Revisions: ${
          targetDeal.scope.turnaroundWindow === 'rush_under_5d'
            ? 'Expedited Rush (<5 business days)'
            : 'Standard 14-day production window'
        } · ${targetDeal.scope.includedRevisionRounds} consolidated revision rounds
• Standard Terms: Net-14 payment upon final deliverable submission · 50%/100% milestone kill fee

${postureParagraph}

Once these details look good on your end, feel free to send over the updated SOW/agreement and I'll turn around signatures right away.

Best,
${creator}`,
        usedNotes,
        usedAiCoach: Boolean(analysis),
        anchorRateUsd: coach.anchorRateUsd,
        floorRateUsd: coach.floorRateUsd,
      };
    }

    case 'counter_offer':
    default: {
      return {
        subject: `Re: ${brand} Sponsorship Proposal — Scope & Rate Alignment (${fmt(
          coach.anchorRateUsd
        )})`,
        body: `Hi ${greetingName},

Thank you for the partnership details—I'd love to collaborate with ${brand} on the ${platform.label} campaign.

${notesParagraph}

Based on my verified reach of ${formatNumber(
          targetDeal.profile.medianViews
        )} median views and ${b.calculatedER.toFixed(
          1
        )}% high-intent engagement in the ${niche.label} niche, my quoted total for this configuration is ${fmt(
          coach.anchorRateUsd
        )} (${fmt(b.baseCreationFee)} Base Creation Fee + ${fmt(
          b.totalCommercialRiders
        )} in commercial riders: ${riderSummaryText}).

${postureParagraph}${discrepancyLine}

Alternative Scope Options to Fit Budget:
• Recommended Full Scope: ${fmt(coach.anchorRateUsd)} (${usageSpec.label}${
          targetDeal.scope.whitelistingEnabled ? ' + Whitelisting' : ''
        })
• Lean / Organic Scope: ${fmt(tierA_Organic.fee)} (removes paid ad rights & exclusivity while keeping full ${platform.shortLabel} creative quality)

Let me know which structure aligns best with your budget and launch timeline—I'm ready to confirm deliverables and get started!

Best,
${creator}`,
        usedNotes,
        usedAiCoach: Boolean(analysis),
        anchorRateUsd: coach.anchorRateUsd,
        floorRateUsd: coach.floorRateUsd,
      };
    }
  }
}
