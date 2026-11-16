import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckSquare, Copy, Mail, ShieldAlert, Square } from 'lucide-react';
import { CONTRACT_RED_FLAGS } from '../data/benchmarks';
import {
  CalculatedDealResult,
  ClauseCategory,
  CreatorProfile,
  DealScope,
  EmailScenarioId,
} from '../types/calculator';
import { generateNegotiationEmail } from '../utils/pricingEngine';

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
  const [categoryFilter, setCategoryFilter] = useState<'All' | ClauseCategory>('All');
  const [activeClauseId, setActiveClauseId] = useState<number>(1);
  const [scenario, setScenario] = useState<EmailScenarioId>('three_tier_anchor');
  const [brandName, setBrandName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [offeredBudget, setOfferedBudget] = useState<number>(0);

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
      }),
    [scenario, brandName, creatorName, offeredBudget, profile, scope, result, flaggedClauses]
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
          <h2 className="font-display text-xl font-bold text-slate-900">
            15-Clause Contract Red-Flag Audit & Counter-Pitch Scripts
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Screen brand agreements for predatory IP transfers, indefinite exclusivity, and delayed payouts—then generate copy-ready replacement clauses and negotiation replies.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono font-semibold text-slate-900">
            {flaggedClauseIds.length} / 15 flagged
          </span>
          {flaggedClauseIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopyAllRedlines}
                className="px-3 py-1.5 font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Copy Flagged Redlines
              </button>
              <button
                type="button"
                onClick={onClearFlags}
                className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main 2-Column Audit + Script Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: 15-Clause Interactive Scanner */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Category Filter Bar */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Clause List */}
            <div className="md:col-span-6 divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {filteredClauses.map((clause) => {
                const isFlagged = flaggedClauseIds.includes(clause.clauseId);
                const isSelected = activeClause.clauseId === clause.clauseId;
                return (
                  <div
                    key={clause.clauseId}
                    className={`p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleClause(clause.clauseId)}
                      aria-label={`Flag ${clause.clauseTitle}`}
                      className="mt-0.5 text-slate-600 hover:text-blue-700 cursor-pointer shrink-0"
                    >
                      {isFlagged ? (
                        <CheckSquare className="w-4 h-4 text-blue-700" />
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
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {clause.clauseId}. {clause.clauseTitle}
                        </span>
                        <span
                          className={`text-[11px] font-medium shrink-0 ${
                            clause.severity === 'critical'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {clause.severity === 'critical' ? 'Critical' : 'Warning'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {clause.category}
                        {isFlagged ? ' · Flagged in draft' : ''}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Active Clause Detail & Replacement Text */}
            <div className="md:col-span-6 p-5 space-y-4 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500">
                    Clause {activeClause.clauseId} · {activeClause.category}
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900 mt-0.5">
                    {activeClause.clauseTitle}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    activeClause.severity === 'critical'
                      ? 'text-red-700'
                      : 'text-amber-700'
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
                  <div className="font-semibold text-slate-700 mb-0.5">
                    What to Watch For
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {activeClause.redFlagPattern}
                  </p>
                </div>

                <div>
                  <div className="font-semibold text-slate-700 mb-0.5">
                    Commercial & Legal Risk
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {activeClause.advice}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800">
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
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" aria-hidden="true" />
                    Copy Clause Fix
                  </button>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed font-mono">
                  {activeClause.replacementText}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Contextual Negotiation Email Generator */}
        <div
          id="negotiation-scripts"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4 scroll-mt-24"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-700" aria-hidden="true" />
              <h3 className="font-display text-base font-semibold text-slate-900">
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
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Brand Name
              </label>
              <input
                id="script-brand"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label
                htmlFor="script-creator"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Your Name
              </label>
              <input
                id="script-creator"
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g., Alex Rivera"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label
                htmlFor="script-budget"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Brand Offer ($)
              </label>
              <input
                id="script-budget"
                type="number"
                min={0}
                step={100}
                value={offeredBudget || ''}
                onChange={(e) => setOfferedBudget(Number(e.target.value) || 0)}
                placeholder="Optional"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Generated Email Preview */}
          <div className="space-y-2">
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="font-semibold text-slate-600">Subject: </span>
              <span className="text-slate-900 font-medium">
                {generatedEmail.subject}
              </span>
            </div>
            <textarea
              readOnly
              rows={13}
              aria-label="Generated counter-negotiation email"
              value={generatedEmail.body}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed focus:outline-none resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              Copy Email Script
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
