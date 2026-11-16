import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  BookmarkPlus,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Filter,
  Minus,
  RotateCcw,
  Scale,
  Tag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import {
  EXCLUSIVITY_SPECS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import {
  CalculatedDealResult,
  CreatorProfile,
  DealScope,
  DEFAULT_DEAL_TAGS,
  PlatformId,
  SavedDealSnapshot,
} from '../types/calculator';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  calculatePerformanceProjection,
  formatCurrency,
  formatCurrencyExact,
  formatNumber,
  generateComparisonMarkdown,
} from '../utils/pricingEngine';
import { NegotiationCoachPanel } from './NegotiationCoachPanel';

interface DealComparisonViewProps {
  savedDeals: SavedDealSnapshot[];
  currentProfile: CreatorProfile;
  currentScope: DealScope;
  currentResult: CalculatedDealResult;
  onBackToCalculator: () => void;
  onSaveCurrentDeal: (
    customName?: string,
    notes?: string,
    targetCpa?: number,
    targetMonthlyRevenue?: number,
    tags?: string[]
  ) => void;
  onLoadSampleComparison: () => void;
  onLoadDealIntoCalculator: (deal: SavedDealSnapshot) => void;
  onRenameDeal: (id: string, newName: string) => void;
  onUpdateDealNotes: (id: string, newNotes: string) => void;
  onUpdateDealTags: (id: string, tags: string[]) => void;
  onUpdateDealTargetCpa: (id: string, targetCpa?: number) => void;
  onUpdateDealTargetMonthlyRevenue: (id: string, targetMonthlyRevenue?: number) => void;
  onDeleteDeal: (id: string) => void;
  onClearAllDeals: () => void;
  onNotify: (message: string) => void;
}

interface ComparisonRow {
  id: string;
  section: 'Valuation & Economics' | 'Creator Metrics' | 'Scope & Rights Add-Ons' | 'Tiered Packages';
  label: string;
  values: string[];
  subValues?: string[];
  rawNumbers?: number[];
  differs: boolean;
  isPrimaryMetric?: boolean;
}

interface ChartDatum {
  id: string;
  name: string;
  shortName: string;
  totalFee: number;
  baseFee: number;
  ridersFee: number;
  usageFee: number;
  whitelistingFee: number;
  exclusivityFee: number;
  otherRidersFee: number;
  deltaVsLowest: number;
  platform: string;
  niche: string;
  medianViews: number;
  er: number;
  notes?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
    payload: ChartDatum;
  }>;
}

const DealChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3.5 text-xs min-w-[250px] max-w-[300px]">
      <div className="font-display font-semibold text-slate-900 leading-snug">
        {d.name}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5 mb-2.5 tabular-nums">
        {d.platform} · {formatNumber(d.medianViews)} views · {d.er.toFixed(1)}% ER
      </div>

      {/* Active Recharts Series Readout */}
      <div className="space-y-1.5 border-t border-slate-100 pt-2 mb-2 tabular-nums">
        {payload.map((entry) => (
          <div
            key={String(entry.dataKey ?? entry.name)}
            className="flex items-center justify-between gap-4 font-semibold text-slate-900"
          >
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: entry.color || '#1D4ED8' }}
                aria-hidden="true"
              />
              <span className="truncate">{entry.name}</span>
            </span>
            <span className="font-mono shrink-0">
              {formatCurrencyExact(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
        {payload.length > 1 && (
          <div className="flex items-center justify-between gap-4 font-bold text-slate-900 pt-1 border-t border-slate-100">
            <span>Total Recommended Rate</span>
            <span className="font-mono">{formatCurrencyExact(d.totalFee)}</span>
          </div>
        )}
      </div>

      {/* Itemized Rider Context */}
      <div className="space-y-1 border-t border-slate-100 pt-2 text-[11px] tabular-nums">
        <div className="flex items-center justify-between gap-4 text-slate-600">
          <span>Base Creation Fee</span>
          <span className="font-mono">{formatCurrencyExact(d.baseFee)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-600">
          <span>Paid Usage Rights</span>
          <span className="font-mono">{formatCurrencyExact(d.usageFee)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-600">
          <span>Whitelisting</span>
          <span className="font-mono">{formatCurrencyExact(d.whitelistingFee)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-600">
          <span>Category Exclusivity</span>
          <span className="font-mono">{formatCurrencyExact(d.exclusivityFee)}</span>
        </div>
        {d.otherRidersFee > 0 && (
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <span>Rush / Extra Revisions</span>
            <span className="font-mono">{formatCurrencyExact(d.otherRidersFee)}</span>
          </div>
        )}
        {d.deltaVsLowest > 0 && (
          <div className="flex items-center justify-between gap-4 text-blue-700 font-medium pt-1">
            <span>Difference vs. lowest</span>
            <span className="font-mono">+{formatCurrencyExact(d.deltaVsLowest)}</span>
          </div>
        )}
        {d.notes && (
          <div className="pt-1.5 mt-1.5 border-t border-slate-100 text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-700">Notes: </span>
            {d.notes}
          </div>
        )}
      </div>
    </div>
  );
};

interface TrendDatum {
  id: string;
  axisKey: string;
  name: string;
  savedAt: string;
  shortTimestamp: string;
  fullTimestamp: string;
  totalRate: number;
  baseFee: number;
  deltaFromPrev: number | null;
  platform: string;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TrendDatum }>;
}

const TrendChartTooltip: React.FC<TrendTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3.5 text-xs min-w-[230px] max-w-[280px]">
      <div className="font-display font-semibold text-slate-900 leading-snug">
        {d.name}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5 mb-2 tabular-nums">
        {d.fullTimestamp} · {d.platform}
      </div>
      <div className="space-y-1 border-t border-slate-100 pt-2 tabular-nums">
        <div className="flex items-center justify-between gap-4 font-semibold text-slate-900">
          <span>Total Deal Rate</span>
          <span className="font-mono text-blue-700">
            {formatCurrencyExact(d.totalRate)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-600">
          <span>Base Creation Fee</span>
          <span className="font-mono">{formatCurrencyExact(d.baseFee)}</span>
        </div>
        {d.deltaFromPrev !== null && (
          <div
            className={`flex items-center justify-between gap-4 font-medium pt-1 ${
              d.deltaFromPrev > 0
                ? 'text-emerald-700'
                : d.deltaFromPrev < 0
                ? 'text-red-700'
                : 'text-slate-600'
            }`}
          >
            <span>vs. previous saved</span>
            <span className="font-mono">
              {d.deltaFromPrev > 0 ? '+' : ''}
              {formatCurrencyExact(d.deltaFromPrev)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface MonthlyGoalSummary {
  aggregatedTotalDealRate: number;
  avgDealRate: number;
  targetMonthlyRevenue: number | null;
  dealsNeededAtAvgRate: number | null;
  exactDealsAtAvgRate: number | null;
  coveragePct: number | null;
  remainingGap: number | null;
  surplus: number | null;
  hasMixedGoals: boolean;
}

function computeMonthlyGoalSummary(deals: SavedDealSnapshot[]): MonthlyGoalSummary | null {
  if (deals.length === 0) return null;
  const aggregatedTotalDealRate = deals.reduce(
    (sum, d) => sum + d.result.breakdown.totalRecommendedRate,
    0
  );
  const avgDealRate = aggregatedTotalDealRate / deals.length;

  const goals = deals
    .map((d) => d.targetMonthlyRevenue)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);

  if (goals.length === 0) {
    return {
      aggregatedTotalDealRate,
      avgDealRate,
      targetMonthlyRevenue: null,
      dealsNeededAtAvgRate: null,
      exactDealsAtAvgRate: null,
      coveragePct: null,
      remainingGap: null,
      surplus: null,
      hasMixedGoals: false,
    };
  }

  const uniqueGoals = new Set(goals);
  const hasMixedGoals = uniqueGoals.size > 1;
  const targetMonthlyRevenue = hasMixedGoals
    ? goals.reduce((s, g) => s + g, 0) / goals.length
    : goals[0];

  const exactDealsAtAvgRate = avgDealRate > 0 ? targetMonthlyRevenue / avgDealRate : null;
  const dealsNeededAtAvgRate =
    exactDealsAtAvgRate !== null ? Math.ceil(exactDealsAtAvgRate) : null;
  const coveragePct = (aggregatedTotalDealRate / targetMonthlyRevenue) * 100;
  const remainingGap = Math.max(0, targetMonthlyRevenue - aggregatedTotalDealRate);
  const surplus = Math.max(0, aggregatedTotalDealRate - targetMonthlyRevenue);

  return {
    aggregatedTotalDealRate,
    avgDealRate,
    targetMonthlyRevenue,
    dealsNeededAtAvgRate,
    exactDealsAtAvgRate,
    coveragePct,
    remainingGap,
    surplus,
    hasMixedGoals,
  };
}

interface RateDensityClasses {
  cellClass: string;
  textClass: string;
  subTextClass: string;
  badgeTextClass: string;
}

function getRateDensityClasses(
  rate: number,
  minRate: number,
  maxRate: number,
  dealCount: number
): RateDensityClasses {
  if (dealCount <= 1 || maxRate <= minRate) {
    return {
      cellClass: 'bg-blue-50',
      textClass: 'text-slate-900',
      subTextClass: 'text-slate-600',
      badgeTextClass: 'text-blue-800',
    };
  }

  const ratio = (rate - minRate) / (maxRate - minRate);

  if (ratio < 0.2) {
    return {
      cellClass: 'bg-blue-50',
      textClass: 'text-slate-900',
      subTextClass: 'text-slate-600',
      badgeTextClass: 'text-blue-800',
    };
  }
  if (ratio < 0.45) {
    return {
      cellClass: 'bg-blue-100',
      textClass: 'text-slate-950',
      subTextClass: 'text-slate-700',
      badgeTextClass: 'text-blue-900',
    };
  }
  if (ratio < 0.7) {
    return {
      cellClass: 'bg-blue-200',
      textClass: 'text-blue-950',
      subTextClass: 'text-blue-900',
      badgeTextClass: 'text-blue-950',
    };
  }
  if (ratio < 0.9) {
    return {
      cellClass: 'bg-blue-700',
      textClass: 'text-white',
      subTextClass: 'text-blue-100',
      badgeTextClass: 'text-blue-100',
    };
  }
  return {
    cellClass: 'bg-blue-900',
    textClass: 'text-white',
    subTextClass: 'text-blue-100',
    badgeTextClass: 'text-blue-100',
  };
}

export const DealComparisonView: React.FC<DealComparisonViewProps> = ({
  savedDeals,
  currentProfile,
  currentScope,
  currentResult,
  onBackToCalculator,
  onSaveCurrentDeal,
  onLoadSampleComparison,
  onLoadDealIntoCalculator,
  onRenameDeal,
  onUpdateDealNotes,
  onUpdateDealTags,
  onUpdateDealTargetCpa,
  onUpdateDealTargetMonthlyRevenue,
  onDeleteDeal,
  onClearAllDeals,
  onNotify,
}) => {
  const [diffOnly, setDiffOnly] = useState(false);
  const [chartMode, setChartMode] = useState<'total' | 'stacked'>('total');
  const [trendMode, setTrendMode] = useState<'total' | 'compareBase'>('total');
  const [platformFilter, setPlatformFilter] = useState<PlatformId | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'default' | 'rate_asc' | 'rate_desc' | 'tag_asc'>('default');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [newCustomTagText, setNewCustomTagText] = useState('');
  const [editingCpaId, setEditingCpaId] = useState<string | null>(null);
  const [editingCpaText, setEditingCpaText] = useState('');
  const [editingRevenueId, setEditingRevenueId] = useState<string | null>(null);
  const [editingRevenueText, setEditingRevenueText] = useState('');

  const platformCounts = useMemo(() => {
    const counts = new Map<PlatformId, number>();
    for (const deal of savedDeals) {
      counts.set(deal.profile.platform, (counts.get(deal.profile.platform) ?? 0) + 1);
    }
    return counts;
  }, [savedDeals]);

  const { availableTagOptions, tagCounts, untaggedCount } = useMemo(() => {
    const counts = new Map<string, number>();
    let untagged = 0;
    const customSet = new Set<string>();
    const defaultSet = new Set<string>(DEFAULT_DEAL_TAGS);

    for (const deal of savedDeals) {
      const tags = Array.isArray(deal.tags) ? deal.tags.filter(Boolean) : [];
      if (tags.length === 0) {
        untagged += 1;
      } else {
        for (const t of tags) {
          counts.set(t, (counts.get(t) ?? 0) + 1);
          if (!defaultSet.has(t)) {
            customSet.add(t);
          }
        }
      }
    }

    const ordered = [
      ...DEFAULT_DEAL_TAGS,
      ...Array.from(customSet).sort((a, b) => a.localeCompare(b)),
    ];

    return {
      availableTagOptions: ordered,
      tagCounts: counts,
      untaggedCount: untagged,
    };
  }, [savedDeals]);

  const visibleDeals = useMemo(() => {
    const filtered = savedDeals.filter((deal) => {
      if (platformFilter !== 'all' && deal.profile.platform !== platformFilter) {
        return false;
      }
      const dealTags = Array.isArray(deal.tags) ? deal.tags : [];
      if (tagFilter === '__untagged__') {
        return dealTags.length === 0;
      }
      if (tagFilter !== 'all') {
        return dealTags.includes(tagFilter);
      }
      return true;
    });

    if (sortOrder === 'default') {
      return filtered;
    }

    if (sortOrder === 'tag_asc') {
      return [...filtered].sort((a, b) => {
        const aTag = a.tags && a.tags.length > 0 ? a.tags[0] : '\uffff';
        const bTag = b.tags && b.tags.length > 0 ? b.tags[0] : '\uffff';
        const tagDiff = aTag.localeCompare(bTag);
        if (tagDiff !== 0) return tagDiff;
        return b.result.breakdown.totalRecommendedRate - a.result.breakdown.totalRecommendedRate;
      });
    }

    return [...filtered].sort((a, b) => {
      const rateDiff =
        a.result.breakdown.totalRecommendedRate - b.result.breakdown.totalRecommendedRate;
      if (rateDiff !== 0) {
        return sortOrder === 'rate_asc' ? rateDiff : -rateDiff;
      }
      const timeDiff = new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
      return sortOrder === 'rate_asc' ? timeDiff : -timeDiff;
    });
  }, [savedDeals, platformFilter, tagFilter, sortOrder]);

  const hasActiveFilters =
    platformFilter !== 'all' || tagFilter !== 'all' || sortOrder !== 'default';

  const rateBounds = useMemo(() => {
    if (visibleDeals.length === 0) return { min: 0, max: 0 };
    const rates = visibleDeals.map((d) => d.result.breakdown.totalRecommendedRate);
    return {
      min: Math.min(...rates),
      max: Math.max(...rates),
    };
  }, [visibleDeals]);

  const resetFilters = () => {
    setPlatformFilter('all');
    setTagFilter('all');
    setSortOrder('default');
  };

  const chartData: ChartDatum[] = useMemo(() => {
    const minTotal =
      visibleDeals.length > 0
        ? Math.min(...visibleDeals.map((d) => d.result.breakdown.totalRecommendedRate))
        : 0;
    return visibleDeals.map((deal) => {
      const b = deal.result.breakdown;
      const shortName =
        deal.name.length > 26 ? `${deal.name.slice(0, 24)}…` : deal.name;
      return {
        id: deal.id,
        name: deal.name,
        shortName,
        totalFee: Math.round(b.totalRecommendedRate * 100) / 100,
        baseFee: Math.round(b.baseCreationFee * 100) / 100,
        ridersFee: Math.round(b.totalCommercialRiders * 100) / 100,
        usageFee: b.usageRightsFee,
        whitelistingFee: b.whitelistingFee,
        exclusivityFee: b.exclusivityFee,
        otherRidersFee: b.rushFee + b.excessRevisionsFee,
        deltaVsLowest: Math.max(0, b.totalRecommendedRate - minTotal),
        platform: PLATFORM_SPECS[deal.profile.platform].shortLabel,
        niche: NICHE_BENCHMARKS[deal.profile.niche].label,
        medianViews: deal.profile.medianViews,
        er: b.calculatedER,
        notes: deal.notes?.trim() || undefined,
      };
    });
  }, [visibleDeals]);

  const trendData: TrendDatum[] = useMemo(() => {
    const sorted = [...visibleDeals].sort(
      (a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
    );
    const minuteCounts = new Map<string, number>();
    for (const deal of sorted) {
      const minuteKey = new Date(deal.savedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      minuteCounts.set(minuteKey, (minuteCounts.get(minuteKey) ?? 0) + 1);
    }

    return sorted.map((deal, idx) => {
      const dateObj = new Date(deal.savedAt);
      const baseShort = dateObj.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const hasDuplicateMinute = (minuteCounts.get(baseShort) ?? 0) > 1;
      const shortTimestamp = hasDuplicateMinute
        ? dateObj.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : baseShort;

      const totalRate = Math.round(deal.result.breakdown.totalRecommendedRate * 100) / 100;
      const prevTotal =
        idx > 0
          ? Math.round(sorted[idx - 1].result.breakdown.totalRecommendedRate * 100) / 100
          : null;
      return {
        id: deal.id,
        axisKey: deal.id,
        name: deal.name,
        savedAt: deal.savedAt,
        shortTimestamp,
        fullTimestamp: dateObj.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        totalRate,
        baseFee: Math.round(deal.result.breakdown.baseCreationFee * 100) / 100,
        deltaFromPrev: prevTotal !== null ? totalRate - prevTotal : null,
        platform: PLATFORM_SPECS[deal.profile.platform].shortLabel,
      };
    });
  }, [visibleDeals]);

  const trendLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of trendData) {
      map.set(item.axisKey, item.shortTimestamp);
    }
    return map;
  }, [trendData]);

  const trendSummary = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0].totalRate;
    const last = trendData[trendData.length - 1].totalRate;
    const delta = last - first;
    const pct = first > 0 ? (delta / first) * 100 : 0;
    const direction: 'up' | 'down' | 'flat' =
      delta > 0.005 ? 'up' : delta < -0.005 ? 'down' : 'flat';
    return { delta, pct, direction };
  }, [trendData]);

  const allDealsGoalSummary = useMemo(
    () => computeMonthlyGoalSummary(savedDeals),
    [savedDeals]
  );

  const monthlyGoalSummary = useMemo(
    () => computeMonthlyGoalSummary(visibleDeals),
    [visibleDeals]
  );

  const rows: ComparisonRow[] = useMemo(() => {
    if (visibleDeals.length === 0) return [];

    const checkDiff = (vals: string[]) => new Set(vals).size > 1;

    const totalVals = visibleDeals.map((d) =>
      formatCurrencyExact(d.result.breakdown.totalRecommendedRate)
    );
    const totalNums = visibleDeals.map(
      (d) => d.result.breakdown.totalRecommendedRate
    );
    const minTotal = Math.min(...totalNums);

    const baseVals = visibleDeals.map((d) =>
      formatCurrencyExact(d.result.breakdown.baseCreationFee)
    );
    const baseNums = visibleDeals.map((d) => d.result.breakdown.baseCreationFee);
    const minBase = Math.min(...baseNums);

    const ridersVals = visibleDeals.map((d) =>
      formatCurrencyExact(d.result.breakdown.totalCommercialRiders)
    );
    const ridersNums = visibleDeals.map(
      (d) => d.result.breakdown.totalCommercialRiders
    );

    const splitVals = visibleDeals.map((d) => {
      const total = d.result.breakdown.totalRecommendedRate || 1;
      const creative = Math.round(
        (d.result.breakdown.baseCreationFee / total) * 100
      );
      return `${creative}% Creative / ${100 - creative}% Rights`;
    });

    const netVals = visibleDeals.map((d) =>
      formatCurrencyExact(d.result.breakdown.estimatedNetAfterSETax)
    );

    const platformVals = visibleDeals.map(
      (d) => PLATFORM_SPECS[d.profile.platform].label
    );
    const platformSub = visibleDeals.map(
      (d) => `${d.result.breakdown.platformMultiplier.toFixed(2)}x platform factor`
    );

    const nicheVals = visibleDeals.map(
      (d) => NICHE_BENCHMARKS[d.profile.niche].label
    );
    const nicheSub = visibleDeals.map(
      (d) => `$${d.result.breakdown.activeCpm.toFixed(2)} CPM`
    );

    const viewsVals = visibleDeals.map(
      (d) => `${formatNumber(d.profile.medianViews)} views`
    );
    const followersSub = visibleDeals.map(
      (d) => `${formatNumber(d.profile.followerCount)} followers`
    );

    const erVals = visibleDeals.map(
      (d) => `${d.result.breakdown.calculatedER.toFixed(1)}% ER`
    );
    const erSub = visibleDeals.map(
      (d) => `${d.result.breakdown.engagementMultiplier.toFixed(2)}x coefficient`
    );

    const floorVals = visibleDeals.map((d) =>
      formatCurrencyExact(d.result.breakdown.effectiveFloorCost)
    );

    const usageVals = visibleDeals.map(
      (d) => USAGE_RIGHTS_SPECS[d.scope.usageRightsTerm].label
    );
    const usageSub = visibleDeals.map(
      (d) =>
        `${formatCurrencyExact(d.result.breakdown.usageRightsFee)} (${(
          d.result.breakdown.usageMultiplier * 100
        ).toFixed(0)}%)`
    );

    const wlVals = visibleDeals.map((d) =>
      d.scope.whitelistingEnabled
        ? `Enabled (${d.scope.whitelistingExpirationDays}d cap)`
        : 'Not included'
    );
    const wlSub = visibleDeals.map((d) =>
      d.scope.whitelistingEnabled
        ? formatCurrencyExact(d.result.breakdown.whitelistingFee)
        : '$0.00'
    );

    const exclVals = visibleDeals.map(
      (d) => EXCLUSIVITY_SPECS[d.scope.exclusivityType].label
    );
    const exclSub = visibleDeals.map(
      (d) =>
        `${formatCurrencyExact(d.result.breakdown.exclusivityFee)} (${(
          d.result.breakdown.exclusivityMultiplier * 100
        ).toFixed(0)}%)`
    );

    const turnVals = visibleDeals.map((d) =>
      d.scope.turnaroundWindow === 'rush_under_5d'
        ? 'Rush (<5 business days)'
        : 'Standard (14 days)'
    );
    const turnSub = visibleDeals.map((d) =>
      d.result.breakdown.rushFee > 0
        ? `+${formatCurrencyExact(d.result.breakdown.rushFee)}`
        : '$0.00'
    );

    const revVals = visibleDeals.map(
      (d) => `${d.scope.includedRevisionRounds} rounds`
    );
    const revSub = visibleDeals.map((d) =>
      d.result.breakdown.excessRevisionsFee > 0
        ? `+${formatCurrencyExact(d.result.breakdown.excessRevisionsFee)} excess`
        : 'Covered in Base Fee'
    );

    const tierAVals = visibleDeals.map((d) =>
      formatCurrencyExact(d.result.tieredPackages.tierA_Organic.fee)
    );
    const tierBVals = visibleDeals.map((d) =>
      formatCurrencyExact(d.result.tieredPackages.tierB_StandardGrowth.fee)
    );
    const tierCVals = visibleDeals.map((d) =>
      formatCurrencyExact(d.result.tieredPackages.tierC_FullScale.fee)
    );

    const projections = visibleDeals.map((d) => calculatePerformanceProjection(d));
    const targetCpaVals = projections.map((p) =>
      p.targetCpa !== null ? formatCurrencyExact(p.targetCpa) : 'Not set'
    );
    const targetCpaSub = projections.map((p) =>
      p.breakEvenConversions !== null
        ? `${formatNumber(p.breakEvenConversions)} break-even conversions needed`
        : 'Add Target CPA to compute break-even'
    );
    const projectionVals = projections.map(
      (p) => `~${formatNumber(p.projectedConversions)} est. conversions`
    );
    const projectionSub = projections.map((p) => {
      const cpaStr =
        p.projectedConversions > 0
          ? `${formatCurrencyExact(p.projectedCpa)} est. CPA`
          : 'No engagement volume';
      if (p.breakEvenConversions !== null && p.requiredEngagementConversionRate !== null) {
        return `${cpaStr} · ${p.requiredEngagementConversionRate.toFixed(1)}% of ${formatNumber(p.totalEngagements)} actions needed`;
      }
      return `${cpaStr} (${(p.engagementCaptureRate * 100).toFixed(1)}% of ${formatNumber(p.totalEngagements)} actions)`;
    });

    const monthlyRevVals = visibleDeals.map((d) =>
      typeof d.targetMonthlyRevenue === 'number' && d.targetMonthlyRevenue > 0
        ? formatCurrencyExact(d.targetMonthlyRevenue)
        : 'Not set'
    );
    const monthlyRevDealsSub = visibleDeals.map((d) => {
      const rev = d.targetMonthlyRevenue;
      const rate = d.result.breakdown.totalRecommendedRate;
      if (typeof rev === 'number' && rev > 0 && rate > 0) {
        const needed = Math.ceil(rev / rate);
        return `${needed} ${needed === 1 ? 'deal' : 'deals'}/mo needed (${(rev / rate).toFixed(1)}x)`;
      }
      return 'Set Target Monthly Revenue to calculate';
    });

    return [
      {
        id: 'total_rate',
        section: 'Valuation & Economics',
        label: 'Total Recommended Rate',
        values: totalVals,
        subValues: totalNums.map((n) => {
          if (visibleDeals.length < 2 || !checkDiff(totalVals)) return 'Current quote';
          const delta = n - minTotal;
          if (delta === 0) return 'Lowest total quote';
          const pct = minTotal > 0 ? Math.round((delta / minTotal) * 100) : 0;
          return `+${formatCurrencyExact(delta)} (+${pct}% vs lowest)`;
        }),
        rawNumbers: totalNums,
        differs: checkDiff(totalVals),
        isPrimaryMetric: true,
      },
      {
        id: 'base_fee',
        section: 'Valuation & Economics',
        label: 'Base Creation Fee',
        values: baseVals,
        subValues: baseNums.map((n) => {
          if (visibleDeals.length < 2 || !checkDiff(baseVals)) return 'Organic creative';
          const delta = n - minBase;
          return delta === 0
            ? 'Baseline'
            : `+${formatCurrencyExact(delta)} vs lowest`;
        }),
        rawNumbers: baseNums,
        differs: checkDiff(baseVals),
      },
      {
        id: 'riders_total',
        section: 'Valuation & Economics',
        label: 'Total Commercial Add-Ons',
        values: ridersVals,
        subValues: ridersNums.map((n, idx) => {
          const base = baseNums[idx] || 1;
          return `${Math.round((n / base) * 100)}% uplift over Base Fee`;
        }),
        differs: checkDiff(ridersVals),
      },
      {
        id: 'fee_split',
        section: 'Valuation & Economics',
        label: 'Creative vs. Rights Mix',
        values: splitVals,
        differs: checkDiff(splitVals),
      },
      {
        id: 'net_se_tax',
        section: 'Valuation & Economics',
        label: 'Est. Net After 15.3% SE Tax',
        values: netVals,
        differs: checkDiff(netVals),
      },
      {
        id: 'target_cpa',
        section: 'Valuation & Economics',
        label: 'Brand Target CPA',
        values: targetCpaVals,
        subValues: targetCpaSub,
        differs: checkDiff(targetCpaVals),
      },
      {
        id: 'performance_projection',
        section: 'Valuation & Economics',
        label: 'Performance Projection',
        values: projectionVals,
        subValues: projectionSub,
        differs: checkDiff(projectionVals) || checkDiff(targetCpaVals),
      },
      {
        id: 'target_monthly_revenue',
        section: 'Valuation & Economics',
        label: 'Target Monthly Revenue',
        values: monthlyRevVals,
        subValues: monthlyRevDealsSub,
        differs: checkDiff(monthlyRevVals) || checkDiff(monthlyRevDealsSub),
      },
      {
        id: 'platform',
        section: 'Creator Metrics',
        label: 'Platform & Multiplier',
        values: platformVals,
        subValues: platformSub,
        differs: checkDiff(platformVals) || checkDiff(platformSub),
      },
      {
        id: 'niche',
        section: 'Creator Metrics',
        label: 'Vertical & Niche CPM',
        values: nicheVals,
        subValues: nicheSub,
        differs: checkDiff(nicheVals) || checkDiff(nicheSub),
      },
      {
        id: 'median_views',
        section: 'Creator Metrics',
        label: 'Median Views (10–15 Posts)',
        values: viewsVals,
        subValues: followersSub,
        differs: checkDiff(viewsVals),
      },
      {
        id: 'engagement',
        section: 'Creator Metrics',
        label: 'Engagement Rate (ER)',
        values: erVals,
        subValues: erSub,
        differs: checkDiff(erVals),
      },
      {
        id: 'floor',
        section: 'Creator Metrics',
        label: 'Production Floor',
        values: floorVals,
        differs: checkDiff(floorVals),
      },
      {
        id: 'usage',
        section: 'Scope & Rights Add-Ons',
        label: 'Paid Usage Rights',
        values: usageVals,
        subValues: usageSub,
        differs: checkDiff(usageVals) || checkDiff(usageSub),
      },
      {
        id: 'whitelisting',
        section: 'Scope & Rights Add-Ons',
        label: 'Whitelisting / Paid Boosting',
        values: wlVals,
        subValues: wlSub,
        differs: checkDiff(wlVals) || checkDiff(wlSub),
      },
      {
        id: 'exclusivity',
        section: 'Scope & Rights Add-Ons',
        label: 'Category Exclusivity',
        values: exclVals,
        subValues: exclSub,
        differs: checkDiff(exclVals) || checkDiff(exclSub),
      },
      {
        id: 'turnaround',
        section: 'Scope & Rights Add-Ons',
        label: 'Turnaround Window',
        values: turnVals,
        subValues: turnSub,
        differs: checkDiff(turnVals),
      },
      {
        id: 'revisions',
        section: 'Scope & Rights Add-Ons',
        label: 'Revision Rounds',
        values: revVals,
        subValues: revSub,
        differs: checkDiff(revVals),
      },
      {
        id: 'tier_a',
        section: 'Tiered Packages',
        label: 'Option A: Organic Distribution',
        values: tierAVals,
        subValues: visibleDeals.map(() => 'Organic reposting only'),
        differs: checkDiff(tierAVals),
      },
      {
        id: 'tier_b',
        section: 'Tiered Packages',
        label: 'Option B: Standard Growth',
        values: tierBVals,
        subValues: visibleDeals.map(() => '90d Paid + 30d Named Exclusivity'),
        differs: checkDiff(tierBVals),
      },
      {
        id: 'tier_c',
        section: 'Tiered Packages',
        label: 'Option C: Comprehensive Scale',
        values: tierCVals,
        subValues: visibleDeals.map(() => '180d Paid + Whitelisting + 60d Excl.'),
        differs: checkDiff(tierCVals),
      },
    ];
  }, [visibleDeals]);

  const visibleRows = diffOnly ? rows.filter((r) => r.differs) : rows;
  const differingCount = rows.filter((r) => r.differs).length;

  const sections: ComparisonRow['section'][] = [
    'Valuation & Economics',
    'Creator Metrics',
    'Scope & Rights Add-Ons',
    'Tiered Packages',
  ];

  const handleCopyComparison = async () => {
    const md = generateComparisonMarkdown(visibleDeals);
    try {
      await navigator.clipboard.writeText(md);
      onNotify('Copied side-by-side comparison table to clipboard.');
    } catch {
      onNotify('Unable to access clipboard in this browser context.');
    }
  };

  const commitRename = (id: string) => {
    if (editingName.trim()) {
      onRenameDeal(id, editingName.trim());
    }
    setEditingId(null);
  };

  const commitNotesUpdate = (id: string) => {
    onUpdateDealNotes(id, editingNotesText.trim());
    setEditingNotesId(null);
  };

  const commitCpaUpdate = (id: string) => {
    const parsed = Number(editingCpaText);
    const valid =
      editingCpaText.trim() !== '' && Number.isFinite(parsed) && parsed > 0
        ? parsed
        : undefined;
    onUpdateDealTargetCpa(id, valid);
    setEditingCpaId(null);
  };

  const commitRevenueUpdate = (id: string) => {
    const parsed = Number(editingRevenueText);
    const valid =
      editingRevenueText.trim() !== '' && Number.isFinite(parsed) && parsed > 0
        ? parsed
        : undefined;
    onUpdateDealTargetMonthlyRevenue(id, valid);
    setEditingRevenueId(null);
  };

  return (
    <div className="space-y-6">
      {/* Comparison Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBackToCalculator}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back to Rate Calculator
          </button>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
            Deal Comparison Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Compare saved sponsorship quotes side-by-side to evaluate how usage windows, whitelisting, and exclusivity shift total deal value.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              onSaveCurrentDeal(
                `${PLATFORM_SPECS[currentProfile.platform].shortLabel} · ${
                  USAGE_RIGHTS_SPECS[currentScope.usageRightsTerm].label.split(' ')[0]
                } (${formatCurrencyExact(currentResult.breakdown.totalRecommendedRate)})`
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
            Snapshot Current Quote
          </button>

          {savedDeals.length > 0 && visibleDeals.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopyComparison}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy Comparison
              </button>
              <button
                type="button"
                onClick={onClearAllDeals}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty State */}
      {savedDeals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-2xl mx-auto">
          <Scale className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-slate-900">
            No Saved Deals to Compare Yet
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 max-w-md mx-auto">
            Save your current calculator configuration or load two realistic negotiation scenarios (e.g., Organic vs. 90-Day Paid + Exclusivity) to inspect pricing and scope deltas side-by-side.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => onSaveCurrentDeal()}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Save Current Calculator Quote
            </button>
            <button
              type="button"
              onClick={onLoadSampleComparison}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100/70 transition-colors cursor-pointer"
            >
              Load Sample 2-Deal Comparison
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter & Sort Controls Bar */}
          <section
            aria-label="Filter and sort saved deals"
            className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5"
          >
            <div className="flex flex-wrap items-center gap-4">
              {/* Platform Filter */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="comparison-platform-filter"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  Platform
                </label>
                <select
                  id="comparison-platform-filter"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value as PlatformId | 'all')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                >
                  <option value="all">All Platforms ({savedDeals.length})</option>
                  {(Object.keys(PLATFORM_SPECS) as PlatformId[]).map((pid) => {
                    const count = platformCounts.get(pid) ?? 0;
                    return (
                      <option key={pid} value={pid}>
                        {PLATFORM_SPECS[pid].label} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Tag Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="comparison-tag-filter"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap"
                >
                  <Tag className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  Tag
                </label>
                <select
                  id="comparison-tag-filter"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                >
                  <option value="all">All Tags ({savedDeals.length})</option>
                  {availableTagOptions.map((tag) => {
                    const count = tagCounts.get(tag) ?? 0;
                    return (
                      <option key={tag} value={tag}>
                        {tag} ({count})
                      </option>
                    );
                  })}
                  {untaggedCount > 0 && (
                    <option value="__untagged__">Untagged ({untaggedCount})</option>
                  )}
                </select>
              </div>

              {/* Sort Order by Total Deal Rate or Tag */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  Sort
                </span>
                <div
                  role="group"
                  aria-label="Sort saved deals by Total Deal Rate or Tag"
                  className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
                >
                  <button
                    type="button"
                    aria-pressed={sortOrder === 'default'}
                    onClick={() => setSortOrder('default')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      sortOrder === 'default'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Saved Order
                  </button>
                  <button
                    type="button"
                    aria-pressed={sortOrder === 'rate_asc'}
                    onClick={() => setSortOrder('rate_asc')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      sortOrder === 'rate_asc'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Low to High
                  </button>
                  <button
                    type="button"
                    aria-pressed={sortOrder === 'rate_desc'}
                    onClick={() => setSortOrder('rate_desc')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      sortOrder === 'rate_desc'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    High to Low
                  </button>
                  <button
                    type="button"
                    aria-pressed={sortOrder === 'tag_asc'}
                    onClick={() => setSortOrder('tag_asc')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      sortOrder === 'tag_asc'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By Tag
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-3 text-xs tabular-nums">
              <span className="text-slate-600">
                Showing <strong className="text-slate-900">{visibleDeals.length}</strong> of{' '}
                <strong className="text-slate-900">{savedDeals.length}</strong> saved{' '}
                {savedDeals.length === 1 ? 'deal' : 'deals'}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  Reset
                </button>
              )}
            </div>
          </section>

          {/* Performance vs Goal Progress Indicator */}
          {allDealsGoalSummary && (
            <section
              aria-label="Performance vs Goal progress indicator"
              className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                    <h2 className="font-display text-base font-semibold text-slate-900">
                      Performance vs Goal
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Percentage progress toward your saved Target Monthly Revenue from the sum of all Total Deal Rates ({savedDeals.length}{' '}
                    {savedDeals.length === 1 ? 'saved proposal' : 'saved proposals'}).
                  </p>
                </div>

                {allDealsGoalSummary.targetMonthlyRevenue !== null &&
                allDealsGoalSummary.coveragePct !== null ? (
                  <div
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums shrink-0 ${
                      allDealsGoalSummary.coveragePct >= 100
                        ? 'text-emerald-700'
                        : 'text-blue-700'
                    }`}
                  >
                    {allDealsGoalSummary.coveragePct >= 100 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          Goal Reached (
                          {allDealsGoalSummary.surplus !== null &&
                          allDealsGoalSummary.surplus > 0
                            ? `+${formatCurrencyExact(allDealsGoalSummary.surplus)} surplus`
                            : '100% funded'}
                          )
                        </span>
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {formatCurrencyExact(allDealsGoalSummary.remainingGap ?? 0)} remaining to goal
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    Target Monthly Revenue not set
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1 tabular-nums">
                <div className="border border-slate-200/80 rounded-lg p-3.5 bg-slate-50/50">
                  <div className="text-[11px] font-medium text-slate-500">
                    Sum of All Total Deal Rates
                  </div>
                  <div className="font-mono text-lg font-bold text-slate-900 mt-0.5">
                    {formatCurrencyExact(allDealsGoalSummary.aggregatedTotalDealRate)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Avg {formatCurrencyExact(allDealsGoalSummary.avgDealRate)} / deal
                  </div>
                </div>

                <div className="border border-slate-200/80 rounded-lg p-3.5 bg-slate-50/50">
                  <div className="text-[11px] font-medium text-slate-500">
                    Target Monthly Revenue
                  </div>
                  <div className="font-mono text-lg font-bold text-slate-900 mt-0.5">
                    {allDealsGoalSummary.targetMonthlyRevenue !== null
                      ? formatCurrencyExact(allDealsGoalSummary.targetMonthlyRevenue)
                      : 'Not set'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {allDealsGoalSummary.targetMonthlyRevenue !== null
                      ? allDealsGoalSummary.hasMixedGoals
                        ? 'Average of saved goals'
                        : 'Saved monthly goal'
                      : 'Edit Target Monthly Revenue below'}
                  </div>
                </div>

                <div className="border border-slate-200/80 rounded-lg p-3.5 bg-slate-50/50">
                  <div className="text-[11px] font-medium text-slate-500">
                    Goal Progress
                  </div>
                  <div
                    className={`font-mono text-lg font-bold mt-0.5 ${
                      allDealsGoalSummary.coveragePct === null
                        ? 'text-slate-400'
                        : allDealsGoalSummary.coveragePct >= 100
                        ? 'text-emerald-700'
                        : 'text-blue-700'
                    }`}
                  >
                    {allDealsGoalSummary.coveragePct !== null
                      ? `${allDealsGoalSummary.coveragePct.toFixed(1)}%`
                      : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {allDealsGoalSummary.coveragePct !== null
                      ? allDealsGoalSummary.coveragePct >= 100
                        ? 'Monthly target achieved'
                        : 'Of monthly income goal'
                      : 'Requires monthly revenue target'}
                  </div>
                </div>

                <div className="border border-slate-200/80 rounded-lg p-3.5 bg-slate-50/50">
                  <div className="text-[11px] font-medium text-slate-500">
                    Deals Needed / Month
                  </div>
                  <div className="font-mono text-lg font-bold text-slate-900 mt-0.5">
                    {allDealsGoalSummary.dealsNeededAtAvgRate !== null
                      ? `${allDealsGoalSummary.dealsNeededAtAvgRate} ${
                          allDealsGoalSummary.dealsNeededAtAvgRate === 1 ? 'deal' : 'deals'
                        }`
                      : '—'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {allDealsGoalSummary.exactDealsAtAvgRate !== null
                      ? `${allDealsGoalSummary.exactDealsAtAvgRate.toFixed(1)}x at current avg rate`
                      : 'Set goal to project volume'}
                  </div>
                </div>
              </div>

              {allDealsGoalSummary.targetMonthlyRevenue !== null &&
                allDealsGoalSummary.coveragePct !== null && (
                  <div className="space-y-2 pt-1">
                    <div
                      role="progressbar"
                      aria-label="Performance vs Goal progress toward Target Monthly Revenue"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(100, Math.round(allDealsGoalSummary.coveragePct))}
                      aria-valuetext={`${allDealsGoalSummary.coveragePct.toFixed(1)}% of ${formatCurrencyExact(
                        allDealsGoalSummary.targetMonthlyRevenue
                      )} Target Monthly Revenue`}
                      className="h-3 w-full bg-slate-100 border border-slate-200 rounded-full overflow-hidden"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          allDealsGoalSummary.coveragePct >= 100
                            ? 'bg-emerald-600'
                            : 'bg-blue-700'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, allDealsGoalSummary.coveragePct))}%`,
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 tabular-nums">
                      <span>0% ($0)</span>
                      <span>
                        50% ({formatCurrency(allDealsGoalSummary.targetMonthlyRevenue * 0.5)})
                      </span>
                      <span>
                        100% ({formatCurrencyExact(allDealsGoalSummary.targetMonthlyRevenue)})
                      </span>
                    </div>

                    {(platformFilter !== 'all' || tagFilter !== 'all') &&
                      monthlyGoalSummary &&
                      allDealsGoalSummary.targetMonthlyRevenue > 0 && (
                        <div className="text-xs text-slate-600 pt-1 border-t border-slate-100 tabular-nums">
                          Active filter (
                          {[
                            platformFilter !== 'all' ? PLATFORM_SPECS[platformFilter].label : null,
                            tagFilter === '__untagged__'
                              ? 'Untagged'
                              : tagFilter !== 'all'
                              ? `Tag: ${tagFilter}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          ):{' '}
                          <strong className="font-mono text-slate-900">
                            {formatCurrencyExact(monthlyGoalSummary.aggregatedTotalDealRate)}
                          </strong>{' '}
                          contributes{' '}
                          <strong className="font-mono text-blue-700">
                            {(
                              (monthlyGoalSummary.aggregatedTotalDealRate /
                                allDealsGoalSummary.targetMonthlyRevenue) *
                              100
                            ).toFixed(1)}
                            %
                          </strong>{' '}
                          toward this monthly goal.
                        </div>
                      )}
                  </div>
                )}
            </section>
          )}

          {visibleDeals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <Filter className="w-7 h-7 text-slate-400 mx-auto mb-2.5" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                No Saved Deals Match Active Filters
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                You have {savedDeals.length} saved{' '}
                {savedDeals.length === 1 ? 'proposal' : 'proposals'} that do not match the selected{' '}
                {[
                  platformFilter !== 'all'
                    ? `platform (${PLATFORM_SPECS[platformFilter].label})`
                    : null,
                  tagFilter === '__untagged__'
                    ? 'tag (Untagged)'
                    : tagFilter !== 'all'
                    ? `tag (${tagFilter})`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' and ')}
                .
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset Filters
              </button>
            </div>
          ) : (
            <>
          {/* Visualizations Grid: Side-by-Side Bar Chart + Chronological Rate Trend */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Side-by-Side Total Fees Bar Chart */}
            <section
              aria-label="Total fees comparison bar chart"
              className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
            >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Total Deal Fees Side-by-Side
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual comparison of total recommended quotes across your saved scenarios.
                </p>
              </div>

              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setChartMode('total')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    chartMode === 'total'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Total Fee
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('stacked')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    chartMode === 'stacked'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Base + Add-Ons
                </button>
              </div>
            </div>

            <div className="pt-5 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 24, right: 16, left: 8, bottom: 8 }}
                  barCategoryGap="24%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fill: '#334155', fontSize: 12 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val: number) => formatCurrency(val)}
                    tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={76}
                  />
                  <Tooltip
                    content={<DealChartTooltip />}
                    formatter={(value) => formatCurrencyExact(Number(value ?? 0))}
                    labelFormatter={(_label, payload) =>
                      payload?.[0]?.payload?.name ?? ''
                    }
                    cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                  />
                  {chartMode === 'total' ? (
                    <Bar
                      dataKey="totalFee"
                      name="Total Recommended Rate"
                      fill="#1D4ED8"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={88}
                    >
                      <LabelList
                        dataKey="totalFee"
                        position="top"
                        formatter={(val: unknown) =>
                          typeof val === 'number' ? formatCurrencyExact(val) : ''
                        }
                        style={{
                          fill: '#0F172A',
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: 'IBM Plex Mono, monospace',
                        }}
                      />
                    </Bar>
                  ) : (
                    <>
                      <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        iconType="square"
                      />
                      <Bar
                        dataKey="baseFee"
                        name="Base Creation Fee"
                        stackId="deal"
                        fill="#0F172A"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={88}
                      />
                      <Bar
                        dataKey="ridersFee"
                        name="Commercial Add-Ons"
                        stackId="deal"
                        fill="#1D4ED8"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={88}
                      >
                        <LabelList
                          dataKey="totalFee"
                          position="top"
                          formatter={(val: unknown) =>
                            typeof val === 'number' ? formatCurrencyExact(val) : ''
                          }
                          style={{
                            fill: '#0F172A',
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: 'IBM Plex Mono, monospace',
                          }}
                        />
                      </Bar>
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

            {/* Chronological Total Deal Rate Trend Chart */}
            <section
              aria-label="Total deal rate trend over time"
              className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Total Deal Rate Trend (Chronological)
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {trendSummary ? (
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${
                          trendSummary.direction === 'up'
                            ? 'text-emerald-700'
                            : trendSummary.direction === 'down'
                            ? 'text-red-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {trendSummary.direction === 'up' ? (
                          <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        ) : trendSummary.direction === 'down' ? (
                          <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {trendSummary.direction === 'up'
                            ? 'Trending Up'
                            : trendSummary.direction === 'down'
                            ? 'Trending Down'
                            : 'Flat'}
                        </span>
                        <span className="font-mono">
                          ({trendSummary.delta > 0 ? '+' : ''}
                          {formatCurrencyExact(trendSummary.delta)} /{' '}
                          {trendSummary.pct > 0 ? '+' : ''}
                          {trendSummary.pct.toFixed(0)}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Plots saved Total Deal Rates sorted by timestamp (save 2+ deals for slope)
                      </span>
                    )}
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => setTrendMode('total')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      trendMode === 'total'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Total Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMode('compareBase')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      trendMode === 'compareBase'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    + Base Fee
                  </button>
                </div>
              </div>

              <div className="pt-5 h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 24, right: 24, left: 8, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="totalRateTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="axisKey"
                      tickFormatter={(key) => trendLabelMap.get(String(key)) ?? ''}
                      tick={{ fill: '#334155', fontSize: 11 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val: number) => formatCurrency(val)}
                      tick={{
                        fill: '#64748B',
                        fontSize: 11,
                        fontFamily: 'IBM Plex Mono, monospace',
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={76}
                    />
                    <Tooltip
                      content={<TrendChartTooltip />}
                      cursor={{ stroke: '#94A3B8', strokeDasharray: '3 3' }}
                    />
                    {trendData.length >= 2 && monthlyGoalSummary && (
                      <ReferenceLine
                        y={monthlyGoalSummary.avgDealRate}
                        stroke="#94A3B8"
                        strokeDasharray="4 4"
                        label={{
                          value: `Avg ${formatCurrency(monthlyGoalSummary.avgDealRate)}`,
                          position: 'insideTopRight',
                          fill: '#64748B',
                          fontSize: 11,
                          fontFamily: 'IBM Plex Mono, monospace',
                        }}
                      />
                    )}
                    {trendMode === 'compareBase' && (
                      <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        iconType="plainline"
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="totalRate"
                      name="Total Deal Rate"
                      stroke="#1D4ED8"
                      strokeWidth={2.5}
                      fill="url(#totalRateTrendFill)"
                      dot={{
                        r: 5,
                        fill: '#FFFFFF',
                        stroke: '#1D4ED8',
                        strokeWidth: 2.5,
                      }}
                      activeDot={{
                        r: 6.5,
                        fill: '#1D4ED8',
                        stroke: '#FFFFFF',
                        strokeWidth: 2,
                      }}
                    >
                      <LabelList
                        dataKey="totalRate"
                        position="top"
                        offset={10}
                        formatter={(val: unknown) =>
                          typeof val === 'number' ? formatCurrency(val) : ''
                        }
                        style={{
                          fill: '#0F172A',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'IBM Plex Mono, monospace',
                        }}
                      />
                    </Area>
                    {trendMode === 'compareBase' && (
                      <Area
                        type="monotone"
                        dataKey="baseFee"
                        name="Base Creation Fee"
                        stroke="#0F172A"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        fill="none"
                        dot={{
                          r: 4,
                          fill: '#FFFFFF',
                          stroke: '#0F172A',
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 5.5,
                          fill: '#0F172A',
                          stroke: '#FFFFFF',
                          strokeWidth: 2,
                        }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* AI Negotiating Coach */}
          <NegotiationCoachPanel deals={visibleDeals} onNotify={onNotify} />

          {/* Performance Projection & Target CPA Summary Table */}
          <section
            aria-label="Deal performance projection summary"
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-baseline justify-between gap-2 bg-slate-50/70">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Brand ROI &amp; Performance Projection
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Projects expected conversions from high-intent engagement actions (saves, shares, comments) against each deal&rsquo;s rate and Target CPA.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span>Capture model: 2.5%–6.0% of high-intent actions by ER tier</span>
                {visibleDeals.length > 1 && rateBounds.max > rateBounds.min && (
                  <span className="inline-flex items-center gap-1.5" aria-label="Total Deal Rate color density scale from low to high">
                    <span className="text-slate-500">Rate scale: Low</span>
                    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-50 border border-blue-200" />
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-100" />
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-200" />
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-700" />
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-900" />
                    </span>
                    <span className="text-slate-700 font-medium">High</span>
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[880px]">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th scope="col" className="py-3 px-4 font-semibold">
                      Saved Deal
                    </th>
                    <th scope="col" className="py-3 px-4 font-semibold text-right">
                      Total Deal Rate
                    </th>
                    <th scope="col" className="py-3 px-4 font-semibold text-right">
                      Engagement Metrics
                    </th>
                    <th scope="col" className="py-3 px-4 font-semibold text-right">
                      Target CPA
                    </th>
                    <th scope="col" className="py-3 px-4 font-semibold text-right">
                      Target Monthly Revenue
                    </th>
                    <th scope="col" className="py-3 px-4 font-semibold">
                      Performance Projection
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {visibleDeals.map((deal) => {
                    const proj = calculatePerformanceProjection(deal);
                    const isEditingCpa = editingCpaId === deal.id;
                    const isEditingRev = editingRevenueId === deal.id;
                    const density = getRateDensityClasses(
                      deal.result.breakdown.totalRecommendedRate,
                      rateBounds.min,
                      rateBounds.max,
                      visibleDeals.length
                    );
                    const revGoal =
                      typeof deal.targetMonthlyRevenue === 'number' &&
                      deal.targetMonthlyRevenue > 0
                        ? deal.targetMonthlyRevenue
                        : null;
                    const dealsNeededForThisRate =
                      revGoal !== null && deal.result.breakdown.totalRecommendedRate > 0
                        ? Math.ceil(revGoal / deal.result.breakdown.totalRecommendedRate)
                        : null;

                    return (
                      <tr key={`proj-${deal.id}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-slate-900">{deal.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {PLATFORM_SPECS[deal.profile.platform].shortLabel} ·{' '}
                            {formatNumber(deal.profile.medianViews)} median views
                          </div>
                          {deal.tags && deal.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              {deal.tags.map((tag) => (
                                <span
                                  key={`roi-tag-${deal.id}-${tag}`}
                                  className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-sm"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td
                          className={`py-3.5 px-4 align-top text-right font-mono font-semibold whitespace-nowrap transition-colors ${density.cellClass} ${density.textClass}`}
                        >
                          {formatCurrencyExact(deal.result.breakdown.totalRecommendedRate)}
                        </td>
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="font-mono font-medium text-slate-900">
                            {formatNumber(proj.totalEngagements)} actions
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {proj.calculatedER.toFixed(1)}% ER ({(proj.engagementCaptureRate * 100).toFixed(1)}% conv. benchmark)
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          {isEditingCpa ? (
                            <div className="inline-flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                min={1}
                                step="any"
                                value={editingCpaText}
                                onChange={(e) => setEditingCpaText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitCpaUpdate(deal.id);
                                  if (e.key === 'Escape') setEditingCpaId(null);
                                }}
                                autoFocus
                                aria-label={`Edit Target CPA for ${deal.name}`}
                                className="w-20 px-2 py-1 text-xs font-mono text-right border border-blue-500 rounded bg-white text-slate-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => commitCpaUpdate(deal.id)}
                                aria-label="Save Target CPA"
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span
                                className={`font-mono ${
                                  proj.targetCpa !== null
                                    ? 'font-semibold text-slate-900'
                                    : 'text-slate-400 italic font-sans'
                                }`}
                              >
                                {proj.targetCpa !== null
                                  ? formatCurrencyExact(proj.targetCpa)
                                  : 'Not set'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCpaId(deal.id);
                                  setEditingCpaText(
                                    proj.targetCpa !== null ? String(proj.targetCpa) : ''
                                  );
                                }}
                                aria-label={`Set Target CPA for ${deal.name}`}
                                className="p-1 text-slate-400 hover:text-blue-700 rounded cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          {isEditingRev ? (
                            <div className="inline-flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                min={100}
                                step="any"
                                value={editingRevenueText}
                                onChange={(e) => setEditingRevenueText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRevenueUpdate(deal.id);
                                  if (e.key === 'Escape') setEditingRevenueId(null);
                                }}
                                autoFocus
                                aria-label={`Edit Target Monthly Revenue for ${deal.name}`}
                                className="w-24 px-2 py-1 text-xs font-mono text-right border border-blue-500 rounded bg-white text-slate-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => commitRevenueUpdate(deal.id)}
                                aria-label="Save Target Monthly Revenue"
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <span
                                  className={`font-mono ${
                                    revGoal !== null
                                      ? 'font-semibold text-slate-900'
                                      : 'text-slate-400 italic font-sans'
                                  }`}
                                >
                                  {revGoal !== null
                                    ? formatCurrencyExact(revGoal)
                                    : 'Not set'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRevenueId(deal.id);
                                    setEditingRevenueText(
                                      revGoal !== null ? String(revGoal) : ''
                                    );
                                  }}
                                  aria-label={`Set Target Monthly Revenue for ${deal.name}`}
                                  className="p-1 text-slate-400 hover:text-blue-700 rounded cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {dealsNeededForThisRate !== null && (
                                <div className="text-[11px] font-mono text-slate-500">
                                  {dealsNeededForThisRate}{' '}
                                  {dealsNeededForThisRate === 1 ? 'deal' : 'deals'}/mo needed
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-mono font-semibold text-slate-900">
                              ~{formatNumber(proj.projectedConversions)} expected conversions
                            </span>
                            {proj.projectedConversions > 0 && (
                              <span className="text-xs font-mono text-slate-600">
                                ({formatCurrencyExact(proj.projectedCpa)} est. CPA)
                              </span>
                            )}
                            {proj.meetsTargetCpa !== null && (
                              <span
                                className={`text-[11px] font-semibold ${
                                  proj.meetsTargetCpa ? 'text-emerald-700' : 'text-amber-800'
                                }`}
                              >
                                · {proj.meetsTargetCpa ? 'Meets Target CPA' : 'Above Target CPA'}
                              </span>
                            )}
                          </div>
                          {proj.breakEvenConversions !== null && proj.targetCpa !== null ? (
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                              Break-even: {formatNumber(proj.breakEvenConversions)} conversions @{' '}
                              {formatCurrencyExact(proj.targetCpa)} Target CPA
                              {proj.requiredEngagementConversionRate !== null &&
                                ` (${proj.requiredEngagementConversionRate.toFixed(1)}% of engagements)`}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Set a Target CPA to calculate break-even conversion threshold.
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {monthlyGoalSummary && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200 font-medium text-slate-900 tabular-nums">
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-display font-semibold text-slate-900">
                          Monthly Income Goal Summary
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Aggregated across {visibleDeals.length}{' '}
                          {platformFilter === 'all' ? 'saved' : PLATFORM_SPECS[platformFilter].shortLabel}{' '}
                          {visibleDeals.length === 1 ? 'deal' : 'deals'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrencyExact(monthlyGoalSummary.aggregatedTotalDealRate)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          Avg {formatCurrencyExact(monthlyGoalSummary.avgDealRate)}/deal
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right text-slate-500 font-mono whitespace-nowrap">
                        —
                      </td>
                      <td className="py-3.5 px-4 align-top text-right text-slate-500 font-mono whitespace-nowrap">
                        —
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        {monthlyGoalSummary.targetMonthlyRevenue !== null ? (
                          <div>
                            <div className="font-mono font-bold text-slate-900">
                              {formatCurrencyExact(monthlyGoalSummary.targetMonthlyRevenue)}/mo
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {monthlyGoalSummary.hasMixedGoals
                                ? 'Avg monthly goal'
                                : 'Monthly income goal'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-normal">
                            Not set
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        {monthlyGoalSummary.targetMonthlyRevenue !== null &&
                        monthlyGoalSummary.dealsNeededAtAvgRate !== null &&
                        monthlyGoalSummary.exactDealsAtAvgRate !== null &&
                        monthlyGoalSummary.coveragePct !== null ? (
                          <div>
                            <div className="font-mono font-bold text-blue-700">
                              {monthlyGoalSummary.dealsNeededAtAvgRate}{' '}
                              {monthlyGoalSummary.dealsNeededAtAvgRate === 1
                                ? 'deal'
                                : 'deals'}
                              /mo needed at avg rate ({monthlyGoalSummary.exactDealsAtAvgRate.toFixed(1)}x)
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
                              Combined saved deals ({formatCurrencyExact(monthlyGoalSummary.aggregatedTotalDealRate)}) cover{' '}
                              {monthlyGoalSummary.coveragePct.toFixed(0)}% of{' '}
                              {formatCurrencyExact(monthlyGoalSummary.targetMonthlyRevenue)} goal
                              {monthlyGoalSummary.remainingGap !== null &&
                              monthlyGoalSummary.remainingGap > 0
                                ? ` · ${formatCurrencyExact(monthlyGoalSummary.remainingGap)} gap remaining`
                                : ' · Monthly target reached'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            Set Target Monthly Revenue on any deal to calculate deals needed per month.
                          </div>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Toolbar inside table container */}
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="text-xs text-slate-600 tabular-nums">
              Comparing <strong className="text-slate-900">{visibleDeals.length}</strong>{' '}
              {platformFilter === 'all' ? 'saved' : PLATFORM_SPECS[platformFilter].shortLabel}{' '}
              {visibleDeals.length === 1 ? 'deal' : 'deals'}
              {visibleDeals.length > 1 && (
                <>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <strong className="text-blue-700">{differingCount}</strong> differing dimensions highlighted
                </>
              )}
            </div>

            {visibleDeals.length > 1 && (
              <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDiffOnly(false)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    !diffOnly
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Rows ({rows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDiffOnly(true)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    diffOnly
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Differences Only ({differingCount})
                </button>
              </div>
            )}
          </div>

          {savedDeals.length === 1 && (
            <div className="px-5 py-3 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
              <span>
                Add at least one more deal snapshot (or change usage/exclusivity in the calculator and click &ldquo;Snapshot Current Quote&rdquo;) to highlight side-by-side differences.
              </span>
              <button
                type="button"
                onClick={onLoadSampleComparison}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Add Sample Comparison Deal
              </button>
            </div>
          )}

          {/* Side-by-side Responsive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th
                    scope="col"
                    className="w-56 p-4 align-bottom text-xs font-semibold text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100"
                  >
                    Deal Dimension
                  </th>
                  {visibleDeals.map((deal) => (
                    <th
                      key={deal.id}
                      scope="col"
                      className="p-4 align-top min-w-[230px] border-r last:border-r-0 border-slate-100"
                    >
                      <div className="space-y-2">
                        {editingId === deal.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename(deal.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs font-semibold border border-blue-500 rounded bg-white text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => commitRename(deal.id)}
                              aria-label="Confirm rename"
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-display text-sm font-semibold text-slate-900 leading-snug">
                              {deal.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(deal.id);
                                setEditingName(deal.name);
                              }}
                              aria-label={`Rename ${deal.name}`}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer shrink-0"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="text-[11px] font-normal text-slate-500">
                          Saved {new Date(deal.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="mx-1">·</span>
                          {deal.result.followerTier.label}
                        </div>

                        {deal.tags && deal.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {deal.tags.map((tag) => (
                              <span
                                key={`hdr-tag-${deal.id}-${tag}`}
                                className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onLoadDealIntoCalculator(deal)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          >
                            <Upload className="w-3 h-3" aria-hidden="true" />
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDeal(deal.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {/* Negotiation Context: Tags & Notes Rows */}
                <tr className="bg-slate-50/90">
                  <td
                    colSpan={visibleDeals.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 font-display"
                  >
                    Negotiation Context
                  </td>
                </tr>
                <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                  <th
                    scope="row"
                    className="p-4 align-top font-medium text-slate-700 sticky left-0 z-10 border-r border-slate-100 bg-white"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>Deal Tags</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        Priority &amp; pipeline stage labels
                      </span>
                    </div>
                  </th>
                  {visibleDeals.map((deal) => {
                    const dealTags = Array.isArray(deal.tags) ? deal.tags : [];
                    const isEditingTags = editingTagsId === deal.id;
                    return (
                      <td
                        key={`tags-${deal.id}`}
                        className="p-4 align-top border-r last:border-r-0 border-slate-100 text-xs"
                      >
                        <div className="space-y-2">
                          {dealTags.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {dealTags.map((tag) => (
                                <span
                                  key={`cell-tag-${deal.id}-${tag}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 rounded-md"
                                >
                                  <span>{tag}</span>
                                  {isEditingTags && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateDealTags(
                                          deal.id,
                                          dealTags.filter((t) => t !== tag)
                                        )
                                      }
                                      aria-label={`Remove ${tag} tag`}
                                      className="text-slate-500 hover:text-red-700 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">No tags assigned</p>
                          )}

                          {isEditingTags ? (
                            <div className="space-y-2 pt-1 border-t border-slate-100">
                              <div className="flex flex-wrap gap-1">
                                {DEFAULT_DEAL_TAGS.map((presetTag) => {
                                  const active = dealTags.includes(presetTag);
                                  return (
                                    <button
                                      key={presetTag}
                                      type="button"
                                      onClick={() => {
                                        const next = active
                                          ? dealTags.filter((t) => t !== presetTag)
                                          : [...dealTags, presetTag];
                                        onUpdateDealTags(deal.id, next);
                                      }}
                                      className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                                        active
                                          ? 'bg-blue-700 text-white border-blue-700'
                                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                      }`}
                                    >
                                      {presetTag}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={newCustomTagText}
                                  onChange={(e) => setNewCustomTagText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newCustomTagText.trim()) {
                                      e.preventDefault();
                                      onUpdateDealTags(deal.id, [
                                        ...dealTags,
                                        newCustomTagText.trim(),
                                      ]);
                                      setNewCustomTagText('');
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingTagsId(null);
                                      setNewCustomTagText('');
                                    }
                                  }}
                                  placeholder="Add custom tag..."
                                  className="flex-1 px-2 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (newCustomTagText.trim()) {
                                      onUpdateDealTags(deal.id, [
                                        ...dealTags,
                                        newCustomTagText.trim(),
                                      ]);
                                      setNewCustomTagText('');
                                    }
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTagsId(null);
                                    setNewCustomTagText('');
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTagsId(deal.id);
                                setNewCustomTagText('');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                            >
                              <Tag className="w-3 h-3" aria-hidden="true" />
                              {dealTags.length > 0 ? 'Edit tags' : 'Add tags'}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                  <th
                    scope="row"
                    className="p-4 align-top font-medium text-slate-700 sticky left-0 z-10 border-r border-slate-100 bg-white"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>Negotiation Notes</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        Deal-specific context &amp; counter terms
                      </span>
                    </div>
                  </th>
                  {visibleDeals.map((deal) => {
                    const isEditingNotes = editingNotesId === deal.id;
                    const hasNotes = Boolean(deal.notes && deal.notes.trim().length > 0);
                    return (
                      <td
                        key={`notes-${deal.id}`}
                        className="p-4 align-top border-r last:border-r-0 border-slate-100 text-xs"
                      >
                        {isEditingNotes ? (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              value={editingNotesText}
                              onChange={(e) => setEditingNotesText(e.target.value)}
                              placeholder="Add negotiation context..."
                              autoFocus
                              className="w-full px-2.5 py-1.5 text-xs border border-blue-500 rounded-md bg-white text-slate-900 focus:outline-none resize-y"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => commitNotesUpdate(deal.id)}
                                className="px-2.5 py-1 text-[11px] font-medium text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer"
                              >
                                Save Note
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNotesId(null)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {hasNotes ? (
                              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {deal.notes}
                              </p>
                            ) : (
                              <p className="text-slate-400 italic">
                                No negotiation notes added
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNotesId(deal.id);
                                setEditingNotesText(deal.notes ?? '');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" aria-hidden="true" />
                              {hasNotes ? 'Edit note' : 'Add note'}
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {sections.map((sectionName) => {
                  const sectionRows = visibleRows.filter(
                    (r) => r.section === sectionName
                  );
                  if (sectionRows.length === 0) return null;
                  return (
                    <React.Fragment key={sectionName}>
                      <tr className="bg-slate-50/90">
                        <td
                          colSpan={visibleDeals.length + 1}
                          className="px-4 py-2 text-xs font-semibold text-slate-700 font-display"
                        >
                          {sectionName}
                        </td>
                      </tr>
                      {sectionRows.map((row) => (
                        <tr
                          key={row.id}
                          className={
                            row.differs && visibleDeals.length > 1
                              ? 'bg-amber-50/35 hover:bg-amber-50/60 transition-colors'
                              : 'bg-white hover:bg-slate-50/60 transition-colors'
                          }
                        >
                          <th
                            scope="row"
                            className={`p-4 align-top font-medium text-slate-700 sticky left-0 z-10 border-r border-slate-100 ${
                              row.differs && visibleDeals.length > 1
                                ? 'bg-amber-50/60'
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span>{row.label}</span>
                              {row.differs && visibleDeals.length > 1 && (
                                <span className="text-[11px] font-semibold text-amber-800">
                                  Differs across deals
                                </span>
                              )}
                            </div>
                          </th>

                          {row.values.map((val, idx) => {
                            const isPrimaryRateRow = row.id === 'total_rate';
                            const isHighestTotal =
                              row.isPrimaryMetric &&
                              row.rawNumbers &&
                              visibleDeals.length > 1 &&
                              row.rawNumbers[idx] === Math.max(...row.rawNumbers) &&
                              new Set(row.rawNumbers).size > 1;

                            const density =
                              isPrimaryRateRow && row.rawNumbers
                                ? getRateDensityClasses(
                                    row.rawNumbers[idx],
                                    rateBounds.min,
                                    rateBounds.max,
                                    visibleDeals.length
                                  )
                                : null;

                            return (
                              <td
                                key={`${row.id}-${visibleDeals[idx].id}`}
                                className={`p-4 align-top border-r last:border-r-0 border-slate-100 tabular-nums transition-colors ${
                                  density ? density.cellClass : ''
                                }`}
                              >
                                <div
                                  className={`${
                                    row.isPrimaryMetric
                                      ? `font-mono text-base font-bold ${
                                          density ? density.textClass : 'text-slate-900'
                                        }`
                                      : 'font-medium text-slate-900'
                                  } ${
                                    row.section === 'Tiered Packages' ||
                                    row.section === 'Valuation & Economics'
                                      ? 'font-mono'
                                      : ''
                                  }`}
                                >
                                  {val}
                                  {isHighestTotal && (
                                    <span
                                      className={`ml-2 text-[11px] font-sans font-semibold ${
                                        density ? density.badgeTextClass : 'text-blue-700'
                                      }`}
                                    >
                                      Highest
                                    </span>
                                  )}
                                </div>
                                {row.subValues && row.subValues[idx] && (
                                  <div
                                    className={`text-[11px] mt-0.5 font-mono ${
                                      density ? density.subTextClass : 'text-slate-500'
                                    }`}
                                  >
                                    {row.subValues[idx]}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {monthlyGoalSummary && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs sm:text-sm tabular-nums">
                    <th
                      scope="row"
                      className="p-4 align-top font-semibold text-slate-900 sticky left-0 z-10 border-r border-slate-200 bg-slate-50"
                    >
                      <div className="font-display">Monthly Goal Aggregate</div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                        Sum Total Deal Rate vs. Monthly Goal
                      </div>
                    </th>
                    <td
                      colSpan={visibleDeals.length}
                      className="p-4 align-top text-slate-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="text-xs text-slate-500">
                            Aggregated Total Deal Rate ({visibleDeals.length}{' '}
                            {visibleDeals.length === 1 ? 'deal' : 'deals'}):{' '}
                          </span>
                          <strong className="font-mono text-slate-900">
                            {formatCurrencyExact(monthlyGoalSummary.aggregatedTotalDealRate)}
                          </strong>
                          <span className="text-slate-400 mx-2">·</span>
                          <span className="text-xs text-slate-500">Avg Rate: </span>
                          <strong className="font-mono text-slate-900">
                            {formatCurrencyExact(monthlyGoalSummary.avgDealRate)}
                          </strong>
                        </div>

                        {monthlyGoalSummary.targetMonthlyRevenue !== null &&
                        monthlyGoalSummary.dealsNeededAtAvgRate !== null &&
                        monthlyGoalSummary.coveragePct !== null ? (
                          <div className="font-mono font-semibold text-blue-700">
                            {monthlyGoalSummary.dealsNeededAtAvgRate}{' '}
                            {monthlyGoalSummary.dealsNeededAtAvgRate === 1
                              ? 'deal'
                              : 'deals'}
                            /mo needed to reach{' '}
                            {formatCurrencyExact(monthlyGoalSummary.targetMonthlyRevenue)}{' '}
                            ({monthlyGoalSummary.coveragePct.toFixed(0)}% covered by combined deals)
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            Add Target Monthly Revenue to compute required monthly deal volume.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
