import React from 'react';
import { Lock, Moon, Sparkles, Sun } from 'lucide-react';
import { CURRENCY_ORDER } from '../data/benchmarks';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
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
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-6">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigateSection('calculator')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          Creator Rate Studio
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <button
            type="button"
            onClick={() => onNavigateSection('calculator')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
              activeView === 'workbench'
                ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            Calculator
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('packages')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Packages
          </button>
          <button
            type="button"
            onClick={onOpenComparison}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer tabular-nums focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
              activeView === 'comparison'
                ? 'border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {savedDealsCount > 0 ? `Compare (${savedDealsCount})` : 'Compare Deals'}
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('contract-audit')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Contract Audit
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('benchmarks')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Benchmarks
          </button>
        </nav>

        {/* Zone 3: Theme Toggle + Currency Switcher + Plan Status + Primary Export Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" aria-hidden="true" />
            )}
            <span className="hidden xl:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <select
              aria-label="Display currency"
              value={currency}
              onChange={(e) => selectCurrency(e.target.value as CurrencyCode)}
              className="px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                  : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
            >
              {planTier === 'pro' ? (
                <>
                  <Sparkles className="w-3 h-3 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                  <span>Pro · 7/7</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  <span>Free · 2/7</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onExportRateCard}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white dark:text-slate-950 bg-slate-900 dark:bg-slate-100 rounded-lg hover:bg-slate-800 dark:hover:bg-white active:bg-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Export Rate Card
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="md:hidden border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600 dark:text-slate-400">
        <button
          type="button"
          onClick={() => onNavigateSection('calculator')}
          className="whitespace-nowrap shrink-0 py-1 text-slate-900 dark:text-slate-100"
        >
          Calculator
        </button>
        <button
          type="button"
          onClick={() => onNavigateSection('packages')}
          className="whitespace-nowrap shrink-0 py-1 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Packages
        </button>
        <button
          type="button"
          onClick={onOpenComparison}
          className={`whitespace-nowrap shrink-0 py-1 tabular-nums ${
            activeView === 'comparison'
              ? 'text-blue-700 dark:text-blue-400 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          {savedDealsCount > 0 ? `Compare (${savedDealsCount})` : 'Compare Deals'}
        </button>
        <button
          type="button"
          onClick={() => onNavigateSection('contract-audit')}
          className="whitespace-nowrap shrink-0 py-1 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Contract Audit
        </button>
        <button
          type="button"
          onClick={() => onNavigateSection('benchmarks')}
          className="whitespace-nowrap shrink-0 py-1 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Benchmarks
        </button>
      </div>
    </header>
  );
};
