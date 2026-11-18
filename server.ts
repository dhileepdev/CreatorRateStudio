import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CoachDealPayload {
  id: string;
  name: string;
  tags?: string[];
  notes?: string;
  savedAt: string;
  platform: string;
  niche: string;
  followerTier: string;
  followerCount: number;
  medianViews: number;
  engagementRate: number;
  activeCpm: number;
  baseCreationFee: number;
  usageRightsLabel: string;
  usageRightsFee: number;
  whitelistingEnabled: boolean;
  whitelistingExpirationDays: number;
  whitelistingFee: number;
  exclusivityLabel: string;
  exclusivityFee: number;
  turnaroundLabel: string;
  rushFee: number;
  includedRevisionRounds: number;
  excessRevisionsFee: number;
  totalCommercialRiders: number;
  totalRecommendedRate: number;
  targetCpa?: number;
  targetMonthlyRevenue?: number;
}

interface CoachRequestBody {
  deals?: CoachDealPayload[];
  focus?: string;
  currency?: {
    code?: string;
    rateFromUsd?: number;
    decimals?: number;
  };
}

const FOCUS_INSTRUCTIONS: Record<string, string> = {
  balanced:
    'Balance rate protection with flexible commercial options (e.g., separating base creation from usage/exclusivity tiers so the brand can choose scope vs. price).',
  defend_scope:
    'Hold firm on total value and recommend trimming scope riders (usage duration, whitelisting, or exclusivity) rather than discounting the base creation fee.',
  anchor_up:
    'Push back against lower-priced or under-scoped benchmarks by anchoring on audience engagement quality, niche CPM value, and ROI/CPA efficiency.',
  rights_exclusivity:
    'Prioritize monetizing paid usage rights, whitelisting ad access, and category exclusivity lockouts that create opportunity cost for the creator.',
};

interface ContractStrategyClausePayload {
  clauseId: number;
  clauseTitle: string;
  category: string;
  severity: 'warning' | 'critical';
  redFlagPattern: string;
  advice: string;
  replacementText: string;
}

interface ContractStrategyDealContext {
  platformLabel: string;
  deliverableUnit: string;
  nicheLabel: string;
  followerTierLabel: string;
  followerCount: number;
  medianViews: number;
  engagementRatePct: number;
  usageRightsLabel: string;
  whitelistingEnabled: boolean;
  whitelistingExpirationDays: number;
  exclusivityLabel: string;
  turnaroundLabel: string;
  includedRevisionRounds: number;
  baseCreationFeeUsd: number;
  usageRightsFeeUsd: number;
  whitelistingFeeUsd: number;
  exclusivityFeeUsd: number;
  totalCommercialRidersUsd: number;
  totalRecommendedRateUsd: number;
}

interface ContractStrategyRequestBody {
  clauses?: ContractStrategyClausePayload[];
  dealContext?: ContractStrategyDealContext;
  tone?: string;
  counterparty?: string;
  brandName?: string;
  currency?: {
    code?: string;
    symbol?: string;
    rateFromUsd?: number;
    decimals?: number;
  };
}

const CONTRACT_TONE_GUIDANCE: Record<string, string> = {
  collaborative:
    'Use a warm, partner-focused tone that treats redlines as standard business hygiene while remaining firm on creator IP, payment certainty, and scope boundaries.',
  firm_commercial:
    'Use a crisp, executive talent-agency tone with unambiguous redline boundaries and clear commercial rationale for every rejected term.',
  tiered_tradeoff:
    'Frame every pushback around unbundled commercial pricing—offering paid options for extended usage, whitelisting, rush delivery, or exclusivity rather than flat refusals.',
};

type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR';

interface FxRatesCacheEntry {
  base: 'USD';
  rates: Record<SupportedCurrency, number>;
  provider: string;
  asOfDate: string;
  fetchedAt: string;
  expiresAtMs: number;
}

const TARGET_FX_CODES: Array<Exclude<SupportedCurrency, 'USD'>> = [
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'INR',
];

const BASELINE_FX_RATES: Record<SupportedCurrency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.38,
  AUD: 1.52,
  JPY: 151,
  INR: 84.5,
};

let fxRatesCache: FxRatesCacheEntry | null = null;
const FX_CACHE_TTL_MS = 30 * 60 * 1000;

function extractValidatedRates(
  rawRates: Record<string, unknown> | undefined
): Record<SupportedCurrency, number> | null {
  if (!rawRates || typeof rawRates !== 'object') return null;
  const result: Record<SupportedCurrency, number> = { ...BASELINE_FX_RATES, USD: 1.0 };
  for (const code of TARGET_FX_CODES) {
    const val = rawRates[code];
    if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) {
      return null;
    }
    result[code] = Number(val.toFixed(code === 'JPY' || code === 'INR' ? 2 : 4));
  }
  return result;
}

async function fetchLiveExchangeRates(): Promise<Omit<FxRatesCacheEntry, 'expiresAtMs'> & { source: 'live' | 'fallback' }> {
  // Primary: Frankfurter (European Central Bank reference rates, keyless)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${TARGET_FX_CODES.join(',')}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (resp.ok) {
      const data = (await resp.json()) as {
        date?: string;
        rates?: Record<string, unknown>;
      };
      const validated = extractValidatedRates(data?.rates);
      if (validated) {
        return {
          base: 'USD',
          rates: validated,
          provider: 'Frankfurter (ECB)',
          asOfDate:
            typeof data.date === 'string' && data.date.trim()
              ? data.date
              : new Date().toISOString().slice(0, 10),
          fetchedAt: new Date().toISOString(),
          source: 'live',
        };
      }
    }
  } catch {
    // Fall through to secondary provider
  }

  // Secondary: Open ExchangeRate-API (keyless open tier)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      const data = (await resp.json()) as {
        result?: string;
        time_last_update_utc?: string;
        rates?: Record<string, unknown>;
      };
      const validated = extractValidatedRates(data?.rates);
      if (data?.result === 'success' && validated) {
        const parsedDate = data.time_last_update_utc
          ? new Date(data.time_last_update_utc)
          : new Date();
        const asOfDate = Number.isNaN(parsedDate.getTime())
          ? new Date().toISOString().slice(0, 10)
          : parsedDate.toISOString().slice(0, 10);
        return {
          base: 'USD',
          rates: validated,
          provider: 'ExchangeRate-API',
          asOfDate,
          fetchedAt: new Date().toISOString(),
          source: 'live',
        };
      }
    }
  } catch {
    // Fall through to baseline fallback
  }

  return {
    base: 'USD',
    rates: { ...BASELINE_FX_RATES },
    provider: 'Baseline Reference',
    asOfDate: new Date().toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/exchange-rates', async (req: Request, res: Response) => {
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const now = Date.now();

    if (!forceRefresh && fxRatesCache && fxRatesCache.expiresAtMs > now) {
      res.json({
        base: fxRatesCache.base,
        rates: fxRatesCache.rates,
        provider: fxRatesCache.provider,
        asOfDate: fxRatesCache.asOfDate,
        fetchedAt: fxRatesCache.fetchedAt,
        source: 'cache',
      });
      return;
    }

    const latest = await fetchLiveExchangeRates();
    if (latest.source === 'live') {
      fxRatesCache = {
        base: latest.base,
        rates: latest.rates,
        provider: latest.provider,
        asOfDate: latest.asOfDate,
        fetchedAt: latest.fetchedAt,
        expiresAtMs: now + FX_CACHE_TTL_MS,
      };
    }

    res.json(latest);
  });

  app.post('/api/negotiation-coach', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(500).json({
        error:
          'Gemini API key is not configured. Please check your GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const body = (req.body ?? {}) as CoachRequestBody;
    const deals = Array.isArray(body.deals) ? body.deals : [];

    if (deals.length < 2) {
      res.status(400).json({
        error: 'Select at least 2 saved deals to analyze discrepancies and generate coaching points.',
      });
      return;
    }

    if (deals.length > 6) {
      res.status(400).json({
        error: 'Please select up to 6 deals at a time for focused negotiation coaching.',
      });
      return;
    }

    const focusKey = typeof body.focus === 'string' && body.focus in FOCUS_INSTRUCTIONS
      ? body.focus
      : 'balanced';
    const focusGuidance = FOCUS_INSTRUCTIONS[focusKey];
    const currencyCode =
      typeof body.currency?.code === 'string' && body.currency.code.trim()
        ? body.currency.code.trim().toUpperCase()
        : 'USD';
    const currencyRate =
      typeof body.currency?.rateFromUsd === 'number' &&
      Number.isFinite(body.currency.rateFromUsd) &&
      body.currency.rateFromUsd > 0
        ? body.currency.rateFromUsd
        : 1;

    const formattedDeals = deals.map((d, index) => ({
      slot: `Deal ${index + 1}`,
      name: d.name,
      platform: d.platform,
      niche: d.niche,
      followerTier: d.followerTier,
      followerCount: d.followerCount,
      medianViews: d.medianViews,
      engagementRatePct: Number(d.engagementRate.toFixed(2)),
      activeCpmUsd: d.activeCpm,
      baseCreationFeeUsd: Number(d.baseCreationFee.toFixed(2)),
      usageRights: `${d.usageRightsLabel} ($${d.usageRightsFee.toFixed(2)})`,
      whitelisting: d.whitelistingEnabled
        ? `Enabled, ${d.whitelistingExpirationDays}d cap ($${d.whitelistingFee.toFixed(2)})`
        : 'Not included ($0.00)',
      exclusivity: `${d.exclusivityLabel} ($${d.exclusivityFee.toFixed(2)})`,
      turnaround: `${d.turnaroundLabel} (rush fee $${d.rushFee.toFixed(2)})`,
      revisions: `${d.includedRevisionRounds} included rounds (excess fee $${d.excessRevisionsFee.toFixed(2)})`,
      totalCommercialRidersUsd: Number(d.totalCommercialRiders.toFixed(2)),
      totalRecommendedRateUsd: Number(d.totalRecommendedRate.toFixed(2)),
      targetCpaUsd: typeof d.targetCpa === 'number' ? d.targetCpa : null,
      targetMonthlyRevenueUsd:
        typeof d.targetMonthlyRevenue === 'number' ? d.targetMonthlyRevenue : null,
      tags: Array.isArray(d.tags) && d.tags.length > 0 ? d.tags : [],
      negotiationNotes: d.notes && d.notes.trim().length > 0 ? d.notes.trim() : '(none provided)',
    }));

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = [
      'You are an expert creator talent agent and sponsorship negotiation strategist.',
      'Your task is to analyze 2 to 6 selected sponsorship deal proposals side-by-side, pinpoint exact dollar fee discrepancies, scope/rights differences (paid usage, whitelisting, category exclusivity, rush turnaround, revisions), and incorporate every detail from each deal\'s "negotiationNotes" field.',
      `Negotiation strategy focus: ${focusGuidance}`,
      'Rules:',
      '- Reference exact deal names, exact dollar figures, and specific context from the negotiationNotes field whenever present.',
      '- Never suggest giving away perpetual IP, blanket exclusivity, or unlimited whitelisting for free.',
      '- Keep talking points concise, realistic, polite, commercially sharp, and immediately usable verbatim in an email or call.',
      '- Ensure recommendedAnchorRate and recommendedFloorRate are realistic numeric USD amounts grounded in the selected deals.',
      `- Also draft one complete, professional, ready-to-send sponsor outreach email ("outreachEmail") that uses the negotiationNotes, key discrepancies, and recommended anchor quote (formatted in ${currencyCode}, where 1 USD = ${currencyRate} ${currencyCode}). Use [Brand Name], [Contact Name], and [Your Name] placeholders where names are unknown.`,
    ].join('\n');

    const prompt = `Analyze the following selected sponsorship deal proposals and generate counter-negotiation coaching and a ready-to-send sponsor outreach email:\n\n${JSON.stringify(
      formattedDeals,
      null,
      2
    )}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: {
                type: Type.STRING,
                description:
                  '2-3 sentence overview of the pricing and scope spread across the selected deals and the creator\'s strongest negotiation leverage.',
              },
              keyDiscrepancies: {
                type: Type.ARRAY,
                description:
                  '3 to 5 specific discrepancies across total rate, base creation fee, usage/whitelisting/exclusivity riders, metrics, or negotiation notes.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dimension: {
                      type: Type.STRING,
                      description: 'Short name of the differing factor (e.g., Paid Usage & Whitelisting Gap).',
                    },
                    deltaSummary: {
                      type: Type.STRING,
                      description: 'Exact numerical or contractual difference between the deals.',
                    },
                    strategicImpact: {
                      type: Type.STRING,
                      description: 'Why this discrepancy matters commercially in the negotiation.',
                    },
                  },
                  required: ['dimension', 'deltaSummary', 'strategicImpact'],
                },
              },
              talkingPoints: {
                type: Type.ARRAY,
                description:
                  '3 to 4 actionable counter-negotiation talking points tailored to the selected deals, fee gaps, and negotiationNotes.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: 'Concise tactical label for the talking point.',
                    },
                    targetDealName: {
                      type: Type.STRING,
                      description: 'Primary deal name this talking point applies to or defends against.',
                    },
                    rationale: {
                      type: Type.STRING,
                      description:
                        'Brief explanation citing the exact fee difference and/or negotiationNotes context.',
                    },
                    scriptQuote: {
                      type: Type.STRING,
                      description:
                        'Ready-to-send 2-4 sentence counter-negotiation script written in first person.',
                    },
                  },
                  required: ['title', 'targetDealName', 'rationale', 'scriptQuote'],
                },
              },
              counterOfferRecommendation: {
                type: Type.OBJECT,
                properties: {
                  recommendedAnchorRate: {
                    type: Type.NUMBER,
                    description: 'Recommended opening counter-quote in USD.',
                  },
                  recommendedFloorRate: {
                    type: Type.NUMBER,
                    description: 'Minimum walk-away cash floor in USD before trimming scope.',
                  },
                  concessionPlaybook: {
                    type: Type.STRING,
                    description:
                      'Specific trade-off plan explaining which scope riders to unbundle or trim if the brand asks for a lower price.',
                  },
                },
                required: [
                  'recommendedAnchorRate',
                  'recommendedFloorRate',
                  'concessionPlaybook',
                ],
              },
              outreachEmail: {
                type: Type.OBJECT,
                description:
                  'A complete, professional templated outreach/counter-negotiation email to send to the brand sponsor incorporating deal notes, anchor rate, and scope rationale.',
                properties: {
                  subject: {
                    type: Type.STRING,
                    description: 'Concise, professional email subject line.',
                  },
                  body: {
                    type: Type.STRING,
                    description:
                      'Full ready-to-send email body with clear paragraphs, scope options, and polite call to action.',
                  },
                },
                required: ['subject', 'body'],
              },
            },
            required: [
              'executiveSummary',
              'keyDiscrepancies',
              'talkingPoints',
              'counterOfferRecommendation',
              'outreachEmail',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'The AI Negotiating Coach returned an empty response. Please try again.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (
        lower.includes('permission_denied') ||
        lower.includes('api_key_invalid') ||
        lower.includes('api key not valid') ||
        lower.includes('403')
      ) {
        res.status(403).json({
          error:
            'Gemini API key was rejected. Please verify your API key in Settings > Secrets.',
        });
        return;
      }
      if (lower.includes('resource_exhausted') || lower.includes('429')) {
        res.status(429).json({
          error:
            'Rate limit reached for the AI Negotiating Coach. Please wait a moment and try again.',
        });
        return;
      }
      res.status(500).json({
        error: `Failed to generate negotiation coaching: ${msg}`,
      });
    }
  });

  app.post('/api/contract-negotiation-strategy', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(500).json({
        error:
          'Gemini API key is not configured. Please check your GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const body = (req.body ?? {}) as ContractStrategyRequestBody;
    const clauses = Array.isArray(body.clauses) ? body.clauses : [];

    if (clauses.length === 0) {
      res.status(400).json({
        error:
          'Flag at least 1 red-flag clause in the 15-clause contract audit to generate targeted AI rebuttals.',
      });
      return;
    }

    if (clauses.length > 15) {
      res.status(400).json({
        error: 'A maximum of 15 contract clauses can be analyzed per strategy request.',
      });
      return;
    }

    if (!body.dealContext || typeof body.dealContext.platformLabel !== 'string') {
      res.status(400).json({
        error: 'Current deal configuration context is required to tailor rebuttals.',
      });
      return;
    }

    const toneKey =
      typeof body.tone === 'string' && body.tone in CONTRACT_TONE_GUIDANCE
        ? body.tone
        : 'collaborative';
    const toneInstruction = CONTRACT_TONE_GUIDANCE[toneKey];

    const counterpartyLabel =
      body.counterparty === 'agency'
        ? 'Media / Talent Agency acting on behalf of an End-Client'
        : 'Direct Brand Sponsor marketing/legal team';

    const brandLabel =
      typeof body.brandName === 'string' && body.brandName.trim()
        ? body.brandName.trim()
        : '[Brand Name]';

    const currencyCode =
      typeof body.currency?.code === 'string' && body.currency.code.trim()
        ? body.currency.code.trim().toUpperCase()
        : 'USD';
    const currencyRate =
      typeof body.currency?.rateFromUsd === 'number' &&
      Number.isFinite(body.currency.rateFromUsd) &&
      body.currency.rateFromUsd > 0
        ? body.currency.rateFromUsd
        : 1;
    const currencyDecimals =
      typeof body.currency?.decimals === 'number' &&
      Number.isInteger(body.currency.decimals) &&
      body.currency.decimals >= 0
        ? body.currency.decimals
        : 2;

    const formatLocalAmount = (usdAmount: number) => {
      const converted = usdAmount * currencyRate;
      const rounded = converted.toLocaleString('en-US', {
        minimumFractionDigits: currencyDecimals,
        maximumFractionDigits: currencyDecimals,
      });
      return `${currencyCode} ${rounded}`;
    };

    const dc = body.dealContext;
    const structuredContext = {
      dealType: {
        platform: dc.platformLabel,
        deliverable: dc.deliverableUnit,
        niche: dc.nicheLabel,
        followerTier: dc.followerTierLabel,
        followerCount: dc.followerCount,
        medianViews: dc.medianViews,
        engagementRatePct: Number(dc.engagementRatePct.toFixed(2)),
        usageRights: dc.usageRightsLabel,
        whitelisting: dc.whitelistingEnabled
          ? `Enabled (${dc.whitelistingExpirationDays}-day cap)`
          : 'Not included',
        exclusivity: dc.exclusivityLabel,
        turnaround: dc.turnaroundLabel,
        includedRevisions: dc.includedRevisionRounds,
        counterparty: counterpartyLabel,
        brandName: brandLabel,
      },
      calculatedFees: {
        currencyCode,
        baseCreationFee: formatLocalAmount(dc.baseCreationFeeUsd),
        usageRightsFee: formatLocalAmount(dc.usageRightsFeeUsd),
        whitelistingFee: formatLocalAmount(dc.whitelistingFeeUsd),
        exclusivityFee: formatLocalAmount(dc.exclusivityFeeUsd),
        totalCommercialRiders: formatLocalAmount(dc.totalCommercialRidersUsd),
        totalRecommendedRate: formatLocalAmount(dc.totalRecommendedRateUsd),
      },
      flaggedRedFlagClauses: clauses.map((c) => ({
        clauseId: c.clauseId,
        clauseTitle: c.clauseTitle,
        category: c.category,
        severity: c.severity,
        redFlagPattern: c.redFlagPattern,
        creatorRiskSummary: c.advice,
        benchmarkReplacementClause: c.replacementText,
      })),
    };

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = [
      'You are a senior creator economy entertainment lawyer and sponsorship negotiation strategist.',
      'Your task is to craft an actionable Negotiation Strategy and bespoke, deal-type-specific rebuttals for each flagged red-flag clause from the creator’s contract audit.',
      `Negotiation tone & style: ${toneInstruction}`,
      'Rules:',
      '- Every rebuttal MUST explicitly adapt to the user’s current deal type (e.g., YouTube Long-Form Dedicated vs. Instagram Reel vs. TikTok vs. Stories vs. Cross-Post Bundle, the creator’s niche, usage rights tier, whitelisting, exclusivity scope, and calculated fee breakdown).',
      '- Use the exact monetary amounts from calculatedFees in the specified currencyCode.',
      '- Return one rebuttal entry in "clauseRebuttals" for EVERY clause in "flaggedRedFlagClauses", preserving its exact clauseId and clauseTitle.',
      '- Ensure "emailRebuttal" is polite, commercially sharp, and ready to paste verbatim to the brand or agency contact.',
      '- Ensure "fallbackConcession" gives a concrete priced add-on or bounded compromise (never giving away perpetual IP, blanket exclusivity, or unlimited revisions for free).',
      '- Ensure "walkAwayTrigger" states a clear commercial boundary.',
      `- Also produce "combinedReplyDraft": one cohesive, professional email body addressed to ${brandLabel} combining the redline rebuttals cleanly in priority order.`,
    ].join('\n');

    const prompt = `Generate a tailored Contract Negotiation Strategy and clause-by-clause AI rebuttals for this deal context and flagged clauses:\n\n${JSON.stringify(
      structuredContext,
      null,
      2
    )}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dealTypeSummary: {
                type: Type.STRING,
                description:
                  '2-sentence summary explaining why the creator has strong commercial leverage given this specific deal type, niche, deliverable unit, and rate structure.',
              },
              negotiationPosture: {
                type: Type.STRING,
                description:
                  'Strategic guidance on how to sequence and frame the redline conversation with this counterparty.',
              },
              priorityOrder: {
                type: Type.ARRAY,
                description:
                  'Ordered list of flagged clauses from highest commercial priority to lowest (e.g., "#5 Perpetual Usage Rights — protect IP before negotiating Net terms").',
                items: { type: Type.STRING },
              },
              clauseRebuttals: {
                type: Type.ARRAY,
                description:
                  'One tailored rebuttal object per flagged clause in the input.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    clauseId: {
                      type: Type.INTEGER,
                      description: 'Exact clauseId from the flagged clause input.',
                    },
                    clauseTitle: {
                      type: Type.STRING,
                      description: 'Exact clauseTitle from the flagged clause input.',
                    },
                    leveragePoint: {
                      type: Type.STRING,
                      description:
                        '1-2 sentence explanation of why this clause is especially risky or mispriced for this specific deal type.',
                    },
                    emailRebuttal: {
                      type: Type.STRING,
                      description:
                        'Copy-ready 2-4 sentence rebuttal paragraph tailored to the deal type and counterparty.',
                    },
                    fallbackConcession: {
                      type: Type.STRING,
                      description:
                        'Concrete priced trade-off or bounded compromise if the brand pushes back.',
                    },
                    walkAwayTrigger: {
                      type: Type.STRING,
                      description:
                        'Clear boundary indicating when to pause or decline the agreement.',
                    },
                  },
                  required: [
                    'clauseId',
                    'clauseTitle',
                    'leveragePoint',
                    'emailRebuttal',
                    'fallbackConcession',
                    'walkAwayTrigger',
                  ],
                },
              },
              combinedReplyDraft: {
                type: Type.STRING,
                description:
                  'Complete ready-to-send email body combining all flagged clause rebuttals cleanly for the brand or agency contact.',
              },
            },
            required: [
              'dealTypeSummary',
              'negotiationPosture',
              'priorityOrder',
              'clauseRebuttals',
              'combinedReplyDraft',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error:
            'The AI Negotiation Strategy service returned an empty response. Please try again.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (
        lower.includes('permission_denied') ||
        lower.includes('api_key_invalid') ||
        lower.includes('api key not valid') ||
        lower.includes('403')
      ) {
        res.status(403).json({
          error:
            'Gemini API key was rejected. Please verify your API key in Settings > Secrets.',
        });
        return;
      }
      if (lower.includes('resource_exhausted') || lower.includes('429')) {
        res.status(429).json({
          error:
            'Rate limit reached for the AI Negotiation Strategy service. Please wait a moment and try again.',
        });
        return;
      }
      res.status(500).json({
        error: `Failed to generate contract negotiation strategy: ${msg}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Creator Rate Studio server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
