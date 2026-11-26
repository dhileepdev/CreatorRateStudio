import React from 'react';
import {
  AlertTriangle,
  Gauge,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  ClauseRiskWeight,
  ContractRiskAssessment,
  ContractRiskLevel,
} from '../types/calculator';
import { RISK_WEIGHT_POINTS } from '../utils/pricingEngine';

interface ContractRiskScoreMeterProps {
  riskAssessment: ContractRiskAssessment;
  totalClauses: number;
  cumulativeRiskWeightScore: number;
  onSelectClause: (clauseId: number) => void;
  onFilterByWeight?: (weight: ClauseRiskWeight) => void;
}

const RISK_LEVEL_STYLES: Record<
  ContractRiskLevel,
  {
    textClass: string;
    surfaceClass: string;
    barClass: string;
    markerClass: string;
    verdict: string;
  }
> = {
  low: {
    textClass: 'text-emerald-800 dark:text-emerald-400',
    surfaceClass:
      'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70',
    barClass: 'bg-emerald-700 dark:bg-emerald-500',
    markerClass: 'bg-emerald-700 dark:bg-emerald-400 border-white dark:border-slate-900',
    verdict: 'Standard Review · Low Exposure',
  },
  moderate: {
    textClass: 'text-amber-800 dark:text-amber-400',
    surfaceClass:
      'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70',
    barClass: 'bg-amber-600 dark:bg-amber-500',
    markerClass: 'bg-amber-600 dark:bg-amber-400 border-white dark:border-slate-900',
    verdict: 'Targeted Redlines Advised',
  },
  high: {
    textClass: 'text-orange-800 dark:text-orange-400',
    surfaceClass:
      'bg-orange-50/60 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/70',
    barClass: 'bg-orange-600 dark:bg-orange-500',
    markerClass: 'bg-orange-600 dark:bg-orange-400 border-white dark:border-slate-900',
    verdict: 'Redlines Required Before Signing',
  },
  critical: {
    textClass: 'text-red-800 dark:text-red-400',
    surfaceClass:
      'bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-800/70',
    barClass: 'bg-red-600 dark:bg-red-500',
    markerClass: 'bg-red-600 dark:bg-red-400 border-white dark:border-slate-900',
    verdict: 'Do Not Sign Without Major Revision',
  },
};

const RISK_ZONES: Array<{
  id: ContractRiskLevel;
  label: string;
  range: string;
  barClass: string;
  activeTextClass: string;
}> = [
  {
    id: 'low',
    label: 'Low',
    range: '0–24',
    barClass: 'bg-emerald-600/80 dark:bg-emerald-500/80',
    activeTextClass: 'text-emerald-800 dark:text-emerald-300 font-semibold',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    range: '25–49',
    barClass: 'bg-amber-500/85 dark:bg-amber-400/85',
    activeTextClass: 'text-amber-800 dark:text-amber-300 font-semibold',
  },
  {
    id: 'high',
    label: 'High',
    range: '50–74',
    barClass: 'bg-orange-500/90 dark:bg-orange-400/90',
    activeTextClass: 'text-orange-800 dark:text-orange-300 font-semibold',
  },
  {
    id: 'critical',
    label: 'Critical',
    range: '75–100',
    barClass: 'bg-red-600/90 dark:bg-red-500/90',
    activeTextClass: 'text-red-800 dark:text-red-300 font-semibold',
  },
];

export const ContractRiskScoreMeter: React.FC<ContractRiskScoreMeterProps> = ({
  riskAssessment,
  totalClauses,
  cumulativeRiskWeightScore,
  onSelectClause,
  onFilterByWeight,
}) => {
  const style = RISK_LEVEL_STYLES[riskAssessment.level];
  const clampedScore = Math.min(100, Math.max(0, riskAssessment.score));

  const severityRows: Array<{
    id: ClauseRiskWeight;
    label: string;
    count: number;
    pointsPerClause: number;
    accentClass: string;
  }> = [
    {
      id: 'critical',
      label: 'Critical',
      count: riskAssessment.weightCounts.critical,
      pointsPerClause: RISK_WEIGHT_POINTS.critical,
      accentClass: 'text-red-700 dark:text-red-400',
    },
    {
      id: 'moderate',
      label: 'Moderate',
      count: riskAssessment.weightCounts.moderate,
      pointsPerClause: RISK_WEIGHT_POINTS.moderate,
      accentClass: 'text-amber-700 dark:text-amber-400',
    },
    {
      id: 'low',
      label: 'Low',
      count: riskAssessment.weightCounts.low,
      pointsPerClause: RISK_WEIGHT_POINTS.low,
      accentClass: 'text-slate-700 dark:text-slate-300',
    },
  ];

  return (
    <div
      id="contract-risk-score-meter"
      aria-label="Contract risk score meter"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 scroll-mt-24"
    >
      {/* Top Row: Score Readout + High-Level Verdict + 0–100 Meter Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 cols: Score Headline + Segmented 0–100 Risk Meter */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Gauge
                  className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
                  aria-hidden="true"
                />
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Contract Risk Score Meter
                </h3>
                <span
                  className="text-slate-300 dark:text-slate-600"
                  aria-hidden="true"
                >
                  ·
                </span>
                <span className={`font-semibold inline-flex items-center gap-1 ${style.textClass}`}>
                  {riskAssessment.level === 'low' ? (
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : riskAssessment.level === 'moderate' ? (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  {riskAssessment.levelLabel}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {riskAssessment.summary}
              </p>
            </div>

            {/* Primary 0–100 Numeric Readout */}
            <div className="text-right shrink-0 tabular-nums">
              <div className="flex items-baseline justify-end gap-1">
                <span
                  className={`font-mono text-3xl sm:text-4xl font-bold leading-none ${
                    clampedScore === 0
                      ? 'text-slate-900 dark:text-slate-100'
                      : style.textClass
                  }`}
                >
                  {clampedScore}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  / 100
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1 whitespace-nowrap">
                {style.verdict}
              </div>
            </div>
          </div>

          {/* Segmented 0–100 Horizontal Risk Meter */}
          <div className="space-y-2">
            <div
              role="meter"
              aria-label="Contract Risk Score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={clampedScore}
              aria-valuetext={`${clampedScore} out of 100, ${riskAssessment.levelLabel}`}
              className="relative pt-1.5 pb-1"
            >
              {/* 4-Band Threshold Track */}
              <div className="h-3 w-full rounded-md overflow-hidden grid grid-cols-4 gap-0.5 bg-slate-100 dark:bg-slate-800">
                {RISK_ZONES.map((zone, idx) => {
                  const zoneMin = idx * 25;
                  const zoneMax = (idx + 1) * 25;
                  const fillInZone = Math.min(
                    100,
                    Math.max(0, ((clampedScore - zoneMin) / (zoneMax - zoneMin)) * 100)
                  );
                  return (
                    <div
                      key={zone.id}
                      className="relative h-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden"
                    >
                      <div
                        className={`h-full transition-all duration-300 ease-out ${zone.barClass}`}
                        style={{ width: `${fillInZone}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Live Score Marker Indicator */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0.5 -translate-x-1/2 transition-all duration-300 ease-out"
                style={{ left: `${clampedScore}%` }}
              >
                <div
                  className={`w-3.5 h-5 rounded-sm border-2 shadow-sm ${style.markerClass}`}
                />
              </div>
            </div>

            {/* Numeric Scale & Zone Threshold Labels */}
            <div className="grid grid-cols-4 gap-1 text-[11px] tabular-nums">
              {RISK_ZONES.map((zone) => {
                const isCurrentZone = riskAssessment.level === zone.id;
                return (
                  <div
                    key={`zone-label-${zone.id}`}
                    className={`flex flex-col ${
                      zone.id === 'critical'
                        ? 'items-end text-right'
                        : zone.id === 'low'
                          ? 'items-start text-left'
                          : 'items-center text-center'
                    }`}
                  >
                    <span
                      className={
                        isCurrentZone
                          ? zone.activeTextClass
                          : 'text-slate-500 dark:text-slate-400'
                      }
                    >
                      {zone.label}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {zone.range}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Severity Weight Contribution Strip */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              {severityRows.map((row) => {
                const pts = row.count * row.pointsPerClause;
                const clickable = Boolean(onFilterByWeight && row.count > 0);
                return clickable ? (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onFilterByWeight?.(row.id)}
                    title={`Filter scanner to ${row.count} flagged ${row.label} clause(s)`}
                    className="inline-flex items-baseline gap-1 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span className={`font-semibold ${row.accentClass}`}>
                      {row.label}:
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {row.count}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      (+{pts} pts)
                    </span>
                  </button>
                ) : (
                  <span
                    key={row.id}
                    className="inline-flex items-baseline gap-1 whitespace-nowrap shrink-0"
                  >
                    <span className={`font-semibold ${row.accentClass}`}>
                      {row.label}:
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {row.count}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      (+{pts} pts)
                    </span>
                  </span>
                );
              })}
            </div>

            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
              {riskAssessment.flaggedCount}/{totalClauses} flagged · {cumulativeRiskWeightScore} pts weight
            </span>
          </div>
        </div>

        {/* Right 6 cols: Category Exposure Breakdown + Top Risk Drivers */}
        <div className="lg:col-span-6 space-y-3.5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Exposure by Legal Category
            </span>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Critical {RISK_WEIGHT_POINTS.critical}p · Moderate {RISK_WEIGHT_POINTS.moderate}p · Low {RISK_WEIGHT_POINTS.low}p
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
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
                        cat.flaggedCount > 0
                          ? style.barClass
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-0.5">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mr-1">
              Top Risk Drivers:
            </span>
            {riskAssessment.topDrivers.length === 0 ? (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Score is 0/100. Flag red-flag clauses in the 15-clause scanner below to measure live exposure.
              </span>
            ) : (
              riskAssessment.topDrivers.map((driver) => (
                <button
                  key={`driver-${driver.clauseId}`}
                  type="button"
                  onClick={() => onSelectClause(driver.clauseId)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span
                    className={`font-mono font-semibold ${
                      driver.riskWeight === 'critical'
                        ? 'text-red-700 dark:text-red-400'
                        : driver.riskWeight === 'moderate'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-400'
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
    </div>
  );
};
