import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Copy,
  FilePenLine,
  FileText,
  Mail,
  Plus,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { CONTRACT_RED_FLAGS } from '../data/benchmarks';
import { CLAUSE_LEGAL_GLOSSARY } from '../data/clauseLegalGlossary';
import {
  CalculatedDealResult,
  ClauseCategory,
  ClauseRiskWeight,
  ContractRiskLevel,
  CreatorProfile,
  DealScope,
  EmailScenarioId,
} from '../types/calculator';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import {
  calculateContractRiskScore,
  formatCurrencyExact,
  generateNegotiationEmail,
  getDefaultClauseRiskWeight,
  resolveClauseRiskWeight,
  RISK_WEIGHT_POINTS,
  RISK_WEIGHT_RANK,
} from '../utils/pricingEngine';
import { AuditProgressBar } from './AuditProgressBar';
import { ClauseLegalGlossaryPopover } from './ClauseLegalGlossaryPopover';
import { ContractExportModal } from './ContractExportModal';
import { ContractNegotiationStrategyModal } from './ContractNegotiationStrategyModal';
import { ContractRiskHeatmap } from './ContractRiskHeatmap';
import { LegalLibraryPanel } from './LegalLibraryPanel';
import {
  NegotiationLogEntry,
  NegotiationLogEntryType,
  NegotiationLogPanel,
} from './NegotiationLogPanel';
import { NegotiationSessionTimer } from './NegotiationSessionTimer';

interface ContractAuditSectionProps {
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
  flaggedClauseIds: number[];
  onToggleClause: (clauseId: number) => void;
  onClearFlags: () => void;
  onNotify: (message: string) => void;
}

const SCENARIOS: Array<{ id: EmailScenarioId; label: string }> = [
  { id: 'three_tier_anchor', label: '3-Tier Pitch Anchor' },
  { id: 'lowball_pushback', label: 'Lowball Pushback' },
  { id: 'reject_perpetual', label: 'Reject Perpetuity' },
  { id: 'defend_exclusivity', label: 'Defend Exclusivity' },
  { id: 'kill_fee_payment', label: 'Kill Fee & Net-14' },
];

const RISK_WEIGHT_OPTIONS: Array<{
  id: ClauseRiskWeight;
  label: string;
  priorityHint: string;
  activeClass: string;
  textClass: string;
}> = [
  {
    id: 'critical',
    label: 'Critical',
    priorityHint: 'Priority 1 · Walk-away blocker',
    activeClass: 'bg-red-700 dark:bg-red-600 text-white border-red-700 dark:border-red-600',
    textClass: 'text-red-700 dark:text-red-400',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    priorityHint: 'Priority 2 · Counter-redline target',
    activeClass: 'bg-amber-600 dark:bg-amber-500 text-white border-amber-600 dark:border-amber-500',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  {
    id: 'low',
    label: 'Low',
    priorityHint: 'Priority 3 · Optional polish',
    activeClass: 'bg-slate-700 dark:bg-slate-600 text-white border-slate-700 dark:border-slate-600',
    textClass: 'text-slate-600 dark:text-slate-400',
  },
];

const CUSTOM_CLAUSES_STORAGE_KEY = 'creator_rate_studio_custom_clauses_v1';
const NEGOTIATION_LOG_STORAGE_KEY = 'creator_rate_studio_negotiation_log_v1';
const REVIEWED_CLAUSES_STORAGE_KEY = 'creator_rate_studio_reviewed_clauses_v1';

const CUSTOM_CLAUSE_SNIPPETS: Array<{ id: string; label: string; text: string }> = [
  {
    id: 'no_ai_training',
    label: 'No AI Training / Likeness Cloning',
    text: 'AI & Synthetic Media Restriction: Brand shall not use Creator’s deliverables, voice, image, or likeness to train artificial intelligence or machine learning models, nor generate synthetic replicas or AI derivatives without Creator’s separate written consent and buyout fee.',
  },
  {
    id: 'late_fee',
    label: 'Late Payment Interest (1.5%/mo)',
    text: 'Late Payment Fee: Any invoice remaining unpaid past its due date shall accrue a late fee of 1.5% per month (or the maximum rate permitted by law), and all commercial usage licenses are automatically suspended until full payment is received.',
  },
  {
    id: 'raw_footage',
    label: 'Raw Footage Excluded',
    text: 'Raw Footage Exclusion: This Agreement covers finished, edited Deliverables only. Unedited raw footage, project files, and unused takes remain Creator’s sole property unless licensed under a separate written addendum.',
  },
  {
    id: 'creative_control',
    label: 'Authentic Voice & Editorial Control',
    text: 'Editorial Authenticity: Creator retains final editorial discretion over delivery tone and phrasing so Deliverables remain authentic to Creator’s audience, subject to factual accuracy regarding Brand’s verified product claims.',
  },
];

function loadSavedCustomClauses(): string {
  try {
    return localStorage.getItem(CUSTOM_CLAUSES_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function loadSavedNegotiationLog(): NegotiationLogEntry[] {
  try {
    const raw = localStorage.getItem(NEGOTIATION_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is NegotiationLogEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.clauseId === 'number' &&
        typeof item.note === 'string' &&
        typeof item.createdAt === 'string'
    );
  } catch {
    return [];
  }
}

function loadSavedReviewedClauses(): number[] {
  try {
    const raw = localStorage.getItem(REVIEWED_CLAUSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === 'number');
  } catch {
    return [];
  }
}

export const ContractAuditSection: React.FC<ContractAuditSectionProps> = ({
  profile,
  scope,
  result,
  flaggedClauseIds,
  onToggleClause,
  onClearFlags,
  onNotify,
}) => {
  const { currency } = useCurrency();
  const { isDark } = useTheme();
  const [categoryFilter, setCategoryFilter] = useState<'All' | ClauseCategory>('All');
  const [weightFilter, setWeightFilter] = useState<'All' | ClauseRiskWeight>('All');
  const [clauseSearchQuery, setClauseSearchQuery] = useState<string>('');
  const [prioritizeByWeight, setPrioritizeByWeight] = useState<boolean>(true);
  const [clauseRiskWeights, setClauseRiskWeights] = useState<
    Partial<Record<number, ClauseRiskWeight>>
  >({});
  const [activeClauseId, setActiveClauseId] = useState<number>(1);
  const [scenario, setScenario] = useState<EmailScenarioId>('three_tier_anchor');
  const [brandName, setBrandName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [offeredBudget, setOfferedBudget] = useState<number>(0);
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [customClauses, setCustomClauses] = useState<string>(loadSavedCustomClauses);
  const [includeCustomInDraft, setIncludeCustomInDraft] = useState<boolean>(true);
  const [negotiationLog, setNegotiationLog] = useState<NegotiationLogEntry[]>(
    loadSavedNegotiationLog
  );
  const [manuallyReviewedIds, setManuallyReviewedIds] = useState<number[]>(
    loadSavedReviewedClauses
  );
  const [inlineLogNote, setInlineLogNote] = useState('');
  const scannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_CLAUSES_STORAGE_KEY, customClauses);
    } catch {
      // Ignore storage quota errors in restricted browser contexts
    }
  }, [customClauses]);

  useEffect(() => {
    try {
      localStorage.setItem(NEGOTIATION_LOG_STORAGE_KEY, JSON.stringify(negotiationLog));
    } catch {
      // Ignore storage quota errors in restricted browser contexts
    }
  }, [negotiationLog]);

  useEffect(() => {
    try {
      localStorage.setItem(
        REVIEWED_CLAUSES_STORAGE_KEY,
        JSON.stringify(manuallyReviewedIds)
      );
    } catch {
      // Ignore storage quota errors in restricted browser contexts
    }
  }, [manuallyReviewedIds]);

  const handleAddNegotiationLogEntry = (
    clauseId: number,
    entryType: NegotiationLogEntryType,
    note: string
  ) => {
    const trimmed = note.trim();
    if (!trimmed) return;
    const newEntry: NegotiationLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clauseId,
      entryType,
      note: trimmed,
      createdAt: new Date().toISOString(),
    };
    setNegotiationLog((prev) => [newEntry, ...prev]);
    onNotify(`Logged counter-offer note on Clause #${clauseId}.`);
  };

  const handleDeleteNegotiationLogEntry = (entryId: string) => {
    setNegotiationLog((prev) => prev.filter((item) => item.id !== entryId));
  };

  const handleClearNegotiationLog = () => {
    setNegotiationLog([]);
    onNotify('Cleared negotiation log history.');
  };

  const clauseNoteCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const entry of negotiationLog) {
      counts[entry.clauseId] = (counts[entry.clauseId] ?? 0) + 1;
    }
    return counts;
  }, [negotiationLog]);

  const reviewedClauseIds = useMemo(() => {
    const set = new Set<number>();
    for (const id of manuallyReviewedIds) set.add(id);
    for (const id of flaggedClauseIds) set.add(id);
    for (const entry of negotiationLog) set.add(entry.clauseId);
    return set;
  }, [manuallyReviewedIds, flaggedClauseIds, negotiationLog]);

  const pendingClauseIds = useMemo(
    () =>
      CONTRACT_RED_FLAGS.map((c) => c.clauseId).filter(
        (id) => !reviewedClauseIds.has(id)
      ),
    [reviewedClauseIds]
  );

  const handleToggleReviewedClause = (clauseId: number) => {
    if (flaggedClauseIds.includes(clauseId) || (clauseNoteCounts[clauseId] ?? 0) > 0) {
      return;
    }
    setManuallyReviewedIds((prev) =>
      prev.includes(clauseId)
        ? prev.filter((id) => id !== clauseId)
        : [...prev, clauseId]
    );
  };

  const handleJumpToNextPending = () => {
    if (pendingClauseIds.length === 0) return;
    const nextAfterCurrent =
      pendingClauseIds.find((id) => id > activeClauseId) ?? pendingClauseIds[0];
    setCategoryFilter('All');
    setWeightFilter('All');
    setActiveClauseId(nextAfterCurrent);
    scannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleMarkReviewedAndNext = (clauseId: number) => {
    if (!manuallyReviewedIds.includes(clauseId)) {
      setManuallyReviewedIds((prev) => [...prev, clauseId]);
    }
    const remainingPending = pendingClauseIds.filter((id) => id !== clauseId);
    if (remainingPending.length > 0) {
      const nextId =
        remainingPending.find((id) => id > clauseId) ?? remainingPending[0];
      setCategoryFilter('All');
      setWeightFilter('All');
      setActiveClauseId(nextId);
    } else {
      onNotify('All 15 contract clauses reviewed.');
    }
  };

  const handleMarkAllReviewed = () => {
    setManuallyReviewedIds(CONTRACT_RED_FLAGS.map((c) => c.clauseId));
    onNotify('Marked all 15 clauses as reviewed.');
  };

  const handleResetReviewed = () => {
    setManuallyReviewedIds([]);
    onNotify('Reset manual clause review progress.');
  };

  const trimmedCustomClauses = customClauses.trim();
  const hasCustomClauses = trimmedCustomClauses.length > 0;
  const activeCustomClausesForDraft = includeCustomInDraft ? trimmedCustomClauses : '';
  const customStipulationCount = hasCustomClauses
    ? trimmedCustomClauses
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter(Boolean).length
    : 0;

  const handleAppendCustomSnippet = (snippetText: string, label: string) => {
    setCustomClauses((prev) => {
      const cleaned = prev.trim();
      if (cleaned.includes(snippetText)) {
        return prev;
      }
      return cleaned ? `${cleaned}\n\n${snippetText}` : snippetText;
    });
    setIncludeCustomInDraft(true);
    onNotify(`Added "${label}" to Custom Clauses.`);
  };

  const handleSetClauseRiskWeight = (clauseId: number, weight: ClauseRiskWeight) => {
    setClauseRiskWeights((prev) => ({ ...prev, [clauseId]: weight }));
    if (!flaggedClauseIds.includes(clauseId)) {
      onToggleClause(clauseId);
    }
  };

  const handleResetClauseRiskWeight = (clauseId: number) => {
    setClauseRiskWeights((prev) => {
      const next = { ...prev };
      delete next[clauseId];
      return next;
    });
  };

  const hasCustomWeights = Object.keys(clauseRiskWeights).length > 0;

  const handleInspectClauseFromLibrary = (clauseId: number) => {
    setCategoryFilter('All');
    setWeightFilter('All');
    setClauseSearchQuery('');
    setActiveClauseId(clauseId);
    scannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleFlagPresetClauses = (clauseIds: number[]) => {
    for (const id of clauseIds) {
      if (!flaggedClauseIds.includes(id)) {
        onToggleClause(id);
      }
    }
  };

  const categories: Array<'All' | ClauseCategory> = [
    'All',
    'Payment',
    'Rights & IP',
    'Exclusivity',
    'Liability & Scope',
  ];

  const flaggedClauses = useMemo(() => {
    return CONTRACT_RED_FLAGS.filter((c) => flaggedClauseIds.includes(c.clauseId)).sort(
      (a, b) => {
        const rankA = RISK_WEIGHT_RANK[resolveClauseRiskWeight(a, clauseRiskWeights)];
        const rankB = RISK_WEIGHT_RANK[resolveClauseRiskWeight(b, clauseRiskWeights)];
        return rankB - rankA || a.clauseId - b.clauseId;
      }
    );
  }, [flaggedClauseIds, clauseRiskWeights]);

  const filteredClauses = useMemo(() => {
    const normalizedQuery = clauseSearchQuery.trim().toLowerCase();

    const byCategory =
      categoryFilter === 'All'
        ? CONTRACT_RED_FLAGS
        : CONTRACT_RED_FLAGS.filter((c) => c.category === categoryFilter);

    const byWeight =
      weightFilter === 'All'
        ? byCategory
        : byCategory.filter(
            (c) =>
              flaggedClauseIds.includes(c.clauseId) &&
              resolveClauseRiskWeight(c, clauseRiskWeights) === weightFilter
          );

    const bySearch =
      normalizedQuery === ''
        ? byWeight
        : byWeight.filter((c) => {
            const glossaryTerms = (CLAUSE_LEGAL_GLOSSARY[c.clauseId] ?? [])
              .map((g) => `${g.term} ${g.plainEnglish}`)
              .join(' ');
            const haystack = `${c.clauseId} #${c.clauseId} ${c.clauseTitle} ${c.category} ${c.redFlagPattern} ${c.advice} ${c.replacementText} ${glossaryTerms}`.toLowerCase();
            return haystack.includes(normalizedQuery);
          });

    if (!prioritizeByWeight) {
      return bySearch;
    }

    return [...bySearch].sort((a, b) => {
      const aFlagged = flaggedClauseIds.includes(a.clauseId);
      const bFlagged = flaggedClauseIds.includes(b.clauseId);
      if (aFlagged !== bFlagged) return aFlagged ? -1 : 1;
      if (aFlagged && bFlagged) {
        const rankA = RISK_WEIGHT_RANK[resolveClauseRiskWeight(a, clauseRiskWeights)];
        const rankB = RISK_WEIGHT_RANK[resolveClauseRiskWeight(b, clauseRiskWeights)];
        if (rankA !== rankB) return rankB - rankA;
      }
      return a.clauseId - b.clauseId;
    });
  }, [
    categoryFilter,
    weightFilter,
    clauseSearchQuery,
    prioritizeByWeight,
    flaggedClauseIds,
    clauseRiskWeights,
  ]);

  const activeClause =
    CONTRACT_RED_FLAGS.find((c) => c.clauseId === activeClauseId) ??
    CONTRACT_RED_FLAGS[0];
  const isActiveClauseFlagged = flaggedClauseIds.includes(activeClause.clauseId);
  const activeClauseWeight = resolveClauseRiskWeight(activeClause, clauseRiskWeights);
  const activeClauseDefaultWeight = getDefaultClauseRiskWeight(activeClause);
  const isActiveClauseWeightCustom =
    clauseRiskWeights[activeClause.clauseId] !== undefined &&
    clauseRiskWeights[activeClause.clauseId] !== activeClauseDefaultWeight;

  const riskAssessment = useMemo(
    () =>
      calculateContractRiskScore(
        flaggedClauses,
        CONTRACT_RED_FLAGS,
        clauseRiskWeights
      ),
    [flaggedClauses, clauseRiskWeights]
  );

  const cumulativeRiskWeightScore = useMemo(() => {
    return (
      riskAssessment.weightCounts.critical * RISK_WEIGHT_POINTS.critical +
      riskAssessment.weightCounts.moderate * RISK_WEIGHT_POINTS.moderate +
      riskAssessment.weightCounts.low * RISK_WEIGHT_POINTS.low
    );
  }, [riskAssessment.weightCounts]);

  const summaryBadgeTone =
    flaggedClauseIds.length === 0
      ? {
          container:
            'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
          score: 'text-slate-900 dark:text-slate-100',
          icon: 'text-emerald-700 dark:text-emerald-400',
        }
      : riskAssessment.level === 'critical'
        ? {
            container:
              'bg-red-50/80 dark:bg-red-950/50 border-red-200 dark:border-red-800/80 text-red-900 dark:text-red-200',
            score: 'text-red-700 dark:text-red-400',
            icon: 'text-red-700 dark:text-red-400',
          }
        : riskAssessment.level === 'high'
          ? {
              container:
                'bg-orange-50/80 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800/80 text-orange-900 dark:text-orange-200',
              score: 'text-orange-700 dark:text-orange-400',
              icon: 'text-orange-700 dark:text-orange-400',
            }
          : {
              container:
                'bg-amber-50/80 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200',
              score: 'text-amber-700 dark:text-amber-400',
              icon: 'text-amber-700 dark:text-amber-400',
            };

  const generatedEmail = useMemo(
    () =>
      generateNegotiationEmail({
        scenario,
        brandName,
        creatorName,
        offeredBudget,
        profile,
        scope,
        result,
        flaggedClauses,
        customClauses: activeCustomClausesForDraft,
        currency,
      }),
    [
      scenario,
      brandName,
      creatorName,
      offeredBudget,
      profile,
      scope,
      result,
      flaggedClauses,
      activeCustomClausesForDraft,
      currency,
    ]
  );

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify(`Copied ${label} to clipboard.`);
    } catch {
      onNotify('Unable to access clipboard in this browser context.');
    }
  };

  const handleCopyAllRedlines = () => {
    if (flaggedClauses.length === 0 && !activeCustomClausesForDraft) return;
    const sections: string[] = [];

    if (flaggedClauses.length > 0) {
      const redlineBundle = flaggedClauses
        .map((c) => {
          const weight = resolveClauseRiskWeight(c, clauseRiskWeights).toUpperCase();
          return `### [${weight} IMPACT] ${c.clauseId}. ${c.clauseTitle} (${c.category})\nIssue: ${c.advice}\n\nProposed Replacement Language:\n"${c.replacementText}"`;
        })
        .join('\n\n---\n\n');
      sections.push(redlineBundle);
    }

    if (activeCustomClausesForDraft) {
      sections.push(
        `### [CUSTOM STIPULATIONS] Creator Additional Legal Terms\n\n${activeCustomClausesForDraft}`
      );
    }

    const labelParts: string[] = [];
    if (flaggedClauses.length > 0) {
      labelParts.push(`${flaggedClauses.length} prioritized redline(s)`);
    }
    if (activeCustomClausesForDraft) {
      labelParts.push('custom clauses');
    }

    copyText(sections.join('\n\n---\n\n'), labelParts.join(' + '));
  };

  return (
    <section id="contract-audit" className="space-y-6 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            15-Clause Contract Red-Flag Audit & Counter-Pitch Scripts
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Screen brand agreements for predatory IP transfers, indefinite exclusivity, and delayed payouts—then generate copy-ready replacement clauses and negotiation replies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Flagged Clauses & Cumulative Risk Weight Summary Badge */}
          <div
            role="status"
            aria-label={`${flaggedClauseIds.length} of ${CONTRACT_RED_FLAGS.length} clauses flagged, cumulative risk weight score ${cumulativeRiskWeightScore} points`}
            title={`Cumulative Risk Weight: ${riskAssessment.weightCounts.critical} Critical (${riskAssessment.weightCounts.critical * RISK_WEIGHT_POINTS.critical} pts) + ${riskAssessment.weightCounts.moderate} Moderate (${riskAssessment.weightCounts.moderate * RISK_WEIGHT_POINTS.moderate} pts) + ${riskAssessment.weightCounts.low} Low (${riskAssessment.weightCounts.low * RISK_WEIGHT_POINTS.low} pts) = ${cumulativeRiskWeightScore} pts`}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap shrink-0 ${summaryBadgeTone.container}`}
          >
            {flaggedClauseIds.length === 0 ? (
              <ShieldCheck
                className={`w-3.5 h-3.5 shrink-0 ${summaryBadgeTone.icon}`}
                aria-hidden="true"
              />
            ) : (
              <ShieldAlert
                className={`w-3.5 h-3.5 shrink-0 ${summaryBadgeTone.icon}`}
                aria-hidden="true"
              />
            )}
            <span className="font-mono font-semibold tabular-nums">
              {flaggedClauseIds.length} / {CONTRACT_RED_FLAGS.length} Flagged
            </span>
            <span
              className="h-3.5 w-px bg-current opacity-20"
              aria-hidden="true"
            />
            <span className="font-mono tabular-nums">
              <span className="opacity-75">Risk Weight: </span>
              <strong className={`font-bold ${summaryBadgeTone.score}`}>
                {cumulativeRiskWeightScore} pts
              </strong>
            </span>
            {flaggedClauseIds.length > 0 && (
              <>
                <span
                  className="hidden sm:inline h-3.5 w-px bg-current opacity-20"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline font-mono text-[11px] tabular-nums opacity-85">
                  {riskAssessment.weightCounts.critical}C · {riskAssessment.weightCounts.moderate}M · {riskAssessment.weightCounts.low}L
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStrategyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            Negotiation Strategy
          </button>
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            Export Contract
          </button>
          {(flaggedClauseIds.length > 0 || activeCustomClausesForDraft.length > 0) && (
            <>
              <button
                type="button"
                onClick={handleCopyAllRedlines}
                className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {activeCustomClausesForDraft
                  ? 'Copy Contract Draft + Custom'
                  : 'Copy Flagged Redlines'}
              </button>
              {flaggedClauseIds.length > 0 && (
                <button
                  type="button"
                  onClick={onClearFlags}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Active Negotiation Session Timer */}
      <NegotiationSessionTimer onNotify={onNotify} />

      {/* Predatory Contract Risk Score Card with Circular Progress Ring */}
      {(() => {
        const ringStyles: Record<
          ContractRiskLevel,
          {
            stroke: string;
            badgeText: string;
            surfaceClass: string;
            barClass: string;
          }
        > = {
          low: {
            stroke: isDark ? '#34D399' : '#047857',
            badgeText: 'text-emerald-800 dark:text-emerald-400',
            surfaceClass: 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70',
            barClass: 'bg-emerald-700 dark:bg-emerald-500',
          },
          moderate: {
            stroke: isDark ? '#FBBF24' : '#D97706',
            badgeText: 'text-amber-800 dark:text-amber-400',
            surfaceClass: 'bg-amber-50/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70',
            barClass: 'bg-amber-600 dark:bg-amber-500',
          },
          high: {
            stroke: isDark ? '#FB923C' : '#EA580C',
            badgeText: 'text-orange-800 dark:text-orange-400',
            surfaceClass: 'bg-orange-50/50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/70',
            barClass: 'bg-orange-600 dark:bg-orange-500',
          },
          critical: {
            stroke: isDark ? '#F87171' : '#DC2626',
            badgeText: 'text-red-800 dark:text-red-400',
            surfaceClass: 'bg-red-50/50 dark:bg-red-950/40 border-red-200 dark:border-red-800/70',
            barClass: 'bg-red-600 dark:bg-red-500',
          },
        };

        const style = ringStyles[riskAssessment.level];
        const radius = 44;
        const circumference = 2 * Math.PI * radius;
        const dashOffset =
          circumference * (1 - Math.min(100, Math.max(1, riskAssessment.score)) / 100);

        return (
          <div
            aria-label="Contract risk score summary"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
          >
            {/* Circular Progress Ring + Headline Score */}
            <div className="lg:col-span-5 flex items-center gap-5">
              <div
                role="img"
                aria-label={`Contract risk score: ${riskAssessment.score} out of 100 (${riskAssessment.levelLabel})`}
                className="relative w-28 h-28 shrink-0 flex items-center justify-center"
              >
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 108 108">
                  <circle
                    cx="54"
                    cy="54"
                    r={radius}
                    fill="none"
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="10"
                  />
                  <circle
                    cx="54"
                    cy="54"
                    r={radius}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-[stroke-dashoffset,stroke] duration-300 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center tabular-nums">
                  <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">
                    {riskAssessment.score}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    / 100
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  {riskAssessment.level === 'low' ? (
                    <ShieldCheck
                      className={`w-4 h-4 shrink-0 ${style.badgeText}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <ShieldAlert
                      className={`w-4 h-4 shrink-0 ${style.badgeText}`}
                      aria-hidden="true"
                    />
                  )}
                  <span className={style.badgeText}>{riskAssessment.levelLabel}</span>
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                    {riskAssessment.weightCounts.critical} critical · {riskAssessment.weightCounts.moderate} moderate · {riskAssessment.weightCounts.low} low · {cumulativeRiskWeightScore} pts total weight
                  </span>
                </div>
                <h3 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                  Contract Predatory Risk Score
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {riskAssessment.summary}
                </p>
              </div>
            </div>

            {/* Category Exposure Breakdown + Top Drivers */}
            <div className="lg:col-span-7 space-y-3.5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                {riskAssessment.categoryBreakdown.map((cat) => {
                  const pct =
                    cat.totalCount > 0
                      ? Math.round((cat.flaggedCount / cat.totalCount) * 100)
                      : 0;
                  return (
                    <div
                      key={cat.category}
                      className={`p-2.5 rounded-lg border ${
                        cat.flaggedCount > 0
                          ? style.surfaceClass
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                      } space-y-1.5`}
                    >
                      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {cat.category}
                      </div>
                      <div className="flex items-baseline justify-between gap-1 font-mono text-xs">
                        <strong className="text-slate-900 dark:text-slate-100">
                          {cat.flaggedCount}/{cat.totalCount}
                        </strong>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          +{cat.weightPoints} pts
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200/80 dark:bg-slate-800 rounded-sm overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            cat.flaggedCount > 0 ? style.barClass : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mr-1">
                  Top Risk Drivers:
                </span>
                {riskAssessment.topDrivers.length === 0 ? (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Check clauses in the 15-clause scanner below to calculate exposure.
                  </span>
                ) : (
                  riskAssessment.topDrivers.map((driver) => (
                    <button
                      key={`driver-${driver.clauseId}`}
                      type="button"
                      onClick={() => setActiveClauseId(driver.clauseId)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span
                        className={`font-mono font-semibold ${
                          driver.riskWeight === 'critical'
                            ? 'text-red-700 dark:text-red-400'
                            : driver.riskWeight === 'moderate'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        +{driver.weightPoints}
                      </span>
                      <span>
                        #{driver.clauseId} {driver.clauseTitle}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Clause Review Completion Progress Tracker */}
      <AuditProgressBar
        totalClauses={CONTRACT_RED_FLAGS.length}
        reviewedCount={reviewedClauseIds.size}
        flaggedCount={flaggedClauseIds.length}
        hasManualReviews={manuallyReviewedIds.length > 0}
        onJumpToNextPending={handleJumpToNextPending}
        onMarkAllReviewed={handleMarkAllReviewed}
        onResetReviewed={handleResetReviewed}
      />

      {/* Financial Impact Risk Heatmap */}
      <ContractRiskHeatmap
        result={result}
        scope={scope}
        flaggedClauseIds={flaggedClauseIds}
        activeClauseId={activeClause.clauseId}
        onSelectClause={handleInspectClauseFromLibrary}
      />

      {/* Main 2-Column Audit + Script Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: 15-Clause Interactive Scanner */}
        <div
          ref={scannerRef}
          className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
        >
          {/* Category Filter Bar */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/70'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-pressed={prioritizeByWeight}
              onClick={() => setPrioritizeByWeight((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                prioritizeByWeight
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ArrowDownWideNarrow className="w-3.5 h-3.5" aria-hidden="true" />
              {prioritizeByWeight ? 'Sorted by Impact' : 'Sort by Impact'}
            </button>
          </div>

          {/* Risk Weight Priority Filter Bar */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold text-slate-600 dark:text-slate-400 mr-1">
                Risk Weight Filter:
              </span>
              {(
                [
                  { id: 'All', label: `All (${CONTRACT_RED_FLAGS.length})` },
                  {
                    id: 'critical',
                    label: `Critical (${riskAssessment.weightCounts.critical})`,
                  },
                  {
                    id: 'moderate',
                    label: `Moderate (${riskAssessment.weightCounts.moderate})`,
                  },
                  { id: 'low', label: `Low (${riskAssessment.weightCounts.low})` },
                ] as const
              ).map((tab) => {
                const active = weightFilter === tab.id;
                return (
                  <button
                    key={`wf-${tab.id}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setWeightFilter(tab.id)}
                    className={`px-2 py-1 font-mono font-medium rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? tab.id === 'critical'
                          ? 'bg-red-700 dark:bg-red-600 text-white border-red-700 dark:border-red-600'
                          : tab.id === 'moderate'
                            ? 'bg-amber-600 dark:bg-amber-500 text-white border-amber-600 dark:border-amber-500'
                            : tab.id === 'low'
                              ? 'bg-slate-700 dark:bg-slate-600 text-white border-slate-700 dark:border-slate-600'
                              : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {hasCustomWeights && (
              <button
                type="button"
                onClick={() => setClauseRiskWeights({})}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset Weights
              </button>
            )}
          </div>

          {/* Search Clauses by Name, Pattern, or Legal Term */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40">
            <div className="relative flex items-center">
              <Search
                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={clauseSearchQuery}
                onChange={(e) => setClauseSearchQuery(e.target.value)}
                placeholder="Search 15 clauses by name, description, or legal term (e.g., perpetuity, Net-60, ROFR)..."
                aria-label="Filter and search contract clauses by name or description"
                className="w-full pl-8 pr-20 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              {clauseSearchQuery.trim() !== '' && (
                <div className="absolute right-2 flex items-center gap-1.5">
                  <span className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                    {filteredClauses.length}/{CONTRACT_RED_FLAGS.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setClauseSearchQuery('')}
                    aria-label="Clear clause search"
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Clause List */}
            <div className="md:col-span-6 divide-y divide-slate-100 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
              {filteredClauses.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {clauseSearchQuery.trim() !== ''
                      ? `No clauses match "${clauseSearchQuery.trim()}".`
                      : `No flagged clauses match the "${weightFilter}" Risk Weight filter.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setWeightFilter('All');
                      setCategoryFilter('All');
                      setClauseSearchQuery('');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
                  >
                    Show All Clauses
                  </button>
                </div>
              ) : (
                filteredClauses.map((clause) => {
                  const isFlagged = flaggedClauseIds.includes(clause.clauseId);
                  const isReviewed = reviewedClauseIds.has(clause.clauseId);
                  const isSelected = activeClause.clauseId === clause.clauseId;
                  const currentWeight = resolveClauseRiskWeight(
                    clause,
                    clauseRiskWeights
                  );
                  const weightOption = RISK_WEIGHT_OPTIONS.find(
                    (o) => o.id === currentWeight
                  )!;

                  return (
                    <div
                      key={clause.clauseId}
                      className={`p-3.5 space-y-2 transition-colors ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleClause(clause.clauseId)}
                          aria-label={`Flag ${clause.clauseTitle}`}
                          className="mt-0.5 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer shrink-0"
                        >
                          {isFlagged ? (
                            <CheckSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0 space-y-1">
                          <button
                            type="button"
                            onClick={() => setActiveClauseId(clause.clauseId)}
                            className="w-full text-left cursor-pointer flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {clause.clauseId}. {clause.clauseTitle}
                            </span>
                            <span
                              className={`text-[11px] font-medium shrink-0 ${
                                isFlagged
                                  ? weightOption.textClass
                                  : clause.severity === 'critical'
                                    ? 'text-red-700 dark:text-red-400'
                                    : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {isFlagged
                                ? `${weightOption.label} Impact`
                                : clause.severity === 'critical'
                                  ? 'Critical'
                                  : 'Warning'}
                            </span>
                          </button>

                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveClauseId(clause.clauseId)}
                              className="text-[11px] text-slate-500 dark:text-slate-400 truncate text-left cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
                            >
                              {clause.category}
                              {isFlagged ? (
                                ` · Flagged · +${RISK_WEIGHT_POINTS[currentWeight]} pts`
                              ) : isReviewed ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                  {' '}
                                  · Reviewed
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">
                                  {' '}
                                  · Pending
                                </span>
                              )}
                              {clauseNoteCounts[clause.clauseId]
                                ? ` · ${clauseNoteCounts[clause.clauseId]} ${
                                    clauseNoteCounts[clause.clauseId] === 1
                                      ? 'note'
                                      : 'notes'
                                  }`
                                : ''}
                            </button>
                            <ClauseLegalGlossaryPopover
                              clauseId={clause.clauseId}
                              clauseTitle={clause.clauseTitle}
                              variant="compact"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Inline Risk Weight Toggle for Flagged Clauses */}
                      {isFlagged && (
                        <div className="pl-7 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            Risk Weight
                          </span>
                          <div
                            role="group"
                            aria-label={`Risk weight for ${clause.clauseTitle}`}
                            className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-0.5"
                          >
                            {RISK_WEIGHT_OPTIONS.map((opt) => {
                              const isWeightActive = currentWeight === opt.id;
                              return (
                                <button
                                  key={`${clause.clauseId}-${opt.id}`}
                                  type="button"
                                  aria-pressed={isWeightActive}
                                  onClick={() =>
                                    handleSetClauseRiskWeight(clause.clauseId, opt.id)
                                  }
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                    isWeightActive
                                      ? opt.activeClass
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Active Clause Detail & Replacement Text */}
            <div className="md:col-span-6 p-5 space-y-4 bg-white dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Clause {activeClause.clauseId} · {activeClause.category}
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {activeClause.clauseTitle}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                    isActiveClauseFlagged
                      ? RISK_WEIGHT_OPTIONS.find((o) => o.id === activeClauseWeight)!
                          .textClass
                      : activeClause.severity === 'critical'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {activeClauseWeight === 'critical' ? (
                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {isActiveClauseFlagged
                    ? `${
                        RISK_WEIGHT_OPTIONS.find((o) => o.id === activeClauseWeight)!.label
                      } Impact`
                    : activeClause.severity === 'critical'
                      ? 'Critical'
                      : 'Warning'}
                </span>
              </div>

              {/* Review Status & Legal Definitions Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(() => {
                    const isActiveReviewed = reviewedClauseIds.has(activeClause.clauseId);
                    const isAutoReviewed =
                      isActiveClauseFlagged ||
                      (clauseNoteCounts[activeClause.clauseId] ?? 0) > 0;
                    return (
                      <>
                        <button
                          type="button"
                          disabled={isAutoReviewed}
                          onClick={() =>
                            handleToggleReviewedClause(activeClause.clauseId)
                          }
                          aria-pressed={isActiveReviewed}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                            isActiveReviewed
                              ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
                          } ${isAutoReviewed ? 'cursor-default' : 'cursor-pointer'}`}
                          title={
                            isAutoReviewed
                              ? 'Automatically counted as reviewed because this clause is flagged or has logged notes.'
                              : undefined
                          }
                        >
                          <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                          {isActiveReviewed ? 'Reviewed' : 'Mark Reviewed'}
                        </button>

                        {!isActiveReviewed && (
                          <button
                            type="button"
                            onClick={() =>
                              handleMarkReviewedAndNext(activeClause.clauseId)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100/80 dark:hover:bg-blue-900/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Reviewed &amp; Next
                            <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>

                <ClauseLegalGlossaryPopover
                  clauseId={activeClause.clauseId}
                  clauseTitle={activeClause.clauseTitle}
                  variant="labeled"
                />
              </div>

              {/* Risk Weight Classification Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    Negotiation Risk Weight
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    <span>
                      {isActiveClauseFlagged
                        ? `+${RISK_WEIGHT_POINTS[activeClauseWeight]} pts`
                        : 'Select to flag & classify'}
                    </span>
                    {isActiveClauseWeightCustom && (
                      <button
                        type="button"
                        onClick={() => handleResetClauseRiskWeight(activeClause.clauseId)}
                        className="font-sans text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Reset default
                      </button>
                    )}
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={`Classify negotiation risk weight for ${activeClause.clauseTitle}`}
                  className="grid grid-cols-3 gap-1.5"
                >
                  {RISK_WEIGHT_OPTIONS.map((opt) => {
                    const selected = isActiveClauseFlagged && activeClauseWeight === opt.id;
                    return (
                      <button
                        key={`detail-${opt.id}`}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          handleSetClauseRiskWeight(activeClause.clauseId, opt.id)
                        }
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          selected
                            ? opt.activeClass
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isActiveClauseFlagged
                    ? RISK_WEIGHT_OPTIONS.find((o) => o.id === activeClauseWeight)!
                        .priorityHint
                    : `Default baseline: ${
                        RISK_WEIGHT_OPTIONS.find(
                          (o) => o.id === activeClauseDefaultWeight
                        )!.label
                      } impact. Picking a weight flags this clause in your priority queue.`}
                </p>
              </div>

              <div className="text-xs space-y-2">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    What to Watch For
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {activeClause.redFlagPattern}
                  </p>
                </div>

                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    Commercial & Legal Risk
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {activeClause.advice}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Recommended Replacement Language
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        activeClause.replacementText,
                        `Clause ${activeClause.clauseId} replacement text`
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" aria-hidden="true" />
                    Copy Clause Fix
                  </button>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                  {activeClause.replacementText}
                </div>
              </div>

              {/* Inline Quick Counter-Offer Log for Active Clause */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Clause #{activeClause.clauseId} Counter-Offer Log
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {clauseNoteCounts[activeClause.clauseId] ?? 0}{' '}
                    {(clauseNoteCounts[activeClause.clauseId] ?? 0) === 1
                      ? 'entry'
                      : 'entries'}
                  </span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!inlineLogNote.trim()) return;
                    handleAddNegotiationLogEntry(
                      activeClause.clauseId,
                      'creator_counter',
                      inlineLogNote
                    );
                    setInlineLogNote('');
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inlineLogNote}
                    onChange={(e) => setInlineLogNote(e.target.value)}
                    placeholder={`Quick-log counter-offer note for Clause #${activeClause.clauseId}...`}
                    aria-label={`Quick-log counter-offer note for ${activeClause.clauseTitle}`}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  <button
                    type="submit"
                    disabled={inlineLogNote.trim().length === 0}
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-md hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Append
                  </button>
                </form>
                {(clauseNoteCounts[activeClause.clauseId] ?? 0) > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {negotiationLog
                      .filter((entry) => entry.clauseId === activeClause.clauseId)
                      .slice(0, 2)
                      .map((entry) => (
                        <div
                          key={`inline-${entry.id}`}
                          className="text-[11px] text-slate-600 dark:text-slate-300 flex items-baseline justify-between gap-2"
                        >
                          <span className="truncate">{entry.note}</span>
                          <span className="font-mono tabular-nums text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                            {new Intl.DateTimeFormat(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            }).format(new Date(entry.createdAt))}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Contextual Negotiation Email Generator */}
        <div
          id="negotiation-scripts"
          className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 scroll-mt-24"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-700 dark:text-slate-300" aria-hidden="true" />
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Contextual Negotiation Email Generator
              </h3>
            </div>
          </div>

          {/* Scenario Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScenario(item.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                  scenario === item.id
                    ? 'border-blue-700 dark:border-blue-600 bg-blue-700 dark:bg-blue-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Personalization Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label
                htmlFor="script-brand"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Brand Name
              </label>
              <input
                id="script-brand"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label
                htmlFor="script-creator"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Your Name
              </label>
              <input
                id="script-creator"
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g., Alex Rivera"
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label
                htmlFor="script-budget"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Brand Offer (USD)
              </label>
              <input
                id="script-budget"
                type="number"
                min={0}
                step={100}
                value={offeredBudget || ''}
                onChange={(e) => setOfferedBudget(Number(e.target.value) || 0)}
                placeholder="Optional"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md focus:outline-none focus:border-blue-600"
              />
              {currency !== 'USD' && offeredBudget > 0 && (
                <div className="text-[10px] font-mono text-blue-700 dark:text-blue-400 mt-0.5">
                  ≈ {formatCurrencyExact(offeredBudget, currency)}
                </div>
              )}
            </div>
          </div>

          {/* Generated Email Preview */}
          <div className="space-y-2">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Subject: </span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                {generatedEmail.subject}
              </span>
            </div>
            <textarea
              readOnly
              rows={13}
              aria-label="Generated counter-negotiation email"
              value={generatedEmail.body}
              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {flaggedClauses.length > 0 && activeCustomClausesForDraft
                ? `Includes ${flaggedClauses.length} redline(s) + custom stipulations.`
                : activeCustomClausesForDraft
                  ? 'Includes your custom legal stipulations.'
                  : flaggedClauses.length > 0
                    ? `Includes ${flaggedClauses.length} flagged contract redline note(s).`
                    : 'Auto-populated with your live calculated rates.'}
            </span>
            <button
              type="button"
              onClick={() =>
                copyText(
                  `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`,
                  'negotiation email'
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              Copy Email Script
            </button>
          </div>
        </div>
      </div>

      {/* Timestamped Clause Negotiation Log */}
      <NegotiationLogPanel
        entries={negotiationLog}
        activeClauseId={activeClause.clauseId}
        flaggedClauseIds={flaggedClauseIds}
        onAddEntry={handleAddNegotiationLogEntry}
        onDeleteEntry={handleDeleteNegotiationLogEntry}
        onClearAllEntries={handleClearNegotiationLog}
        onSelectClause={handleInspectClauseFromLibrary}
        onCopyText={copyText}
      />

      {/* Custom Clauses Editor for Final Contract Drafts */}
      <div
        aria-label="Custom contract clauses"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2">
              <FilePenLine
                className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
                aria-hidden="true"
              />
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Custom Clauses
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Draft your own custom legal stipulations to append to final contract redline packages and negotiation replies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span>
              {customStipulationCount}{' '}
              {customStipulationCount === 1 ? 'stipulation' : 'stipulations'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{customClauses.length} chars</span>
          </div>
        </div>

        {/* Starter Clause Snippets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mr-1">
            Quick Insert:
          </span>
          {CUSTOM_CLAUSE_SNIPPETS.map((snippet) => (
            <button
              key={snippet.id}
              type="button"
              onClick={() => handleAppendCustomSnippet(snippet.text, snippet.label)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3 h-3 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              {snippet.label}
            </button>
          ))}
        </div>

        {/* Custom Legal Stipulations Text Area */}
        <div>
          <label
            htmlFor="custom-contract-clauses"
            className="sr-only"
          >
            Custom legal stipulations for final contract draft
          </label>
          <textarea
            id="custom-contract-clauses"
            rows={5}
            value={customClauses}
            onChange={(e) => setCustomClauses(e.target.value)}
            placeholder="Write your custom contract clauses or special deal stipulations here (separate multiple clauses with a blank line)&#10;&#10;Example: Brand agrees not to use Creator’s likeness or deliverables for AI model training without separate written consent."
            className="w-full p-3.5 text-xs sm:text-sm font-mono bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-sans leading-relaxed focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-y"
          />
        </div>

        {/* Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeCustomInDraft}
              onChange={(e) => setIncludeCustomInDraft(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-700 dark:accent-blue-500 cursor-pointer"
            />
            <span>Include custom clauses in final contract draft &amp; email script</span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {hasCustomClauses && (
              <button
                type="button"
                onClick={() => {
                  setCustomClauses('');
                  onNotify('Cleared custom clauses.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Clear
              </button>
            )}
            <button
              type="button"
              disabled={!hasCustomClauses}
              onClick={() => copyText(trimmedCustomClauses, 'custom contract clauses')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              Copy Custom Clauses
            </button>
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              Export Contract
            </button>
          </div>
        </div>
      </div>

      {/* Searchable Legal Library */}
      <LegalLibraryPanel
        flaggedClauseIds={flaggedClauseIds}
        onToggleClause={onToggleClause}
        onInspectClauseInScanner={handleInspectClauseFromLibrary}
        onCopyText={copyText}
      />

      {/* AI Contract Negotiation Strategy Modal */}
      <ContractNegotiationStrategyModal
        open={strategyModalOpen}
        onClose={() => setStrategyModalOpen(false)}
        profile={profile}
        scope={scope}
        result={result}
        flaggedClauses={flaggedClauses}
        riskAssessment={riskAssessment}
        initialBrandName={brandName}
        onFlagPresetClauses={handleFlagPresetClauses}
        onCopyText={copyText}
      />

      {/* Plain-Text Contract Export Modal */}
      <ContractExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        brandName={brandName}
        creatorName={creatorName}
        onChangeBrandName={setBrandName}
        onChangeCreatorName={setCreatorName}
        profile={profile}
        scope={scope}
        result={result}
        flaggedClauses={flaggedClauses}
        clauseRiskWeights={clauseRiskWeights}
        customClauses={activeCustomClausesForDraft}
        onCopyText={copyText}
      />
    </section>
  );
};
