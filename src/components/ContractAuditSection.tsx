import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  Copy,
  Mail,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Square,
} from 'lucide-react';
import { CONTRACT_RED_FLAGS } from '../data/benchmarks';
import {
  CalculatedDealResult,
  ClauseCategory,
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
} from '../utils/pricingEngine';
import { ContractNegotiationStrategyModal } from './ContractNegotiationStrategyModal';
import { LegalLibraryPanel } from './LegalLibraryPanel';

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
  const [activeClauseId, setActiveClauseId] = useState<number>(1);
  const [scenario, setScenario] = useState<EmailScenarioId>('three_tier_anchor');
  const [brandName, setBrandName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [offeredBudget, setOfferedBudget] = useState<number>(0);
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const scannerRef = useRef<HTMLDivElement | null>(null);

  const handleInspectClauseFromLibrary = (clauseId: number) => {
    setCategoryFilter('All');
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

  const filteredClauses = useMemo(() => {
    if (categoryFilter === 'All') return CONTRACT_RED_FLAGS;
    return CONTRACT_RED_FLAGS.filter((c) => c.category === categoryFilter);
  }, [categoryFilter]);

  const activeClause =
    CONTRACT_RED_FLAGS.find((c) => c.clauseId === activeClauseId) ??
    CONTRACT_RED_FLAGS[0];

  const flaggedClauses = useMemo(
    () => CONTRACT_RED_FLAGS.filter((c) => flaggedClauseIds.includes(c.clauseId)),
    [flaggedClauseIds]
  );

  const riskAssessment = useMemo(
    () => calculateContractRiskScore(flaggedClauses, CONTRACT_RED_FLAGS),
    [flaggedClauses]
  );

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
        currency,
      }),
    [scenario, brandName, creatorName, offeredBudget, profile, scope, result, flaggedClauses, currency]
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
    if (flaggedClauses.length === 0) return;
    const bundle = flaggedClauses
      .map(
        (c) =>
          `### ${c.clauseId}. ${c.clauseTitle} (${c.category})\nIssue: ${c.advice}\n\nProposed Replacement Language:\n"${c.replacementText}"`
      )
      .join('\n\n---\n\n');
    copyText(bundle, `${flaggedClauses.length} flagged contract redlines`);
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
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {flaggedClauseIds.length} / 15 flagged
          </span>
          <button
            type="button"
            onClick={() => setStrategyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            Negotiation Strategy
          </button>
          {flaggedClauseIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopyAllRedlines}
                className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Copy Flagged Redlines
              </button>
              <button
                type="button"
                onClick={onClearFlags}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

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
                    {riskAssessment.criticalCount} critical, {riskAssessment.warningCount} warning
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
                          driver.severity === 'critical'
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-amber-700 dark:text-amber-400'
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

      {/* Main 2-Column Audit + Script Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: 15-Clause Interactive Scanner */}
        <div
          ref={scannerRef}
          className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
        >
          {/* Category Filter Bar */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Clause List */}
            <div className="md:col-span-6 divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
              {filteredClauses.map((clause) => {
                const isFlagged = flaggedClauseIds.includes(clause.clauseId);
                const isSelected = activeClause.clauseId === clause.clauseId;
                return (
                  <div
                    key={clause.clauseId}
                    className={`p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50/60 dark:bg-blue-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
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

                    <button
                      type="button"
                      onClick={() => setActiveClauseId(clause.clauseId)}
                      className="flex-1 text-left cursor-pointer min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {clause.clauseId}. {clause.clauseTitle}
                        </span>
                        <span
                          className={`text-[11px] font-medium shrink-0 ${
                            clause.severity === 'critical'
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {clause.severity === 'critical' ? 'Critical' : 'Warning'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {clause.category}
                        {isFlagged ? ' · Flagged in draft' : ''}
                      </div>
                    </button>
                  </div>
                );
              })}
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
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    activeClause.severity === 'critical'
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {activeClause.severity === 'critical' ? (
                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {activeClause.severity === 'critical' ? 'Critical' : 'Warning'}
                </span>
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
              {flaggedClauses.length > 0
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
    </section>
  );
};
