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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

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
    ].join('\n');

    const prompt = `Analyze the following selected sponsorship deal proposals and generate counter-negotiation coaching:\n\n${JSON.stringify(
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
            },
            required: [
              'executiveSummary',
              'keyDiscrepancies',
              'talkingPoints',
              'counterOfferRecommendation',
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
