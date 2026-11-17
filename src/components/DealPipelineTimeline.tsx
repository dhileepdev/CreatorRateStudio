import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import {
  EXCLUSIVITY_SPECS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import { useCurrency } from '../context/CurrencyContext';
import { SavedDealSnapshot } from '../types/calculator';
import { formatCurrency, formatCurrencyExact } from '../utils/pricingEngine';

type PipelineStageId = 'closed' | 'pending' | 'priority' | 'draft';

interface PipelineStageSpec {
  id: PipelineStageId;
  label: string;
  markerClass: string;
  nodeBorderClass: string;
  nodeActiveClass: string;
  labelTextClass: string;
}

const STAGE_SPECS: Record<PipelineStageId, PipelineStageSpec> = {
  closed: {
    id: 'closed',
    label: 'Closed',
    markerClass: 'bg-emerald-700 border-emerald-800',
    nodeBorderClass: 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50',
    nodeActiveClass: 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700/15',
    labelTextClass: 'text-emerald-800',
  },
  pending: {
    id: 'pending',
    label: 'In Negotiation',
    markerClass: 'bg-amber-600 border-amber-700',
    nodeBorderClass: 'border-amber-300 bg-amber-50/40 hover:bg-amber-50',
    nodeActiveClass: 'border-amber-700 bg-amber-50 ring-2 ring-amber-700/15',
    labelTextClass: 'text-amber-800',
  },
  priority: {
    id: 'priority',
    label: 'High Priority',
    markerClass: 'bg-blue-700 border-blue-800',
    nodeBorderClass: 'border-blue-300 bg-blue-50/40 hover:bg-blue-50',
    nodeActiveClass: 'border-blue-700 bg-blue-50 ring-2 ring-blue-700/15',
    labelTextClass: 'text-blue-800',
  },
  draft: {
    id: 'draft',
    label: 'Draft / Initial',
    markerClass: 'bg-slate-500 border-slate-600',
    nodeBorderClass: 'border-slate-300 bg-white hover:bg-slate-50',
    nodeActiveClass: 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10',
    labelTextClass: 'text-slate-700',
  },
};

function resolvePipelineStage(deal: SavedDealSnapshot): PipelineStageId {
  const tags = (deal.tags ?? []).map((t) => t.toLowerCase());
  if (tags.includes('closed')) return 'closed';
  if (tags.includes('negotiation pending') || tags.includes('follow-up needed')) {
    return 'pending';
  }
  if (tags.includes('high priority')) return 'priority';
  return 'draft';
}

function formatAxisTick(ms: number, spanMs: number): string {
  const d = new Date(ms);
  const dayMs = 24 * 60 * 60 * 1000;
  if (spanMs <= dayMs) {
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (spanMs <= 14 * dayMs) {
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    });
  }
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: spanMs > 180 * dayMs ? '2-digit' : undefined,
  });
}

function formatSpanDuration(spanMs: number): string {
  if (spanMs <= 0) return 'Single point';
  const totalHours = Math.round(spanMs / (1000 * 60 * 60));
  if (totalHours < 1) {
    const mins = Math.max(1, Math.round(spanMs / (1000 * 60)));
    return `${mins}m span`;
  }
  if (totalHours < 48) {
    return `${totalHours}h span`;
  }
  const days = Math.round(totalHours / 24);
  return `${days}d span`;
}

interface TimelineNode {
  deal: SavedDealSnapshot;
  timestampMs: number;
  xPct: number;
  laneIndex: number;
  stage: PipelineStageId;
  deltaFromPrev: number | null;
  deltaPctFromPrev: number | null;
  shortTimestamp: string;
  fullTimestamp: string;
}

interface DealPipelineTimelineProps {
  deals: SavedDealSnapshot[];
  onLoadDealIntoCalculator: (deal: SavedDealSnapshot) => void;
}

export const DealPipelineTimeline: React.FC<DealPipelineTimelineProps> = ({
  deals,
  onLoadDealIntoCalculator,
}) => {
  const { currency } = useCurrency();
  const [viewMode, setViewMode] = useState<'track' | 'swimlanes'>('track');
  const [stageFilter, setStageFilter] = useState<'all' | PipelineStageId>('all');
  const [selectedDealId, setSelectedDealId] = useState<string>('');

  const chronologicalDeals = useMemo(() => {
    return [...deals].sort(
      (a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
    );
  }, [deals]);

  const stageCounts = useMemo(() => {
    const counts: Record<PipelineStageId, number> = {
      closed: 0,
      pending: 0,
      priority: 0,
      draft: 0,
    };
    for (const deal of chronologicalDeals) {
      counts[resolvePipelineStage(deal)] += 1;
    }
    return counts;
  }, [chronologicalDeals]);

  const filteredChronological = useMemo(() => {
    if (stageFilter === 'all') return chronologicalDeals;
    return chronologicalDeals.filter((d) => resolvePipelineStage(d) === stageFilter);
  }, [chronologicalDeals, stageFilter]);

  const timelineLayout = useMemo(() => {
    if (filteredChronological.length === 0) {
      return {
        nodes: [] as TimelineNode[],
        laneCount: 1,
        ticks: [] as Array<{ pct: number; label: string }>,
        minMs: 0,
        maxMs: 0,
        spanMs: 0,
      };
    }

    const timestamps = filteredChronological.map((d) => new Date(d.savedAt).getTime());
    const minMs = Math.min(...timestamps);
    const maxMs = Math.max(...timestamps);
    const spanMs = Math.max(0, maxMs - minMs);

    const rawPositions = filteredChronological.map((deal, idx) => {
      const ts = new Date(deal.savedAt).getTime();
      let xPct = 50;
      if (filteredChronological.length > 1) {
        if (spanMs === 0) {
          xPct = 10 + (idx / (filteredChronological.length - 1)) * 80;
        } else {
          xPct = 8 + ((ts - minMs) / spanMs) * 84;
        }
      }
      return { deal, ts, xPct };
    });

    // Greedy interval packing so horizontal cards never collide
    const laneLastX: number[] = [];
    const minCardGapPct = 19;

    const nodes: TimelineNode[] = rawPositions.map((item, idx) => {
      let assignedLane = laneLastX.findIndex(
        (lastX) => item.xPct - lastX >= minCardGapPct
      );
      if (assignedLane === -1) {
        assignedLane = laneLastX.length;
        laneLastX.push(item.xPct);
      } else {
        laneLastX[assignedLane] = item.xPct;
      }

      const prevDeal = idx > 0 ? rawPositions[idx - 1].deal : null;
      const currRate = item.deal.result.breakdown.totalRecommendedRate;
      const prevRate = prevDeal ? prevDeal.result.breakdown.totalRecommendedRate : null;
      const deltaFromPrev = prevRate !== null ? currRate - prevRate : null;
      const deltaPctFromPrev =
        deltaFromPrev !== null && prevRate && prevRate > 0
          ? (deltaFromPrev / prevRate) * 100
          : null;

      const dateObj = new Date(item.ts);
      const shortTimestamp = dateObj.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const fullTimestamp = dateObj.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        deal: item.deal,
        timestampMs: item.ts,
        xPct: item.xPct,
        laneIndex: assignedLane,
        stage: resolvePipelineStage(item.deal),
        deltaFromPrev,
        deltaPctFromPrev,
        shortTimestamp,
        fullTimestamp,
      };
    });

    const ticks: Array<{ pct: number; label: string }> = [];
    if (spanMs === 0) {
      ticks.push({
        pct: 50,
        label: formatAxisTick(minMs, 0),
      });
    } else {
      const tickCount = 5;
      for (let i = 0; i < tickCount; i += 1) {
        const ratio = i / (tickCount - 1);
        const tickMs = minMs + spanMs * ratio;
        ticks.push({
          pct: 8 + ratio * 84,
          label: formatAxisTick(tickMs, spanMs),
        });
      }
    }

    return {
      nodes,
      laneCount: Math.max(1, laneLastX.length),
      ticks,
      minMs,
      maxMs,
      spanMs,
    };
  }, [filteredChronological]);

  // Keep selectedDealId valid and default to latest milestone
  useEffect(() => {
    if (timelineLayout.nodes.length === 0) {
      setSelectedDealId('');
      return;
    }
    const exists = timelineLayout.nodes.some((n) => n.deal.id === selectedDealId);
    if (!exists) {
      setSelectedDealId(timelineLayout.nodes[timelineLayout.nodes.length - 1].deal.id);
    }
  }, [timelineLayout.nodes, selectedDealId]);

  const selectedNodeIndex = useMemo(
    () => timelineLayout.nodes.findIndex((n) => n.deal.id === selectedDealId),
    [timelineLayout.nodes, selectedDealId]
  );

  const selectedNode =
    selectedNodeIndex >= 0
      ? timelineLayout.nodes[selectedNodeIndex]
      : timelineLayout.nodes[timelineLayout.nodes.length - 1] ?? null;

  const pipelineTotals = useMemo(() => {
    let closedValue = 0;
    let activePipelineValue = 0;
    for (const deal of chronologicalDeals) {
      const stage = resolvePipelineStage(deal);
      const rate = deal.result.breakdown.totalRecommendedRate;
      if (stage === 'closed') {
        closedValue += rate;
      } else {
        activePipelineValue += rate;
      }
    }
    return { closedValue, activePipelineValue };
  }, [chronologicalDeals]);

  const swimlaneRows = useMemo(() => {
    const order: PipelineStageId[] = ['closed', 'pending', 'priority', 'draft'];
    return order
      .map((stageId) => {
        const stageNodes = timelineLayout.nodes.filter((n) => n.stage === stageId);
        // Pack within each swimlane independently
        const laneX: number[] = [];
        const packed = stageNodes.map((n) => {
          let row = laneX.findIndex((lx) => n.xPct - lx >= 19);
          if (row === -1) {
            row = laneX.length;
            laneX.push(n.xPct);
          } else {
            laneX[row] = n.xPct;
          }
          return { ...n, subRow: row };
        });
        return {
          spec: STAGE_SPECS[stageId],
          nodes: packed,
          rowCount: Math.max(1, laneX.length),
        };
      })
      .filter((row) => row.nodes.length > 0);
  }, [timelineLayout.nodes]);

  if (deals.length === 0) return null;

  const cardHeightPx = 76;
  const laneStepPx = 88;
  const trackTopPadPx = 16;
  const axisZonePx = 44;
  const trackAreaHeightPx =
    trackTopPadPx + timelineLayout.laneCount * laneStepPx + axisZonePx;

  return (
    <section
      aria-label="Deal Pipeline Timeline visualizer"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Deal Pipeline Timeline
            </h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              · {timelineLayout.nodes.length}{' '}
              {timelineLayout.nodes.length === 1 ? 'milestone' : 'milestones'} ·{' '}
              {formatSpanDuration(timelineLayout.spanMs)}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Plots saved deals proportionally along a horizontal <code className="font-mono text-[11px] text-slate-700">savedAt</code> date axis to track negotiation stage and rate progression over time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Closed vs Active Pipeline Summary */}
          <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
            <span className="text-slate-600">
              Closed:{' '}
              <strong className="font-mono text-emerald-800">
                {formatCurrencyExact(pipelineTotals.closedValue, currency)}
              </strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">
              |
            </span>
            <span className="text-slate-600">
              Active Pipeline:{' '}
              <strong className="font-mono text-slate-900">
                {formatCurrencyExact(pipelineTotals.activePipelineValue, currency)}
              </strong>
            </span>
          </div>

          {/* View Mode Toggle */}
          <div
            role="group"
            aria-label="Timeline layout mode"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            <button
              type="button"
              aria-pressed={viewMode === 'track'}
              onClick={() => setViewMode('track')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'track'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Timeline Track
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'swimlanes'}
              onClick={() => setViewMode('swimlanes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'swimlanes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              Stage Swimlanes
            </button>
          </div>
        </div>
      </div>

      {/* Stage Filter & Legend Bar */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter timeline by negotiation stage"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            aria-pressed={stageFilter === 'all'}
            onClick={() => setStageFilter('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              stageFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            All Stages ({chronologicalDeals.length})
          </button>
          {(['closed', 'pending', 'priority', 'draft'] as PipelineStageId[]).map((id) => {
            const spec = STAGE_SPECS[id];
            const count = stageCounts[id];
            const active = stageFilter === id;
            return (
              <button
                key={`stage-filter-${id}`}
                type="button"
                aria-pressed={active}
                disabled={count === 0 && !active}
                onClick={() => setStageFilter(id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  count === 0 && !active
                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                    : active
                    ? 'bg-slate-900 text-white border-slate-900 cursor-pointer'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-xs border shrink-0 ${spec.markerClass}`}
                  aria-hidden="true"
                />
                <span>
                  {spec.label} ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <span>Click any deal milestone to inspect notes &amp; progression</span>
        </div>
      </div>

      {/* Horizontal Timeline Canvas */}
      {timelineLayout.nodes.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          No deals match the selected pipeline stage filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px] px-5 pt-4 pb-2">
            {viewMode === 'track' ? (
              <div
                className="relative w-full"
                style={{ height: `${trackAreaHeightPx}px` }}
              >
                {/* Vertical Grid Lines for Ticks */}
                {timelineLayout.ticks.map((tick, idx) => (
                  <div
                    key={`grid-tick-${idx}`}
                    style={{ left: `${tick.pct}%` }}
                    className="absolute top-0 bottom-[44px] w-px bg-slate-100 pointer-events-none"
                    aria-hidden="true"
                  />
                ))}

                {/* Horizontal Axis Line */}
                <div
                  className="absolute left-0 right-0 bottom-[44px] h-0.5 bg-slate-200"
                  aria-hidden="true"
                />

                {/* Plotted Deal Milestone Cards & Stems */}
                {timelineLayout.nodes.map((node) => {
                  const spec = STAGE_SPECS[node.stage];
                  const isSelected = selectedNode?.deal.id === node.deal.id;
                  const topPx =
                    trackTopPadPx +
                    (timelineLayout.laneCount - 1 - node.laneIndex) * laneStepPx;
                  const stemHeightPx =
                    trackAreaHeightPx - axisZonePx - (topPx + cardHeightPx);

                  return (
                    <React.Fragment key={`timeline-node-${node.deal.id}`}>
                      {/* Connector Stem */}
                      <div
                        style={{
                          left: `${node.xPct}%`,
                          top: `${topPx + cardHeightPx}px`,
                          height: `${Math.max(4, stemHeightPx)}px`,
                        }}
                        className={`absolute w-px -translate-x-1/2 pointer-events-none transition-colors ${
                          isSelected ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                        aria-hidden="true"
                      />

                      {/* Milestone Card Positioned Proportionally by savedAt */}
                      <button
                        type="button"
                        onClick={() => setSelectedDealId(node.deal.id)}
                        style={{
                          left: `${node.xPct}%`,
                          top: `${topPx}px`,
                          height: `${cardHeightPx}px`,
                        }}
                        aria-pressed={isSelected}
                        className={`absolute -translate-x-1/2 w-[164px] px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between z-10 ${
                          isSelected
                            ? spec.nodeActiveClass
                            : spec.nodeBorderClass
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-xs border shrink-0 ${spec.markerClass}`}
                              aria-hidden="true"
                            />
                            <span
                              className={`text-[10px] font-semibold truncate ${spec.labelTextClass}`}
                            >
                              {spec.label}
                            </span>
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-900 shrink-0 tabular-nums">
                            {formatCurrency(
                              node.deal.result.breakdown.totalRecommendedRate,
                              currency
                            )}
                          </span>
                        </div>

                        <div className="text-[11px] font-semibold text-slate-900 truncate leading-tight">
                          {node.deal.name}
                        </div>

                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 font-mono tabular-nums">
                          <span className="truncate">{node.shortTimestamp}</span>
                          {node.deltaFromPrev !== null && (
                            <span
                              className={`shrink-0 font-semibold ${
                                node.deltaFromPrev > 0
                                  ? 'text-emerald-700'
                                  : node.deltaFromPrev < 0
                                  ? 'text-red-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {node.deltaFromPrev > 0 ? '+' : ''}
                              {formatCurrency(node.deltaFromPrev, currency)}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Axis Marker Dot */}
                      <button
                        type="button"
                        onClick={() => setSelectedDealId(node.deal.id)}
                        aria-label={`Select ${node.deal.name} saved ${node.fullTimestamp}`}
                        style={{ left: `${node.xPct}%` }}
                        className={`absolute bottom-[38px] -translate-x-1/2 w-3.5 h-3.5 rounded-xs border-2 cursor-pointer transition-transform z-20 ${
                          isSelected
                            ? `${spec.markerClass} scale-125 ring-2 ring-blue-600/30`
                            : `${spec.markerClass} hover:scale-110`
                        }`}
                      />
                    </React.Fragment>
                  );
                })}

                {/* Horizontal Date Axis Ticks */}
                {timelineLayout.ticks.map((tick, idx) => (
                  <div
                    key={`axis-tick-${idx}`}
                    style={{ left: `${tick.pct}%` }}
                    className="absolute bottom-2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                  >
                    <div className="w-px h-2 bg-slate-300 mb-1" aria-hidden="true" />
                    <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {tick.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Stage Swimlanes Mode on Same Proportional Horizontal Date Axis */
              <div className="space-y-3 pb-2">
                {swimlaneRows.map((row) => {
                  const rowHeight = 16 + row.rowCount * 68;
                  return (
                    <div
                      key={`swimlane-${row.spec.id}`}
                      className="grid grid-cols-12 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/40"
                    >
                      <div className="col-span-2 px-3 py-3 bg-white border-r border-slate-200 flex flex-col justify-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-xs border shrink-0 ${row.spec.markerClass}`}
                            aria-hidden="true"
                          />
                          <span className="text-xs font-semibold text-slate-900">
                            {row.spec.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                          {row.nodes.length}{' '}
                          {row.nodes.length === 1 ? 'deal' : 'deals'}
                        </span>
                      </div>

                      <div
                        className="col-span-10 relative"
                        style={{ height: `${rowHeight}px` }}
                      >
                        {timelineLayout.ticks.map((tick, idx) => (
                          <div
                            key={`lane-tick-${row.spec.id}-${idx}`}
                            style={{ left: `${tick.pct}%` }}
                            className="absolute top-0 bottom-0 w-px bg-slate-200/70 pointer-events-none"
                            aria-hidden="true"
                          />
                        ))}
                        <div
                          className="absolute left-0 right-0 top-1/2 h-px bg-slate-200 pointer-events-none"
                          aria-hidden="true"
                        />

                        {row.nodes.map((node) => {
                          const isSelected = selectedNode?.deal.id === node.deal.id;
                          const topPx = 10 + node.subRow * 64;
                          return (
                            <button
                              key={`swim-node-${node.deal.id}`}
                              type="button"
                              onClick={() => setSelectedDealId(node.deal.id)}
                              aria-pressed={isSelected}
                              style={{ left: `${node.xPct}%`, top: `${topPx}px` }}
                              className={`absolute -translate-x-1/2 w-[160px] h-[54px] px-2.5 py-1.5 rounded-md border text-left transition-colors cursor-pointer flex flex-col justify-between z-10 ${
                                isSelected
                                  ? row.spec.nodeActiveClass
                                  : row.spec.nodeBorderClass
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-900 truncate">
                                  {node.deal.name}
                                </span>
                                <span className="font-mono text-[11px] font-bold text-slate-900 shrink-0 tabular-nums">
                                  {formatCurrency(
                                    node.deal.result.breakdown.totalRecommendedRate,
                                    currency
                                  )}
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 truncate tabular-nums">
                                {node.shortTimestamp}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Shared Bottom Date Axis for Swimlanes */}
                <div className="grid grid-cols-12">
                  <div className="col-span-2" />
                  <div className="col-span-10 relative h-7">
                    {timelineLayout.ticks.map((tick, idx) => (
                      <div
                        key={`swim-axis-${idx}`}
                        style={{ left: `${tick.pct}%` }}
                        className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                      >
                        <div className="w-px h-1.5 bg-slate-300 mb-0.5" aria-hidden="true" />
                        <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap tabular-nums">
                          {tick.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Milestone Inspector Strip */}
      {selectedNode && (
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-xs border shrink-0 ${
                  STAGE_SPECS[selectedNode.stage].markerClass
                }`}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-slate-500 font-mono tabular-nums">
                Milestone {selectedNodeIndex + 1} of {timelineLayout.nodes.length}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-display text-sm font-bold text-slate-900 truncate">
                {selectedNode.deal.name}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span
                className={`text-xs font-semibold ${
                  STAGE_SPECS[selectedNode.stage].labelTextClass
                }`}
              >
                {STAGE_SPECS[selectedNode.stage].label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={selectedNodeIndex <= 0}
                  onClick={() => {
                    if (selectedNodeIndex > 0) {
                      setSelectedDealId(
                        timelineLayout.nodes[selectedNodeIndex - 1].deal.id
                      );
                    }
                  }}
                  aria-label="Previous chronological deal"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={selectedNodeIndex >= timelineLayout.nodes.length - 1}
                  onClick={() => {
                    if (selectedNodeIndex < timelineLayout.nodes.length - 1) {
                      setSelectedDealId(
                        timelineLayout.nodes[selectedNodeIndex + 1].deal.id
                      );
                    }
                  }}
                  aria-label="Next chronological deal"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onLoadDealIntoCalculator(selectedNode.deal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                Load into Calculator
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs items-start">
            <div className="md:col-span-5 space-y-1.5 tabular-nums">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-base font-bold text-slate-900">
                  {formatCurrencyExact(
                    selectedNode.deal.result.breakdown.totalRecommendedRate,
                    currency
                  )}
                </span>
                {selectedNode.deltaFromPrev !== null && (
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${
                      selectedNode.deltaFromPrev > 0
                        ? 'text-emerald-700'
                        : selectedNode.deltaFromPrev < 0
                        ? 'text-red-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {selectedNode.deltaFromPrev > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : selectedNode.deltaFromPrev < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : null}
                    {selectedNode.deltaFromPrev > 0 ? '+' : ''}
                    {formatCurrencyExact(selectedNode.deltaFromPrev, currency)}
                    {selectedNode.deltaPctFromPrev !== null
                      ? ` (${selectedNode.deltaPctFromPrev > 0 ? '+' : ''}${selectedNode.deltaPctFromPrev.toFixed(1)}%)`
                      : ''}{' '}
                    vs. prior
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-600">
                Saved <span className="font-mono text-slate-800">{selectedNode.fullTimestamp}</span> ·{' '}
                {PLATFORM_SPECS[selectedNode.deal.profile.platform].shortLabel} ·{' '}
                {NICHE_BENCHMARKS[selectedNode.deal.profile.niche].label}
              </div>

              <div className="text-[11px] text-slate-600 font-mono">
                Base {formatCurrencyExact(selectedNode.deal.result.breakdown.baseCreationFee, currency)} ·{' '}
                Riders {formatCurrencyExact(selectedNode.deal.result.breakdown.totalCommercialRiders, currency)} ·{' '}
                <span className="font-sans">
                  {USAGE_RIGHTS_SPECS[selectedNode.deal.scope.usageRightsTerm].label} ·{' '}
                  {EXCLUSIVITY_SPECS[selectedNode.deal.scope.exclusivityType].label}
                </span>
              </div>
            </div>

            <div className="md:col-span-7 bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  Negotiation Notes &amp; Tags
                </span>
                <span className="text-slate-500">
                  {selectedNode.deal.tags && selectedNode.deal.tags.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      {selectedNode.stage === 'closed' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      )}
                      <span className="font-medium text-slate-700">
                        {selectedNode.deal.tags.join(' · ')}
                      </span>
                    </span>
                  ) : (
                    'No tags assigned'
                  )}
                </span>
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  selectedNode.deal.notes?.trim()
                    ? 'text-slate-700'
                    : 'text-slate-400 italic'
                }`}
              >
                {selectedNode.deal.notes?.trim()
                  ? selectedNode.deal.notes.trim()
                  : 'No negotiation notes recorded on this proposal yet.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
