import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CURRENCY_ORDER, CURRENCY_SPECS } from '../data/benchmarks';
import { CurrencyCode, CurrencySpec, PlanTier } from '../types/calculator';
import { setLiveExchangeRates } from '../utils/pricingEngine';

const CURRENCY_STORAGE_KEY = 'creator_rate_studio_currency_v1';
const PLAN_STORAGE_KEY = 'creator_rate_studio_plan_v1';
const FX_CACHE_STORAGE_KEY = 'creator_rate_studio_fx_rates_v1';

export interface FxRatesMetadata {
  source: 'live' | 'cache' | 'fallback';
  provider: string;
  asOfDate: string | null;
  fetchedAt: string | null;
  isRefreshing: boolean;
  error: string | null;
}

interface StoredFxSnapshot {
  rates: Partial<Record<CurrencyCode, number>>;
  provider: string;
  asOfDate: string | null;
  fetchedAt: string | null;
  source: 'live' | 'cache' | 'fallback';
}

interface CurrencyContextValue {
  currency: CurrencyCode;
  currencySpec: CurrencySpec;
  currencySpecs: Record<CurrencyCode, CurrencySpec>;
  planTier: PlanTier;
  proModalOpen: boolean;
  requestedProCurrency: CurrencyCode | null;
  fxMetadata: FxRatesMetadata;
  selectCurrency: (code: CurrencyCode) => void;
  openProModal: (requestedCurrency?: CurrencyCode | null) => void;
  closeProModal: () => void;
  activateProPreview: () => void;
  switchToFreePlan: () => void;
  refreshRates: (force?: boolean) => Promise<boolean>;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function loadPlanTier(): PlanTier {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    return raw === 'pro' ? 'pro' : 'free';
  } catch {
    return 'free';
  }
}

function loadCurrency(plan: PlanTier): CurrencyCode {
  try {
    const raw = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
    if (raw && raw in CURRENCY_SPECS) {
      if (CURRENCY_SPECS[raw].tier === 'pro' && plan !== 'pro') {
        return 'USD';
      }
      return raw;
    }
    return 'USD';
  } catch {
    return 'USD';
  }
}

function getBaselineRatesMap(): Record<CurrencyCode, number> {
  return {
    USD: CURRENCY_SPECS.USD.rateFromUsd,
    EUR: CURRENCY_SPECS.EUR.rateFromUsd,
    GBP: CURRENCY_SPECS.GBP.rateFromUsd,
    CAD: CURRENCY_SPECS.CAD.rateFromUsd,
    AUD: CURRENCY_SPECS.AUD.rateFromUsd,
    JPY: CURRENCY_SPECS.JPY.rateFromUsd,
    INR: CURRENCY_SPECS.INR.rateFromUsd,
  };
}

function sanitizeRatesMap(
  rawRates: Record<string, unknown> | undefined,
  fallback: Record<CurrencyCode, number>
): Record<CurrencyCode, number> {
  const next: Record<CurrencyCode, number> = { ...fallback, USD: 1.0 };
  if (!rawRates || typeof rawRates !== 'object') return next;
  for (const code of CURRENCY_ORDER) {
    if (code === 'USD') continue;
    const val = rawRates[code];
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      next[code] = val;
    }
  }
  return next;
}

function loadCachedFx(): StoredFxSnapshot | null {
  try {
    const raw = localStorage.getItem(FX_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredFxSnapshot>;
    if (!parsed || typeof parsed !== 'object' || !parsed.rates) return null;
    const sanitized = sanitizeRatesMap(
      parsed.rates as Record<string, unknown>,
      getBaselineRatesMap()
    );
    setLiveExchangeRates(sanitized);
    return {
      rates: sanitized,
      provider:
        typeof parsed.provider === 'string' && parsed.provider
          ? parsed.provider
          : 'Cached FX',
      asOfDate: typeof parsed.asOfDate === 'string' ? parsed.asOfDate : null,
      fetchedAt: typeof parsed.fetchedAt === 'string' ? parsed.fetchedAt : null,
      source: parsed.source === 'fallback' ? 'fallback' : 'cache',
    };
  } catch {
    return null;
  }
}

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cachedFx] = useState<StoredFxSnapshot | null>(() => loadCachedFx());
  const [planTier, setPlanTier] = useState<PlanTier>(loadPlanTier);
  const [currency, setCurrency] = useState<CurrencyCode>(() =>
    loadCurrency(loadPlanTier())
  );
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(() =>
    cachedFx
      ? sanitizeRatesMap(
          cachedFx.rates as Record<string, unknown>,
          getBaselineRatesMap()
        )
      : getBaselineRatesMap()
  );
  const [fxMetadata, setFxMetadata] = useState<FxRatesMetadata>(() =>
    cachedFx
      ? {
          source: cachedFx.source,
          provider: cachedFx.provider,
          asOfDate: cachedFx.asOfDate,
          fetchedAt: cachedFx.fetchedAt,
          isRefreshing: false,
          error: null,
        }
      : {
          source: 'fallback',
          provider: 'Baseline Reference',
          asOfDate: null,
          fetchedAt: null,
          isRefreshing: false,
          error: null,
        }
  );
  const [proModalOpen, setProModalOpen] = useState(false);
  const [requestedProCurrency, setRequestedProCurrency] =
    useState<CurrencyCode | null>(null);

  const refreshRates = useCallback(async (force = false): Promise<boolean> => {
    setFxMetadata((prev) => ({ ...prev, isRefreshing: true, error: null }));
    try {
      const endpoint = force
        ? '/api/exchange-rates?refresh=1'
        : '/api/exchange-rates';
      const resp = await fetch(endpoint);
      if (!resp.ok) {
        throw new Error(`FX API returned status ${resp.status}`);
      }
      const data = (await resp.json()) as {
        rates?: Record<string, unknown>;
        provider?: string;
        asOfDate?: string;
        fetchedAt?: string;
        source?: 'live' | 'cache' | 'fallback';
      };

      const nextRates = sanitizeRatesMap(data?.rates, getBaselineRatesMap());
      setLiveExchangeRates(nextRates);
      setRates(nextRates);

      const nextSource =
        data?.source === 'live' || data?.source === 'cache'
          ? data.source
          : 'fallback';
      const nextProvider =
        typeof data?.provider === 'string' && data.provider
          ? data.provider
          : 'Frankfurter (ECB)';
      const nextAsOfDate =
        typeof data?.asOfDate === 'string' ? data.asOfDate : null;
      const nextFetchedAt =
        typeof data?.fetchedAt === 'string'
          ? data.fetchedAt
          : new Date().toISOString();

      setFxMetadata({
        source: nextSource,
        provider: nextProvider,
        asOfDate: nextAsOfDate,
        fetchedAt: nextFetchedAt,
        isRefreshing: false,
        error: null,
      });

      try {
        localStorage.setItem(
          FX_CACHE_STORAGE_KEY,
          JSON.stringify({
            rates: nextRates,
            provider: nextProvider,
            asOfDate: nextAsOfDate,
            fetchedAt: nextFetchedAt,
            source: nextSource,
          })
        );
      } catch {
        // Ignore storage quota errors
      }
      return nextSource !== 'fallback';
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to fetch live FX rates.';
      setFxMetadata((prev) => ({
        ...prev,
        isRefreshing: false,
        error: message,
      }));
      return false;
    }
  }, []);

  // Fetch live exchange rates on mount
  useEffect(() => {
    void refreshRates(false);
  }, [refreshRates]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, planTier);
    } catch {
      // Ignore storage errors
    }
  }, [planTier]);

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      // Ignore storage errors
    }
  }, [currency]);

  const currencySpecs = useMemo(() => {
    const next = { ...CURRENCY_SPECS } as Record<CurrencyCode, CurrencySpec>;
    for (const code of CURRENCY_ORDER) {
      next[code] = {
        ...CURRENCY_SPECS[code],
        rateFromUsd: rates[code] ?? CURRENCY_SPECS[code].rateFromUsd,
      };
    }
    return next;
  }, [rates]);

  const selectCurrency = (code: CurrencyCode) => {
    const spec = currencySpecs[code];
    if (!spec) return;
    if (spec.tier === 'pro' && planTier !== 'pro') {
      setRequestedProCurrency(code);
      setProModalOpen(true);
      return;
    }
    setCurrency(code);
  };

  const openProModal = (requestedCurrency: CurrencyCode | null = null) => {
    setRequestedProCurrency(requestedCurrency);
    setProModalOpen(true);
  };

  const closeProModal = () => {
    setProModalOpen(false);
    setRequestedProCurrency(null);
  };

  const activateProPreview = () => {
    setPlanTier('pro');
    if (requestedProCurrency && requestedProCurrency in currencySpecs) {
      setCurrency(requestedProCurrency);
    }
    setProModalOpen(false);
    setRequestedProCurrency(null);
  };

  const switchToFreePlan = () => {
    setPlanTier('free');
    if (currencySpecs[currency].tier === 'pro') {
      setCurrency('USD');
    }
    setProModalOpen(false);
    setRequestedProCurrency(null);
  };

  const value: CurrencyContextValue = {
    currency,
    currencySpec: currencySpecs[currency],
    currencySpecs,
    planTier,
    proModalOpen,
    requestedProCurrency,
    fxMetadata,
    selectCurrency,
    openProModal,
    closeProModal,
    activateProPreview,
    switchToFreePlan,
    refreshRates,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return ctx;
}
