import {
  CalculatedDealResult,
  ClauseCategory,
  CurrencyCode,
  DealScope,
} from '../types/calculator';
import { formatCurrencyExact } from '../utils/pricingEngine';

export interface CheatSheetScenario {
  id: string;
  title: string;
  category: ClauseCategory;
  brandPushbackQuote: string;
  relatedClauseIds: number[];
  keywords: string[];
  getAnchorLine: (
    scope: DealScope,
    result: CalculatedDealResult,
    currency: CurrencyCode
  ) => string;
  talkingPoints: string[];
  walkAwayLine: string;
}

export const NEGOTIATION_CHEAT_SHEET_SCENARIOS: CheatSheetScenario[] = [
  {
    id: 'perpetuity',
    title: 'Brand insists on perpetuity',
    category: 'Rights & IP',
    brandPushbackQuote: '“Our standard contract needs perpetual usage across all media.”',
    relatedClauseIds: [5, 7],
    keywords: ['perpetuity', 'perpetual', 'forever', 'unlimited usage', 'buyout', 'in perpetuity'],
    getAnchorLine: (_scope, result, currency) => {
      const base = result.breakdown.baseCreationFee;
      const buyout = base * 3.5;
      const paid90d = base * 0.5;
      return `Counter with 90-day paid usage (+${formatCurrencyExact(paid90d, currency)}) or enforce 350% perpetual buyout (+${formatCurrencyExact(buyout, currency)}).`;
    },
    talkingPoints: [
      'Separate the production fee (creating the asset) from commercial ad licensing (running it in paid media).',
      'Explain that perpetual rights prevent you from working with future brands safely and lock your likeness into ads indefinitely.',
      'Offer a 30-day or 90-day paid usage window to test creative performance first, with a pre-agreed renewal rate if the ad converts.',
      'If legal truly cannot remove perpetuity, quote the full 350% buyout surcharge as a non-negotiable commercial buyout.',
    ],
    walkAwayLine:
      '“I’m happy to grant a 90-day paid license at this rate, or full perpetuity with the standard 350% buyout fee—which option fits your budget best?”',
  },
  {
    id: 'raw-files-ip',
    title: 'Brand wants ownership of raw files',
    category: 'Rights & IP',
    brandPushbackQuote: '“Send over all unedited 4K raw footage and sign Work Made for Hire.”',
    relatedClauseIds: [4],
    keywords: ['raw files', 'raw footage', 'b-roll', 'work made for hire', 'copyright', 'ip', 'ownership'],
    getAnchorLine: (_scope, result, currency) => {
      const base = result.breakdown.baseCreationFee;
      const rawLow = base * 1.5;
      const rawHigh = base * 2.0;
      return `Keep IP ownership; price unedited raw footage buyout at +150%–200% (${formatCurrencyExact(rawLow, currency)}–${formatCurrencyExact(rawHigh, currency)}).`;
    },
    talkingPoints: [
      'Clarify that your base quote covers finished, edited deliverables—not your unedited camera originals, unused takes, or project files.',
      'Explain that brands can repurpose raw clips into dozens of new paid ads you never approved, multiplying their media value.',
      'Push back on “Work Made for Hire” language so you retain underlying copyright and grant a scoped commercial license instead.',
      'Offer a clean add-on: license raw b-roll selects separately for +150%–200% of the Base Creation Fee with defined term limits.',
    ],
    walkAwayLine:
      '“My base fee covers the final edited cut only. If your team wants raw footage selects for internal re-editing, I can add a raw-asset license package.”',
  },
  {
    id: 'blanket-exclusivity',
    title: 'Brand demands broad exclusivity',
    category: 'Exclusivity',
    brandPushbackQuote: '“You can’t work with any competing brands in this space for 90 days.”',
    relatedClauseIds: [8, 9],
    keywords: ['exclusivity', 'non-compete', 'competitors', 'blanket', 'category lock', 'vertical'],
    getAnchorLine: (_scope, result, currency) => {
      const base = result.breakdown.baseCreationFee;
      const named30 = base * 0.3;
      const blanket = base * 2.0;
      return `3 named competitors / 30d: +${formatCurrencyExact(named30, currency)} · Blanket vertical lock: +${formatCurrencyExact(blanket, currency)}.`;
    },
    talkingPoints: [
      'Ask the brand to name exactly three (3) direct commercial competitors instead of blocking an entire category or adjacent vertical.',
      'Tie exclusivity strictly to your active sponsorship income: blocking your top niche costs real monthly revenue you must price in.',
      'Cap the exclusivity window to 30 or 60 days from go-live, and ensure restrictions end immediately if the deal terminates early.',
      'If the brand insists on zero-exception blanket category exclusivity, apply the 200% exclusivity fee.',
    ],
    walkAwayLine:
      '“To keep the rate within budget, let’s list up to three direct competitors for 30 days—otherwise I have to price in the lost category revenue.”',
  },
  {
    id: 'delayed-net-payment',
    title: 'Brand pushes Net-60 or approval-gated pay',
    category: 'Payment',
    brandPushbackQuote: '“Our standard AP terms are Net-60 after final campaign approval.”',
    relatedClauseIds: [1, 3],
    keywords: ['net 60', 'net-60', 'net 90', 'payment', 'invoice', 'approval', 'pay when paid', 'deposit'],
    getAnchorLine: (_scope, result, currency) => {
      const half = result.breakdown.totalRecommendedRate * 0.5;
      return `Counter with Net-14/Net-30 from delivery (or 50% deposit of ${formatCurrencyExact(half, currency)} upfront).`;
    },
    talkingPoints: [
      'Anchor payment countdown strictly to deliverable submission—never “final approval,” which lets internal brand delays stall your payout.',
      'Add a 5-business-day deemed-approval clause: if the brand gives no feedback within 5 days, the deliverable is approved and payable.',
      'For Net-45/Net-60 enterprise AP cycles, require a 50% non-refundable deposit upon contract execution before production starts.',
      'Strike any “pay-when-paid” agency wording so the contracting agency owes you regardless of when their end-client pays them.',
    ],
    walkAwayLine:
      '“I can accommodate Net-30 from submission with a 5-day review window, or split 50% upfront upon signing and 50% at delivery.”',
  },
  {
    id: 'unlimited-revisions-whitelisting',
    title: 'Brand asks for unlimited edits or open Spark Ads',
    category: 'Liability & Scope',
    brandPushbackQuote: '“We’ll just tweak until the team loves it and leave whitelisting on.”',
    relatedClauseIds: [6, 10],
    keywords: ['revisions', 'edits', 'reshoot', 'whitelisting', 'spark ads', 'partnership ads', 'scope creep'],
    getAnchorLine: (scope, result, currency) => {
      const revCap = scope.includedRevisionRounds;
      const extraFee = scope.excessRevisionFeePerRound;
      const wlFee = Math.max(result.breakdown.baseCreationFee * 0.2, 0);
      return `Cap at ${revCap} consolidated round(s) (+${formatCurrencyExact(extraFee, currency)}/extra); Whitelisting min +${formatCurrencyExact(wlFee, currency)}.`;
    },
    talkingPoints: [
      `Lock included revisions at ${'2 consolidated rounds'} aligned to the approved brief—separate subjective tone pivots from brief errors.`,
      'Clarify that full reshoots caused by a brand messaging pivot after script approval require an additional reshoot fee.',
      'Put a hard calendar expiration date on TikTok Spark Ads or Meta Partnership Ad codes so access auto-revokes at term end.',
      'Bill whitelisting separately (20% of Base Fee or 15% of monthly ad spend) since your handle lends direct paid-media credibility.',
    ],
    walkAwayLine:
      '“Two consolidated edit rounds on the approved script are included; any new creative direction after filming or open-ended ad access is billed separately.”',
  },
  {
    id: 'commission-or-kill-fee',
    title: 'Brand offers CPA-only or drops kill fee',
    category: 'Payment',
    brandPushbackQuote: '“We only pay per conversion—or may cancel if priorities shift.”',
    relatedClauseIds: [2, 12],
    keywords: ['affiliate', 'cpa', 'commission', 'performance only', 'kill fee', 'cancellation', 'termination for convenience'],
    getAnchorLine: (_scope, result, currency) => {
      const base = result.breakdown.baseCreationFee;
      const kill50 = result.breakdown.totalRecommendedRate * 0.5;
      return `Require ${formatCurrencyExact(base, currency)} guaranteed base + 50% pre-submission (${formatCurrencyExact(kill50, currency)}) / 100% post-filming kill fee.`;
    },
    talkingPoints: [
      'Remind the brand that filming, editing, and studio costs happen upfront regardless of product landing-page conversion rate or ad spend.',
      'Position affiliate/CPA tracking as a performance bonus stacked on top of your guaranteed Base Creation Fee—never a replacement.',
      'Defend a 50% kill fee upon signing and 100% once filmed: booking their date meant turning down competing paid sponsors.',
      'Offer a slight base-rate compromise only if paired with a minimum guaranteed floor plus uncapped affiliate upside.',
    ],
    walkAwayLine:
      '“I don’t work on pure commission because production costs are fixed, and I do need a 50%/100% kill fee once I hold calendar dates for you.”',
  },
  {
    id: 'uncapped-indemnity',
    title: 'Brand includes one-sided indemnity or silence on #ad',
    category: 'Liability & Scope',
    brandPushbackQuote: '“Legal requires standard creator indemnification—and keep #ad subtle.”',
    relatedClauseIds: [14, 15],
    keywords: ['indemnification', 'indemnify', 'liability', 'cap', 'ftc', 'disclosure', '#ad', 'morality'],
    getAnchorLine: (_scope, result, currency) => {
      return `Cap creator liability at fees paid (${formatCurrencyExact(result.breakdown.totalRecommendedRate, currency)}); mandate mutual indemnity & FTC #ad.`;
    },
    talkingPoints: [
      'Never accept uncapped liability for claims about the brand’s product—the brand must indemnify you for product defects and supplied claims.',
      'Insert a mutual liability cap limiting your maximum exposure strictly to total fees actually paid under the agreement.',
      'Hold a hard legal boundary on FTC disclosures: “#ad” or platform Paid Partnership tags must remain clear and above the fold.',
      'If there is a morality clause, require mutual termination protection so you aren’t locked to a brand during a brand-side scandal.',
    ],
    walkAwayLine:
      '“I can indemnify for my own original content up to the fees paid on this deal, provided the brand covers product claims and full FTC disclosure stays intact.”',
  },
];
