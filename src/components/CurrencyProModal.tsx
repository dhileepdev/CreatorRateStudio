import React, { useEffect } from 'react';
import { CheckCircle2, Globe2, Lock, RefreshCw, Sparkles, X } from 'lucide-react';
import { CURRENCY_ORDER } from '../data/benchmarks';
import { useCurrency } from '../context/CurrencyContext';

export const CurrencyProModal: React.FC<{
  onNotify?: (message: string) => void;
}> = ({ onNotify }) => {
  const {
    currency,
    currencySpecs,
    planTier,
    proModalOpen,
    requestedProCurrency,
    fxMetadata,
    closeProModal,
    activateProPreview,
    switchToFreePlan,
    selectCurrency,
    refreshRates,
  } = useCurrency();

  useEffect(() => {
    if (!proModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeProModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [proModalOpen, closeProModal]);

  if (!proModalOpen) return null;

  const requestedSpec = requestedProCurrency
    ? currencySpecs[requestedProCurrency]
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 dark:bg-slate-950/75 backdrop-blur-xs"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeProModal();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="currency-pro-modal-title"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Globe2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Multi-Currency Localization &amp; Pro Access</span>
            </div>
            <h2
              id="currency-pro-modal-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              {requestedSpec
                ? `Unlock ${requestedSpec.code} (${requestedSpec.symbol}) — ${requestedSpec.name}`
                : planTier === 'pro'
                ? 'Pro Multi-Currency Suite Active'
                : 'Multi-Currency Support: Limited Availability vs. Pro'}
            </h2>
          </div>

          <button
            type="button"
            onClick={closeProModal}
            aria-label="Close currency plan modal"
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {requestedSpec && planTier !== 'pro' && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-lg flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
              <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong>{requestedSpec.code} ({requestedSpec.symbol})</strong> requires the{' '}
                <strong>Pro Multi-Currency Suite</strong>. Free accounts include limited availability with{' '}
                <strong>USD ($)</strong> and <strong>EUR (€)</strong>.
              </div>
            </div>
          )}

          {/* Plan Tier Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`border rounded-xl p-4 space-y-2.5 ${
                planTier === 'free'
                  ? 'border-slate-900 dark:border-slate-400 bg-slate-50/70 dark:bg-slate-800/70'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                  Free Plan (Limited Availability)
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                  2 / 7 currencies
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Includes full USD ($) valuation plus complimentary Euro (€) preview for EU/US cross-border brand deals.
              </p>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>USD ($) &amp; EUR (€) rate conversion</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Canonical USD storage prevents FX drift</span>
                </li>
              </ul>
            </div>

            <div
              className={`border rounded-xl p-4 space-y-2.5 ${
                planTier === 'pro'
                  ? 'border-blue-700 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/50'
                  : 'border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/25'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-blue-950 dark:text-blue-200 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                  Pro Multi-Currency Suite
                </span>
                <span className="text-[11px] font-mono font-semibold text-blue-700 dark:text-blue-400">
                  7 / 7 currencies
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Unlocks GBP, CAD, AUD, JPY, and INR across the Calculator, Benchmarks, Markdown Rate Cards, Negotiation Scripts, and Comparison Matrix.
              </p>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                  <span>All 7 global creator sponsorship currencies</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                  <span>Localized exports, charts &amp; email quotes</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Live Currency Directory */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-200">
                  Supported Currencies &amp; Live FX Rates (1 USD Base)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {fxMetadata.source === 'fallback'
                    ? 'Using baseline fallback rates'
                    : `${fxMetadata.provider}${
                        fxMetadata.asOfDate ? ` · As of ${fxMetadata.asOfDate}` : ''
                      }`}
                  {fxMetadata.error ? ` · ${fxMetadata.error}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={fxMetadata.isRefreshing}
                  onClick={async () => {
                    const ok = await refreshRates(true);
                    onNotify?.(
                      ok
                        ? 'Updated live currency exchange rates.'
                        : 'Live FX service unavailable; using fallback rates.'
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${fxMetadata.isRefreshing ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  {fxMetadata.isRefreshing ? 'Updating...' : 'Refresh Rates'}
                </button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Active: <strong className="font-mono text-slate-900 dark:text-slate-100">{currency}</strong>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px bg-slate-100 dark:bg-slate-800 text-xs">
              {CURRENCY_ORDER.map((code) => {
                const spec = currencySpecs[code];
                const isUnlocked = spec.tier === 'free' || planTier === 'pro';
                const isSelected = currency === code;

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      if (isUnlocked) {
                        selectCurrency(code);
                        closeProModal();
                        onNotify?.(`Display currency switched to ${code} (${spec.symbol}).`);
                      }
                    }}
                    disabled={!isUnlocked}
                    className={`px-4 py-2.5 flex items-center justify-between gap-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-slate-900 dark:text-slate-100'
                        : isUnlocked
                        ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer'
                        : 'bg-white/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span className="font-mono">{spec.code}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-normal">({spec.symbol})</span>
                        <span className="truncate font-normal text-slate-600 dark:text-slate-400">· {spec.name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        1 USD = {spec.rateFromUsd} {spec.code}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 ${
                        isSelected
                          ? 'text-blue-700 dark:text-blue-400'
                          : isUnlocked
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-800 dark:text-amber-400'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Active
                        </>
                      ) : spec.tier === 'free' ? (
                        'Free'
                      ) : isUnlocked ? (
                        'Pro Unlocked'
                      ) : (
                        <>
                          <Lock className="w-3 h-3" aria-hidden="true" />
                          Pro
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Internal deal snapshots remain canonical in USD for zero-drift switching.
          </span>
          <div className="flex items-center gap-2.5">
            {planTier === 'pro' ? (
              <button
                type="button"
                onClick={() => {
                  switchToFreePlan();
                  onNotify?.('Switched to Free Limited Availability plan (USD & EUR).');
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Revert to Free (USD &amp; EUR)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const target = requestedProCurrency;
                  activateProPreview();
                  onNotify?.(
                    target
                      ? `Pro Multi-Currency unlocked — switched to ${target}.`
                      : 'Pro Multi-Currency Suite unlocked (7 currencies active).'
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {requestedSpec
                  ? `Activate Pro & Switch to ${requestedSpec.code}`
                  : 'Activate Pro Multi-Currency Preview'}
              </button>
            )}
            <button
              type="button"
              onClick={closeProModal}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
