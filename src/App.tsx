import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Scale, Share2, X } from 'lucide-react';
import { BenchmarksSection } from './components/BenchmarksSection';
import { ContractAuditSection } from './components/ContractAuditSection';
import { CurrencyProModal } from './components/CurrencyProModal';
import { DealComparisonView } from './components/DealComparisonView';
import { Header } from './components/Header';
import { ProfileScopePanel } from './components/ProfileScopePanel';
import { ValuationPanel } from './components/ValuationPanel';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import {
  CREATOR_PRESETS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from './data/benchmarks';
import {
  AppView,
  CreatorProfile,
  DealScope,
  SavedDealSnapshot,
} from './types/calculator';
import {
  calculateDealRate,
  formatCurrencyExact,
  generateRateCardMarkdown,
} from './utils/pricingEngine';
import {
  buildShareConfigUrl,
  readSharedConfigFromLocation,
} from './utils/shareConfig';

const SAVED_DEALS_STORAGE_KEY = 'creator_rate_studio_saved_deals_v1';

function loadSavedDeals(): SavedDealSnapshot[] {
  try {
    const raw = localStorage.getItem(SAVED_DEALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function AppContent() {
  const { currency } = useCurrency();
  const initialPreset = CREATOR_PRESETS[0];
  const [sharedInitialConfig] = useState(() => readSharedConfigFromLocation());

  const [activeView, setActiveView] = useState<AppView>('workbench');
  const [activePresetId, setActivePresetId] = useState<string | null>(
    sharedInitialConfig ? null : initialPreset.id
  );
  const [profile, setProfile] = useState<CreatorProfile>(
    sharedInitialConfig ? sharedInitialConfig.profile : initialPreset.profile
  );
  const [scope, setScope] = useState<DealScope>(
    sharedInitialConfig ? sharedInitialConfig.scope : initialPreset.scope
  );
  const [flaggedClauseIds, setFlaggedClauseIds] = useState<number[]>([1, 5, 12]);
  const [savedDeals, setSavedDeals] = useState<SavedDealSnapshot[]>(loadSavedDeals);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    showCompareLink?: boolean;
  } | null>(
    sharedInitialConfig
      ? { message: 'Loaded shared deal configuration from URL.' }
      : null
  );

  const result = useMemo(
    () => calculateDealRate(profile, scope),
    [profile, scope]
  );

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_DEALS_STORAGE_KEY, JSON.stringify(savedDeals));
    } catch {
      // Ignore storage quota errors in restricted contexts
    }
  }, [savedDeals]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, showCompareLink = false) => {
    setToast({ message, showCompareLink });
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = CREATOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setProfile(preset.profile);
    setScope(preset.scope);
    setSharedUrl(null);
    showToast(`Loaded "${preset.label}" metrics and scope.`);
  };

  const handleChangeProfile = (
    updater: (prev: CreatorProfile) => CreatorProfile
  ) => {
    setActivePresetId(null);
    setSharedUrl(null);
    setProfile(updater);
  };

  const handleChangeScope = (updater: (prev: DealScope) => DealScope) => {
    setActivePresetId(null);
    setSharedUrl(null);
    setScope(updater);
  };

  const handleApplyTierScope = (tierId: 'tierA' | 'tierB' | 'tierC') => {
    setActivePresetId(null);
    setSharedUrl(null);
    if (tierId === 'tierA') {
      setScope((prev) => ({
        ...prev,
        usageRightsTerm: 'organic_only',
        whitelistingEnabled: false,
        exclusivityType: 'none',
        turnaroundWindow: 'standard_14d',
        includedRevisionRounds: 2,
      }));
      showToast('Applied Option A (Organic Distribution) scope to calculator.');
    } else if (tierId === 'tierB') {
      setScope((prev) => ({
        ...prev,
        usageRightsTerm: 'paid_90d',
        whitelistingEnabled: false,
        exclusivityType: 'named_competitors_30d',
        turnaroundWindow: 'standard_14d',
        includedRevisionRounds: 2,
      }));
      showToast('Applied Option B (Standard Commercial Growth) scope to calculator.');
    } else {
      setScope((prev) => ({
        ...prev,
        usageRightsTerm: 'paid_180d',
        whitelistingEnabled: true,
        exclusivityType: 'named_competitors_60d',
        turnaroundWindow: 'standard_14d',
        includedRevisionRounds: 2,
      }));
      showToast('Applied Option C (Comprehensive Scale) scope to calculator.');
    }
  };

  const handleSaveToComparison = (
    customName?: string,
    notes?: string,
    targetCpa?: number,
    targetMonthlyRevenue?: number,
    tags?: string[]
  ) => {
    const fallbackName = `${PLATFORM_SPECS[profile.platform].shortLabel} · ${
      USAGE_RIGHTS_SPECS[scope.usageRightsTerm].label.split(' ')[0]
    } (${formatCurrencyExact(result.breakdown.totalRecommendedRate, currency)})`;

    const normalizedTags = Array.isArray(tags)
      ? Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)))
      : [];

    const snapshot: SavedDealSnapshot = {
      id: `deal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: customName?.trim() || fallbackName,
      tags: normalizedTags,
      notes: notes?.trim() || '',
      targetCpa,
      targetMonthlyRevenue,
      savedAt: new Date().toISOString(),
      profile: JSON.parse(JSON.stringify(profile)),
      scope: JSON.parse(JSON.stringify(scope)),
      result: JSON.parse(JSON.stringify(result)),
    };

    setSavedDeals((prev) => [...prev, snapshot]);
    showToast(`Saved "${snapshot.name}" to Deal Comparison.`, true);
  };

  const handleLoadSampleComparison = () => {
    const presetA = CREATOR_PRESETS[0];
    const organicScope: DealScope = {
      ...presetA.scope,
      usageRightsTerm: 'organic_only',
      whitelistingEnabled: false,
      exclusivityType: 'none',
    };
    const organicResult = calculateDealRate(presetA.profile, organicScope);

    const commercialScope: DealScope = {
      ...presetA.scope,
      usageRightsTerm: 'paid_90d',
      whitelistingEnabled: true,
      exclusivityType: 'named_competitors_30d',
    };
    const commercialResult = calculateDealRate(presetA.profile, commercialScope);

    const ytProfile = CREATOR_PRESETS[2].profile;
    const ytScope = CREATOR_PRESETS[2].scope;
    const ytResult = calculateDealRate(ytProfile, ytScope);

    const nowMs = Date.now();
    const samples: SavedDealSnapshot[] = [
      {
        id: `sample_organic_${nowMs}`,
        name: 'FinTech IG Reel · Organic Only',
        tags: ['Negotiation Pending'],
        notes: 'Entry counter-offer when brand pushed back on $3.3K budget; strips paid ad rights & exclusivity.',
        targetCpa: 45,
        targetMonthlyRevenue: 10000,
        savedAt: new Date(nowMs - 1000 * 60 * 60 * 48).toISOString(),
        profile: presetA.profile,
        scope: organicScope,
        result: organicResult,
      },
      {
        id: `sample_commercial_${nowMs + 1}`,
        name: 'FinTech IG Reel · 90d Paid + Whitelisting',
        tags: ['High Priority', 'Negotiation Pending'],
        notes: 'Initial brand brief asked for perpetual usage; countered with 90-day license + 3 named competitors.',
        targetCpa: 50,
        targetMonthlyRevenue: 10000,
        savedAt: new Date(nowMs - 1000 * 60 * 60 * 24).toISOString(),
        profile: presetA.profile,
        scope: commercialScope,
        result: commercialResult,
      },
      {
        id: `sample_yt_${nowMs + 2}`,
        name: 'Tech YouTube Dedicated · 90d Paid',
        tags: ['Closed'],
        notes: 'Includes dedicated 60–90s product walkthrough, 2 revision rounds, Net-14 payment & 50%/100% kill fee.',
        targetCpa: 125,
        targetMonthlyRevenue: 10000,
        savedAt: new Date(nowMs).toISOString(),
        profile: ytProfile,
        scope: ytScope,
        result: ytResult,
      },
    ];

    setSavedDeals((prev) => [...prev, ...samples]);
    showToast('Loaded 3 sample deal scenarios for side-by-side comparison.');
  };

  const handleLoadDealIntoCalculator = (deal: SavedDealSnapshot) => {
    setActivePresetId(null);
    setSharedUrl(null);
    setProfile(deal.profile);
    setScope(deal.scope);
    setActiveView('workbench');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Loaded "${deal.name}" into the calculator.`);
  };

  const handleRenameDeal = (id: string, newName: string) => {
    setSavedDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name: newName } : d))
    );
  };

  const handleUpdateDealNotes = (id: string, newNotes: string) => {
    setSavedDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, notes: newNotes } : d))
    );
    showToast('Updated deal negotiation notes.');
  };

  const handleUpdateDealTags = (id: string, tags: string[]) => {
    const normalized = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
    setSavedDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, tags: normalized } : d))
    );
    showToast('Updated deal tags.');
  };

  const handleUpdateDealTargetCpa = (id: string, targetCpa?: number) => {
    setSavedDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, targetCpa } : d))
    );
    showToast(
      targetCpa
        ? `Updated Target CPA to ${formatCurrencyExact(targetCpa, currency)}.`
        : 'Cleared Target CPA.'
    );
  };

  const handleUpdateDealTargetMonthlyRevenue = (
    id: string,
    targetMonthlyRevenue?: number
  ) => {
    setSavedDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, targetMonthlyRevenue } : d))
    );
    showToast(
      targetMonthlyRevenue
        ? `Updated Target Monthly Revenue to ${formatCurrencyExact(
            targetMonthlyRevenue,
            currency
          )}.`
        : 'Cleared Target Monthly Revenue.'
    );
  };

  const handleDeleteDeal = (id: string) => {
    setSavedDeals((prev) => prev.filter((d) => d.id !== id));
    showToast('Removed deal from comparison.');
  };

  const handleClearAllDeals = () => {
    setSavedDeals([]);
    showToast('Cleared all saved comparison deals.');
  };

  const handleCopyRateCard = async () => {
    const md = generateRateCardMarkdown(profile, scope, result, currency);
    try {
      await navigator.clipboard.writeText(md);
      showToast(`Copied formatted Markdown rate card (${currency}) to clipboard.`);
    } catch {
      showToast('Unable to access clipboard in this browser context.');
    }
  };

  const handleShareConfiguration = async () => {
    const url = buildShareConfigUrl(profile, scope);
    setSharedUrl(url);
    try {
      window.history.replaceState(null, '', url);
    } catch {
      // Ignore history errors in sandboxed contexts
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Shareable configuration URL copied to clipboard.');
    } catch {
      showToast('Shareable configuration URL generated below.');
    }
  };

  const handleNavigateSection = (sectionId: string) => {
    if (activeView !== 'workbench') {
      setActiveView('workbench');
      window.setTimeout(() => {
        if (sectionId === 'calculator') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 40);
      return;
    }

    if (sectionId === 'calculator') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleToggleClause = (clauseId: number) => {
    setFlaggedClauseIds((prev) =>
      prev.includes(clauseId)
        ? prev.filter((id) => id !== clauseId)
        : [...prev, clauseId]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeView={activeView}
        savedDealsCount={savedDeals.length}
        onNavigateSection={handleNavigateSection}
        onOpenComparison={() => {
          setActiveView('comparison');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onExportRateCard={handleCopyRateCard}
      />

      <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 py-8 space-y-12">
        {activeView === 'comparison' ? (
          <DealComparisonView
            savedDeals={savedDeals}
            currentProfile={profile}
            currentScope={scope}
            currentResult={result}
            onBackToCalculator={() => {
              setActiveView('workbench');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSaveCurrentDeal={handleSaveToComparison}
            onLoadSampleComparison={handleLoadSampleComparison}
            onLoadDealIntoCalculator={handleLoadDealIntoCalculator}
            onRenameDeal={handleRenameDeal}
            onUpdateDealNotes={handleUpdateDealNotes}
            onUpdateDealTags={handleUpdateDealTags}
            onUpdateDealTargetCpa={handleUpdateDealTargetCpa}
            onUpdateDealTargetMonthlyRevenue={handleUpdateDealTargetMonthlyRevenue}
            onDeleteDeal={handleDeleteDeal}
            onClearAllDeals={handleClearAllDeals}
            onNotify={(msg) => showToast(msg)}
          />
        ) : (
          <>
            {/* Top Workbench Intro & Mode Switcher */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2 border-b border-slate-200">
              <div className="max-w-2xl">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
                  Algorithmic Sponsorship Pricing & Contract Scope Workbench
                </h1>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Replace follower-count guesswork with median view velocity, verified niche CPMs, and explicit line-item pricing for paid ad usage, whitelisting, and category exclusivity.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleShareConfiguration}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  <span>Share Configuration</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('comparison');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Scale className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  <span>
                    Compare Saved Deals ({savedDeals.length})
                  </span>
                </button>
              </div>
            </div>

            {/* Dual-Column Workbench */}
            <div
              id="calculator"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start scroll-mt-24"
            >
              <div className="lg:col-span-6">
                <ProfileScopePanel
                  profile={profile}
                  scope={scope}
                  result={result}
                  activePresetId={activePresetId}
                  onApplyPreset={handleApplyPreset}
                  onChangeProfile={handleChangeProfile}
                  onChangeScope={handleChangeScope}
                />
              </div>

              <div className="lg:col-span-6 lg:sticky lg:top-22">
                <ValuationPanel
                  profile={profile}
                  scope={scope}
                  result={result}
                  savedDealsCount={savedDeals.length}
                  sharedUrl={sharedUrl}
                  onCopyRateCard={handleCopyRateCard}
                  onShareConfiguration={handleShareConfiguration}
                  onDismissSharedUrl={() => setSharedUrl(null)}
                  onSaveToComparison={handleSaveToComparison}
                  onOpenComparison={() => {
                    setActiveView('comparison');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onScrollToScripts={() =>
                    document
                      .getElementById('negotiation-scripts')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  onApplyTierScope={handleApplyTierScope}
                />
              </div>
            </div>

            {/* Module 4: 15-Clause Contract Audit & Script Generator */}
            <ContractAuditSection
              profile={profile}
              scope={scope}
              result={result}
              flaggedClauseIds={flaggedClauseIds}
              onToggleClause={handleToggleClause}
              onClearFlags={() => setFlaggedClauseIds([])}
              onNotify={(msg) => showToast(msg)}
            />

            {/* 2026 Benchmarks Reference */}
            <BenchmarksSection
              profile={profile}
              result={result}
              savedDeals={savedDeals}
            />
          </>
        )}
      </main>

      {/* Quiet, Functional Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <strong className="text-slate-700 font-semibold">
              Creator Rate Studio
            </strong>{' '}
            · Client-side valuation engine. Financial inputs and saved deal comparisons stay strictly in your browser.
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>2026 Benchmarks: Gigapay / InfluenceFlow / CreatiCalc</span>
            <span aria-hidden="true">·</span>
            <span>FTC Disclosure Penalty Notice: Up to $53,088/violation</span>
          </div>
        </div>
      </footer>

      <CurrencyProModal onNotify={(msg) => showToast(msg)} />

      {/* Non-blocking Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-3 text-xs sm:text-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span className="flex-1">{toast.message}</span>
          {toast.showCompareLink && activeView !== 'comparison' && (
            <button
              type="button"
              onClick={() => {
                setActiveView('comparison');
                setToast(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="font-semibold text-blue-300 hover:text-blue-200 underline whitespace-nowrap cursor-pointer"
            >
              View Matrix
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <CurrencyProvider>
      <AppContent />
    </CurrencyProvider>
  );
}
