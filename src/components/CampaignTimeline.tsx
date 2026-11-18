import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  RotateCcw,
  ShieldCheck,
  Upload,
  Zap,
} from 'lucide-react';
import {
  EXCLUSIVITY_SPECS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import { useCurrency } from '../context/CurrencyContext';
import { SavedDealSnapshot, TurnaroundWindow } from '../types/calculator';
import { formatCurrency } from '../utils/pricingEngine';

type MilestonePhase = 'kickoff' | 'concept' | 'approval' | 'draft' | 'revisions' | 'launch';

interface CampaignMilestone {
  id: string;
  phase: MilestonePhase;
  label: string;
  shortTag: string;
  dayOffset: number;
  date: Date;
  dateLabel: string;
  fullDateLabel: string;
  description: string;
}

interface DealSchedule {
  deal: SavedDealSnapshot;
  turnaroundWindow: TurnaroundWindow;
  isRush: boolean;
  startOffsetDays: number;
  startDate: Date;
  launchDate: Date;
  totalDurationDays: number;
  deliverableUnit: string;
  platformShortLabel: string;
  milestones: CampaignMilestone[];
  usageDurationDays: number | null; // null = perpetual, 0 = organic only
  usageEndDate: Date | null;
  whitelistingEndDate: Date | null;
  exclusivityDurationDays: number | null; // null = blanket vertical indefinite
  exclusivityEndDate: Date | null;
}

interface CampaignTimelineProps {
  deals: SavedDealSnapshot[];
  onLoadDealIntoCalculator: (deal: SavedDealSnapshot) => void;
}

function getLocalTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return parsed;
}

function addCalendarDays(baseDate: Date, days: number): Date {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + days);
}

function diffCalendarDays(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function resolveUsageDays(term: SavedDealSnapshot['scope']['usageRightsTerm']): number | null {
  switch (term) {
    case 'organic_only':
      return 0;
    case 'paid_30d':
      return 30;
    case 'paid_90d':
      return 90;
    case 'paid_180d':
      return 180;
    case 'paid_365d':
      return 365;
    case 'perpetual_buyout':
      return null;
  }
}

function resolveExclusivityDays(
  type: SavedDealSnapshot['scope']['exclusivityType']
): number | null {
  switch (type) {
    case 'none':
      return 0;
    case 'named_competitors_30d':
      return 30;
    case 'named_competitors_60d':
      return 60;
    case 'named_competitors_90d':
      return 90;
    case 'blanket_vertical_prohibition':
      return null;
  }
}

function buildCampaignMilestones(
  deal: SavedDealSnapshot,
  startDate: Date,
  deliverableUnit: string
): CampaignMilestone[] {
  const isRush = deal.scope.turnaroundWindow === 'rush_under_5d';
  const revCount = deal.scope.includedRevisionRounds;
  const revSummary =
    revCount === 0
      ? 'No included revision rounds (as-delivered final cut)'
      : revCount === 1
        ? '1 included consolidated revision round'
        : `${revCount} included consolidated revision rounds`;

  const templates: Array<{
    id: string;
    phase: MilestonePhase;
    label: string;
    shortTag: string;
    dayOffset: number;
    description: string;
  }> = isRush
    ? [
        {
          id: 'kickoff',
          phase: 'kickoff',
          label: 'Rush Kickoff',
          shortTag: 'Kickoff',
          dayOffset: 0,
          description: `Agreement signed, rush fee locked, and creative brief confirmed for ${deliverableUnit}.`,
        },
        {
          id: 'concept',
          phase: 'concept',
          label: 'Concept Lock',
          shortTag: 'Concept',
          dayOffset: 1,
          description: `Expedited hook, key talking points, and shot list approved within 24 hours.`,
        },
        {
          id: 'draft',
          phase: 'draft',
          label: 'Rough Cut',
          shortTag: 'Draft',
          dayOffset: 2,
          description: `First cut of ${deliverableUnit} delivered for rapid same-day brand review.`,
        },
        {
          id: 'revisions',
          phase: 'revisions',
          label: 'Rapid Revisions',
          shortTag: 'Revs',
          dayOffset: 3,
          description: `${revSummary} completed before final master export.`,
        },
        {
          id: 'launch',
          phase: 'launch',
          label: 'Final & Go-Live',
          shortTag: 'Go-Live',
          dayOffset: 4,
          description: `Final ${deliverableUnit} published on channel; rush delivery SLA fulfilled and invoice triggered.`,
        },
      ]
    : [
        {
          id: 'kickoff',
          phase: 'kickoff',
          label: 'Contract & Kickoff',
          shortTag: 'Kickoff',
          dayOffset: 0,
          description: `Agreement executed, payment schedule confirmed, and campaign brief reviewed for ${deliverableUnit}.`,
        },
        {
          id: 'concept',
          phase: 'concept',
          label: 'Concept & Script',
          shortTag: 'Script',
          dayOffset: 3,
          description: `Creator submits creative angle, hook options, and script outline for ${deliverableUnit}.`,
        },
        {
          id: 'approval',
          phase: 'approval',
          label: 'Brand Sign-Off',
          shortTag: 'Sign-Off',
          dayOffset: 6,
          description: `Brand concept approval gate required by Day 6 to keep production on the 14-day schedule.`,
        },
        {
          id: 'draft',
          phase: 'draft',
          label: 'First Cut Delivery',
          shortTag: 'Draft',
          dayOffset: 10,
          description: `Full edited draft of ${deliverableUnit} submitted with captions, audio mix, and disclosures.`,
        },
        {
          id: 'revisions',
          phase: 'revisions',
          label: 'Revisions & QA',
          shortTag: 'Revs',
          dayOffset: 12,
          description: `${revSummary}; final link stickers, FTC tags, and usage specs verified.`,
        },
        {
          id: 'launch',
          phase: 'launch',
          label: 'Final & Go-Live',
          shortTag: 'Go-Live',
          dayOffset: 14,
          description: `Final ${deliverableUnit} goes live on creator channel; post-launch licensing window begins.`,
        },
      ];

  return templates.map((tpl) => {
    const date = addCalendarDays(startDate, tpl.dayOffset);
    return {
      ...tpl,
      date,
      dateLabel: formatShortDate(date),
      fullDateLabel: formatFullDate(date),
    };
  });
}

const PHASE_MARKER_STYLE: Record<
  MilestonePhase,
  {
    node: string;
    activeRing: string;
    text: string;
  }
> = {
  kickoff: {
    node: 'bg-slate-700 dark:bg-slate-300 border-slate-900 dark:border-slate-100',
    activeRing: 'ring-2 ring-slate-900/25 dark:ring-slate-200/35',
    text: 'text-slate-700 dark:text-slate-300',
  },
  concept: {
    node: 'bg-blue-600 dark:bg-blue-400 border-blue-800 dark:border-blue-200',
    activeRing: 'ring-2 ring-blue-600/30 dark:ring-blue-400/35',
    text: 'text-blue-700 dark:text-blue-300',
  },
  approval: {
    node: 'bg-indigo-600 dark:bg-indigo-400 border-indigo-800 dark:border-indigo-200',
    activeRing: 'ring-2 ring-indigo-600/30 dark:ring-indigo-400/35',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
  draft: {
    node: 'bg-cyan-600 dark:bg-cyan-400 border-cyan-800 dark:border-cyan-200',
    activeRing: 'ring-2 ring-cyan-600/30 dark:ring-cyan-400/35',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  revisions: {
    node: 'bg-amber-600 dark:bg-amber-400 border-amber-800 dark:border-amber-200',
    activeRing: 'ring-2 ring-amber-600/30 dark:ring-amber-400/35',
    text: 'text-amber-700 dark:text-amber-300',
  },
  launch: {
    node: 'bg-emerald-600 dark:bg-emerald-400 border-emerald-800 dark:border-emerald-200',
    activeRing: 'ring-2 ring-emerald-600/30 dark:ring-emerald-400/35',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
};

export const CampaignTimeline: React.FC<CampaignTimelineProps> = ({
  deals,
  onLoadDealIntoCalculator,
}) => {
  const { currency } = useCurrency();
  const [projectStartDate, setProjectStartDate] = useState<string>(() => getLocalTodayString());
  const [turnaroundFilter, setTurnaroundFilter] = useState<'all' | TurnaroundWindow>('all');
  const [dealStartOffsets, setDealStartOffsets] = useState<Record<string, number>>({});
  const [selectedMilestoneKey, setSelectedMilestoneKey] = useState<string>('');

  const globalStartDate = useMemo(() => parseLocalDate(projectStartDate), [projectStartDate]);

  const turnaroundCounts = useMemo(() => {
    let standard = 0;
    let rush = 0;
    for (const deal of deals) {
      if (deal.scope.turnaroundWindow === 'rush_under_5d') {
        rush += 1;
      } else {
        standard += 1;
      }
    }
    return { all: deals.length, standard, rush };
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (turnaroundFilter === 'all') return deals;
    return deals.filter((d) => d.scope.turnaroundWindow === turnaroundFilter);
  }, [deals, turnaroundFilter]);

  const schedules = useMemo<DealSchedule[]>(() => {
    return filteredDeals.map((deal) => {
      const startOffsetDays = dealStartOffsets[deal.id] ?? 0;
      const startDate = addCalendarDays(globalStartDate, startOffsetDays);
      const isRush = deal.scope.turnaroundWindow === 'rush_under_5d';
      const totalDurationDays = isRush ? 4 : 14;
      const platformSpec = PLATFORM_SPECS[deal.profile.platform];
      const deliverableUnit = platformSpec?.deliverableUnit ?? '1 Sponsored Deliverable';
      const platformShortLabel = platformSpec?.shortLabel ?? deal.profile.platform;

      const milestones = buildCampaignMilestones(deal, startDate, deliverableUnit);
      const launchDate = milestones[milestones.length - 1].date;

      const usageDurationDays = resolveUsageDays(deal.scope.usageRightsTerm);
      const usageEndDate =
        usageDurationDays !== null && usageDurationDays > 0
          ? addCalendarDays(launchDate, usageDurationDays)
          : null;

      const whitelistingEndDate =
        deal.scope.whitelistingEnabled && deal.scope.whitelistingExpirationDays > 0
          ? addCalendarDays(launchDate, deal.scope.whitelistingExpirationDays)
          : null;

      const exclusivityDurationDays = resolveExclusivityDays(deal.scope.exclusivityType);
      const exclusivityEndDate =
        exclusivityDurationDays !== null && exclusivityDurationDays > 0
          ? addCalendarDays(launchDate, exclusivityDurationDays)
          : null;

      return {
        deal,
        turnaroundWindow: deal.scope.turnaroundWindow,
        isRush,
        startOffsetDays,
        startDate,
        launchDate,
        totalDurationDays,
        deliverableUnit,
        platformShortLabel,
        milestones,
        usageDurationDays,
        usageEndDate,
        whitelistingEndDate,
        exclusivityDurationDays,
        exclusivityEndDate,
      };
    });
  }, [filteredDeals, globalStartDate, dealStartOffsets]);

  const axisBounds = useMemo(() => {
    if (schedules.length === 0) {
      const minDate = globalStartDate;
      const maxDate = addCalendarDays(globalStartDate, 14);
      return {
        minDate,
        maxDate,
        totalAxisDays: 14,
        ticks: [0, 3, 6, 9, 12, 14].map((d) => ({
          dayOffset: d,
          pct: (d / 14) * 100,
          label: formatShortDate(addCalendarDays(minDate, d)),
          relLabel: `Day ${d}`,
        })),
      };
    }

    let minDate = schedules[0].startDate;
    let maxDate = schedules[0].launchDate;
    for (const sch of schedules) {
      if (sch.startDate.getTime() < minDate.getTime()) minDate = sch.startDate;
      if (sch.launchDate.getTime() > maxDate.getTime()) maxDate = sch.launchDate;
    }

    // Ensure at least a 4-day span if only rush deals exist, or natural span across all deals
    const rawSpan = diffCalendarDays(minDate, maxDate);
    const totalAxisDays = Math.max(rawSpan, schedules.some((s) => !s.isRush) ? 14 : 4);
    const paddedMaxDate = addCalendarDays(minDate, totalAxisDays);

    const tickCount = totalAxisDays <= 6 ? totalAxisDays + 1 : 6;
    const ticks: Array<{ dayOffset: number; pct: number; label: string; relLabel: string }> = [];
    for (let i = 0; i < tickCount; i += 1) {
      const dayOffset =
        tickCount === 1 ? 0 : Math.round((i / (tickCount - 1)) * totalAxisDays);
      if (ticks.some((t) => t.dayOffset === dayOffset)) continue;
      const pct = totalAxisDays === 0 ? 0 : (dayOffset / totalAxisDays) * 100;
      const tickDate = addCalendarDays(minDate, dayOffset);
      ticks.push({
        dayOffset,
        pct,
        label: formatShortDate(tickDate),
        relLabel: dayOffset === 0 ? 'Start' : `+${dayOffset}d`,
      });
    }

    return {
      minDate,
      maxDate: paddedMaxDate,
      totalAxisDays,
      ticks,
    };
  }, [schedules, globalStartDate]);

  const flattenedMilestones = useMemo(() => {
    const items: Array<{
      key: string;
      schedule: DealSchedule;
      milestone: CampaignMilestone;
    }> = [];
    for (const schedule of schedules) {
      for (const milestone of schedule.milestones) {
        items.push({
          key: `${schedule.deal.id}:${milestone.id}`,
          schedule,
          milestone,
        });
      }
    }
    return items;
  }, [schedules]);

  useEffect(() => {
    if (flattenedMilestones.length === 0) {
      if (selectedMilestoneKey !== '') setSelectedMilestoneKey('');
      return;
    }
    const exists = flattenedMilestones.some((item) => item.key === selectedMilestoneKey);
    if (!exists) {
      // Default to the Final Go-Live milestone of the first deal
      const firstSchedule = schedules[0];
      const launchMilestone =
        firstSchedule.milestones[firstSchedule.milestones.length - 1];
      setSelectedMilestoneKey(`${firstSchedule.deal.id}:${launchMilestone.id}`);
    }
  }, [flattenedMilestones, schedules, selectedMilestoneKey]);

  const selectedEntry = useMemo(() => {
    if (flattenedMilestones.length === 0) return null;
    return (
      flattenedMilestones.find((item) => item.key === selectedMilestoneKey) ??
      flattenedMilestones[0]
    );
  }, [flattenedMilestones, selectedMilestoneKey]);

  const selectedIndex = useMemo(() => {
    if (!selectedEntry) return -1;
    return flattenedMilestones.findIndex((item) => item.key === selectedEntry.key);
  }, [flattenedMilestones, selectedEntry]);

  const hasCustomOffsets = useMemo(
    () => deals.some((d) => (dealStartOffsets[d.id] ?? 0) !== 0),
    [deals, dealStartOffsets]
  );

  const adjustDealOffset = (dealId: string, delta: number) => {
    setDealStartOffsets((prev) => {
      const nextVal = Math.max(-30, Math.min(60, (prev[dealId] ?? 0) + delta));
      return { ...prev, [dealId]: nextVal };
    });
  };

  if (deals.length === 0) return null;

  return (
    <section
      aria-label="Campaign deliverable timeline visualizer"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Campaign Deliverable Timeline
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Maps kickoff, script approval, rough cut, revision rounds, and go-live dates from your Project Start Date and each deal&rsquo;s turnaround SLA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
          <span>{deals.length} {deals.length === 1 ? 'campaign' : 'campaigns'}</span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-700 dark:text-amber-400 font-semibold">
            {turnaroundCounts.rush} Rush (&lt;5d)
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-blue-700 dark:text-blue-400 font-semibold">
            {turnaroundCounts.standard} Standard (14d)
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Window: {formatShortDate(axisBounds.minDate)} – {formatShortDate(axisBounds.maxDate)}
          </span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <label
            htmlFor="campaign-project-start-date"
            className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Project Start Date
          </label>
          <input
            id="campaign-project-start-date"
            type="date"
            value={projectStartDate}
            onChange={(e) => {
              if (e.target.value) setProjectStartDate(e.target.value);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 dark:focus:border-blue-400"
          />
          <button
            type="button"
            onClick={() => setProjectStartDate(getLocalTodayString())}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Today
          </button>
          {hasCustomOffsets && (
            <button
              type="button"
              onClick={() => setDealStartOffsets({})}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/60 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-900/60 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Align All to Start
            </button>
          )}
        </div>

        {/* Turnaround Window Filter */}
        <div
          className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-0.5"
          role="group"
          aria-label="Filter timeline by turnaround window"
        >
          {(
            [
              { id: 'all', label: `All (${turnaroundCounts.all})` },
              { id: 'standard_14d', label: `Standard 14d (${turnaroundCounts.standard})` },
              { id: 'rush_under_5d', label: `Rush <5d (${turnaroundCounts.rush})` },
            ] as const
          ).map((tab) => {
            const active = turnaroundFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTurnaroundFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Grid */}
      {schedules.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No deals match this turnaround filter.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Switch back to All to inspect all saved campaign schedules.
          </p>
          <button
            type="button"
            onClick={() => setTurnaroundFilter('all')}
            className="mt-3 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Show All Turnaround Windows
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {/* Calendar Axis Header */}
          <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col md:flex-row md:items-center gap-3">
            <div className="md:w-72 shrink-0 flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              <span>Campaign &amp; Deliverable</span>
              <span>Stagger</span>
            </div>
            <div className="flex-1 relative h-8 select-none">
              <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200 dark:bg-slate-800" />
              {axisBounds.ticks.map((tick) => {
                const translateClass =
                  tick.pct <= 4
                    ? 'translate-x-0 text-left'
                    : tick.pct >= 96
                      ? '-translate-x-full text-right'
                      : '-translate-x-1/2 text-center';
                return (
                  <div
                    key={tick.dayOffset}
                    style={{ left: `${tick.pct}%` }}
                    className={`absolute top-0 bottom-0 flex flex-col justify-between ${translateClass}`}
                  >
                    <span className="text-[11px] font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {tick.label}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {tick.relLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campaign Tracks */}
          {schedules.map((schedule) => {
            const startDaysFromAxis = diffCalendarDays(axisBounds.minDate, schedule.startDate);
            const endDaysFromAxis = diffCalendarDays(axisBounds.minDate, schedule.launchDate);
            const barLeftPct =
              axisBounds.totalAxisDays === 0
                ? 0
                : (startDaysFromAxis / axisBounds.totalAxisDays) * 100;
            const barWidthPct =
              axisBounds.totalAxisDays === 0
                ? 100
                : Math.max(4, ((endDaysFromAxis - startDaysFromAxis) / axisBounds.totalAxisDays) * 100);

            const isSelectedDeal = selectedEntry?.schedule.deal.id === schedule.deal.id;

            return (
              <div
                key={schedule.deal.id}
                className={`px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 transition-colors ${
                  isSelectedDeal
                    ? 'bg-slate-50/70 dark:bg-slate-800/35'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50/40 dark:hover:bg-slate-800/20'
                }`}
              >
                {/* Left Column: Deal Info + Offset Stepper */}
                <div className="md:w-72 shrink-0 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {schedule.isRush ? (
                        <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <Flag className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                      )}
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {schedule.deal.name}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                      {schedule.deliverableUnit}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <span
                        className={
                          schedule.isRush
                            ? 'text-amber-700 dark:text-amber-400 font-semibold'
                            : 'text-blue-700 dark:text-blue-400 font-semibold'
                        }
                      >
                        {schedule.isRush ? 'Rush <5d' : 'Standard 14d'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {formatShortDate(schedule.startDate)} → {formatShortDate(schedule.launchDate)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {formatCurrency(
                          schedule.deal.result.breakdown.totalRecommendedRate,
                          currency
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Stagger Stepper */}
                  <div
                    className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 shrink-0"
                    aria-label={`Stagger start date for ${schedule.deal.name}`}
                  >
                    <button
                      type="button"
                      onClick={() => adjustDealOffset(schedule.deal.id, -1)}
                      title="Move campaign start 1 day earlier"
                      className="px-1.5 py-1 text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-l-md"
                    >
                      -1d
                    </button>
                    <span className="px-1.5 py-1 text-[11px] font-mono tabular-nums text-slate-800 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">
                      {schedule.startOffsetDays >= 0
                        ? `+${schedule.startOffsetDays}d`
                        : `${schedule.startOffsetDays}d`}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustDealOffset(schedule.deal.id, 1)}
                      title="Move campaign start 1 day later"
                      className="px-1.5 py-1 text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-r-md"
                    >
                      +1d
                    </button>
                  </div>
                </div>

                {/* Right Track: Proportional Deliverable Milestones */}
                <div className="flex-1 relative h-20 flex items-center">
                  {/* Vertical Gridlines */}
                  {axisBounds.ticks.map((tick) => (
                    <div
                      key={tick.dayOffset}
                      style={{ left: `${tick.pct}%` }}
                      aria-hidden="true"
                      className="absolute inset-y-0 w-px bg-slate-200/70 dark:bg-slate-800/80 pointer-events-none"
                    />
                  ))}

                  {/* Base Axis Rail */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-200 dark:bg-slate-800"
                  />

                  {/* Turnaround Span Bar */}
                  <div
                    aria-hidden="true"
                    style={{
                      left: `${barLeftPct}%`,
                      width: `${barWidthPct}%`,
                    }}
                    className={`absolute top-1/2 -translate-y-1/2 h-3 rounded-sm border ${
                      schedule.isRush
                        ? 'bg-amber-500/20 dark:bg-amber-500/25 border-amber-500/60 dark:border-amber-400/60'
                        : 'bg-blue-600/15 dark:bg-blue-500/20 border-blue-600/45 dark:border-blue-400/50'
                    }`}
                  />

                  {/* Milestone Markers */}
                  {schedule.milestones.map((milestone, idx) => {
                    const daysFromAxis = diffCalendarDays(axisBounds.minDate, milestone.date);
                    const pct =
                      axisBounds.totalAxisDays === 0
                        ? 0
                        : (daysFromAxis / axisBounds.totalAxisDays) * 100;
                    const key = `${schedule.deal.id}:${milestone.id}`;
                    const isSelected = selectedEntry?.key === key;
                    const phaseStyle = PHASE_MARKER_STYLE[milestone.phase];
                    const placeAbove = idx % 2 === 0;
                    const edgeAlign =
                      pct <= 6
                        ? 'translate-x-0 items-start'
                        : pct >= 94
                          ? '-translate-x-full items-end'
                          : '-translate-x-1/2 items-center';

                    return (
                      <button
                        key={milestone.id}
                        type="button"
                        onClick={() => setSelectedMilestoneKey(key)}
                        style={{ left: `${pct}%` }}
                        aria-label={`${schedule.deal.name}: ${milestone.label} on ${milestone.fullDateLabel}`}
                        title={`${milestone.label} · ${milestone.fullDateLabel} (Day +${milestone.dayOffset})`}
                        className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 p-2 focus:outline-none"
                      >
                        {/* Top or Bottom Alternating Label */}
                        <span
                          className={`pointer-events-none absolute left-1/2 flex flex-col whitespace-nowrap ${edgeAlign} ${
                            placeAbove ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-medium leading-tight ${
                              isSelected
                                ? 'text-slate-900 dark:text-white font-semibold underline decoration-2 underline-offset-2'
                                : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                            }`}
                          >
                            {milestone.shortTag}
                          </span>
                          {(idx === 0 || idx === schedule.milestones.length - 1 || isSelected) && (
                            <span className="text-[9px] font-mono tabular-nums text-slate-400 dark:text-slate-500 leading-tight">
                              {milestone.dateLabel}
                            </span>
                          )}
                        </span>

                        {/* Geometric Marker */}
                        <span
                          className={`block w-3.5 h-3.5 rounded-xs border-2 transition-transform ${
                            phaseStyle.node
                          } ${
                            isSelected
                              ? `scale-125 ${phaseStyle.activeRing}`
                              : 'group-hover:scale-110'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Milestone Inspector Strip */}
      {selectedEntry && (
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/75">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  Selected Milestone
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {selectedEntry.schedule.deal.name}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span
                  className={`text-xs font-semibold ${
                    PHASE_MARKER_STYLE[selectedEntry.milestone.phase].text
                  }`}
                >
                  {selectedEntry.milestone.label}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                  {selectedEntry.milestone.fullDateLabel} (Day +{selectedEntry.milestone.dayOffset})
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                {selectedEntry.milestone.description}
              </p>

              {/* Deliverable & Rights Context */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums pt-0.5">
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Deliverable: {selectedEntry.schedule.deliverableUnit}
                </span>
                <span>
                  SLA: {selectedEntry.schedule.isRush ? 'Rush (<5 Business Days)' : 'Standard (14 Days)'}
                  {selectedEntry.schedule.deal.result.breakdown.rushFee > 0
                    ? ` · +${formatCurrency(selectedEntry.schedule.deal.result.breakdown.rushFee, currency)} Rush Fee`
                    : ''}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Paid Usage:{' '}
                  {selectedEntry.schedule.usageDurationDays === null
                    ? 'Perpetual Buyout (No Expiry)'
                    : selectedEntry.schedule.usageDurationDays === 0
                      ? USAGE_RIGHTS_SPECS.organic_only.label
                      : `Ends ${formatShortDate(selectedEntry.schedule.usageEndDate!)} (${selectedEntry.schedule.usageDurationDays}d)`}
                </span>
                {selectedEntry.schedule.whitelistingEndDate && (
                  <span>
                    Whitelisting Ends: {formatShortDate(selectedEntry.schedule.whitelistingEndDate)} (
                    {selectedEntry.schedule.deal.scope.whitelistingExpirationDays}d)
                  </span>
                )}
                {selectedEntry.schedule.deal.scope.exclusivityType !== 'none' && (
                  <span>
                    Exclusivity:{' '}
                    {selectedEntry.schedule.exclusivityEndDate
                      ? `Ends ${formatShortDate(selectedEntry.schedule.exclusivityEndDate)}`
                      : EXCLUSIVITY_SPECS[selectedEntry.schedule.deal.scope.exclusivityType].label}
                  </span>
                )}
              </div>
            </div>

            {/* Inspector Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  disabled={selectedIndex <= 0}
                  onClick={() => {
                    if (selectedIndex > 0) {
                      setSelectedMilestoneKey(flattenedMilestones[selectedIndex - 1].key);
                    }
                  }}
                  aria-label="Previous milestone"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded-l-lg border-r border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={
                    selectedIndex < 0 || selectedIndex >= flattenedMilestones.length - 1
                  }
                  onClick={() => {
                    if (selectedIndex < flattenedMilestones.length - 1) {
                      setSelectedMilestoneKey(flattenedMilestones[selectedIndex + 1].key);
                    }
                  }}
                  aria-label="Next milestone"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded-r-lg whitespace-nowrap shrink-0"
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onLoadDealIntoCalculator(selectedEntry.schedule.deal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                Load into Calculator
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
