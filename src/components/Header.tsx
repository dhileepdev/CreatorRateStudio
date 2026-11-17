import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { CURRENCY_ORDER } from '../data/benchmarks';
import { useCurrency } from '../context/CurrencyContext';
import { AppView, CurrencyCode } from '../types/calculator';

interface HeaderProps {
  activeView: AppView;
  savedDealsCount: number;
  onNavigateSection: (sectionId: string) => void;
  onOpenComparison: () => void;
  onExportRateCard: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  savedDealsCount,
  onNavigateSection,
  onOpenComparison,
  onExportRateCard,
}) => {
  const { currency, currencySpecs, planTier, selectCurrency, openProModal } =
    useCurrency();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-6">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigateSection('calculator')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-blue-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          Creator Rate Studio
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => onNavigateSection('calculator')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
              activeView === 'workbench'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Calculator
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('packages')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Packages
          </button>
          <button
            type="button"
            onClick={onOpenComparison}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer tabular-nums focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
              activeView === 'comparison'
                ? 'border-blue-700 text-blue-700 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {savedDealsCount > 0 ? `Compare (${savedDealsCount})` : 'Compare Deals'}
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('contract-audit')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Contract Audit
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('benchmarks')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Benchmarks
          </button>
        </nav>

        {/* Zone 3: Currency Switcher + Plan Status + Primary Export Action */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <select
              aria-label="Display currency"
              value={currency}
              onChange={(e) => selectCurrency(e.target.value as CurrencyCode)}
              className="px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              {CURRENCY_ORDER.map((code) => {
                const spec = currencySpecs[code];
                const locked = spec.tier === 'pro' && planTier !== 'pro';
                return (
                  <option key={code} value={code}>
                    {spec.code} ({spec.symbol}){locked ? ' · Pro' : ''}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={() => openProModal(null)}
              title={
                planTier === 'pro'
                  ? 'Pro Multi-Currency active (all 7 currencies unlocked)'
                  : 'Free Plan: Limited availability (USD & EUR). Click to unlock Pro currencies.'
              }
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                planTier === 'pro'
                  ? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
                  : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              {planTier === 'pro' ? (
                <>
                  <Sparkles className="w-3 h-3 text-blue-700" aria-hidden="true" />
                  <span>Pro · 7/7</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-amber-700" aria-hidden="true" />
                  <span>Free · 2/7</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onExportRateCard}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:bg-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Export Rate Card
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600">
        <button
          type="button"
          onClick={() => onNavigateSection('calculator')}
          className="whitespace-nowrap shrink-0 py-1 text-slate-900"
        >
          Calculator
        </button>
        <button
          type="button"
          onClick={() => onNavigateSection('packages')}
          className="whitespace-nowrap shrink-0 py-1"
        >
          Packages
        </button>
        <button
          type="button"
          onClick={onOpenComparison}
          className={`whitespace-nowrap shrink-0 py-1 tabular-nums ${
            activeView === 'comparison' ? 'text-blue-700 font-semibold' : ''
          }`}
        >
          {savedDealsCount > 0 ? `Compare (${savedDealsCount})` : 'Compare Deals'}
        </button>
        <button
          type="button"
          onClick={() => onNavigateSection('contract-audit')}
          className="whitespace-nowrap shrink-0 py-1"
        >
          Contract Audit
        </button>
        <button
          type="button"
          onClick={() => onNavigateSection('benchmarks')}
          className="whitespace-nowrap shrink-0 py-1"
        >
          Benchmarks
        </button>
      </div>
    </header>
  );
};
