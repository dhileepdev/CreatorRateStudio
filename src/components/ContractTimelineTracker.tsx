import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { TurnaroundWindow } from '../types/calculator';

interface ContractTimelineState {
  legalReviewDeadline: string;
  finalDraftDue: string;
  launchDate: string;
  completed: {
    legalReview: boolean;
    finalDraft: boolean;
    launch: boolean;
  };
}

const TIMELINE_STORAGE_KEY = 'creator_rate_studio_contract_timeline_v1';

function addDaysToDateInput(baseDate: Date, days: number): string {
  const next = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + days
  );
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDefaultTimeline(turnaroundWindow: TurnaroundWindow): ContractTimelineState {
  const today = new Date();
  if (turnaroundWindow === 'rush_under_5d') {
    return {
      legalReviewDeadline: addDaysToDateInput(today, 2),
      finalDraftDue: addDaysToDateInput(today, 4),
      launchDate: addDaysToDateInput(today, 6),
      completed: { legalReview: false, finalDraft: false, launch: false },
    };
  }
  return {
    legalReviewDeadline: addDaysToDateInput(today, 4),
    finalDraftDue: addDaysToDateInput(today, 10),
    launchDate: addDaysToDateInput(today, 14),
    completed: { legalReview: false, finalDraft: false, launch: false },
  };
}

function loadSavedTimeline(turnaroundWindow: TurnaroundWindow): ContractTimelineState {
  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
    if (!raw) return buildDefaultTimeline(turnaroundWindow);
    const parsed = JSON.parse(raw) as Partial<ContractTimelineState>;
    const fallback = buildDefaultTimeline(turnaroundWindow);
    return {
      legalReviewDeadline:
        typeof parsed.legalReviewDeadline === 'string'
          ? parsed.legalReviewDeadline
          : fallback.legalReviewDeadline,
      finalDraftDue:
        typeof parsed.finalDraftDue === 'string'
          ? parsed.finalDraftDue
          : fallback.finalDraftDue,
      launchDate:
        typeof parsed.launchDate === 'string' ? parsed.launchDate : fallback.launchDate,
      completed: {
        legalReview: Boolean(parsed.completed?.legalReview),
        finalDraft: Boolean(parsed.completed?.finalDraft),
        launch: Boolean(parsed.completed?.launch),
      },
    };
  } catch {
    return buildDefaultTimeline(turnaroundWindow);
  }
}

function parseDateInput(dateStr: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatShortDate(dateStr: string): string {
  const dt = parseDateInput(dateStr);
  if (!dt) return 'Not set';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dt);
}

function getDaysDeltaFromToday(dateStr: string): number | null {
  const dt = parseDateInput(dateStr);
  if (!dt) return null;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = dt.getTime() - todayMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatCountdown(days: number | null, isDone: boolean): {
  label: string;
  toneClass: string;
} {
  if (isDone) {
    return {
      label: 'Completed',
      toneClass: 'text-emerald-700 dark:text-emerald-400',
    };
  }
  if (days === null) {
    return {
      label: 'Date pending',
      toneClass: 'text-slate-400 dark:text-slate-500',
    };
  }
  if (days < 0) {
    const abs = Math.abs(days);
    return {
      label: `${abs} ${abs === 1 ? 'day' : 'days'} overdue`,
      toneClass: 'text-red-700 dark:text-red-400',
    };
  }
  if (days === 0) {
    return {
      label: 'Due today',
      toneClass: 'text-amber-700 dark:text-amber-400',
    };
  }
  if (days <= 2) {
    return {
      label: `In ${days} ${days === 1 ? 'day' : 'days'}`,
      toneClass: 'text-amber-700 dark:text-amber-400',
    };
  }
  return {
    label: `In ${days} days`,
    toneClass: 'text-blue-700 dark:text-blue-400',
  };
}

interface ContractTimelineTrackerProps {
  turnaroundWindow: TurnaroundWindow;
  onCopyText: (text: string, label: string) => void;
}

export const ContractTimelineTracker: React.FC<ContractTimelineTrackerProps> = ({
  turnaroundWindow,
  onCopyText,
}) => {
  const [timeline, setTimeline] = useState<ContractTimelineState>(() =>
    loadSavedTimeline(turnaroundWindow)
  );
  const [copiedSchedule, setCopiedSchedule] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(timeline));
    } catch {
      // Ignore storage quota errors
    }
  }, [timeline]);

  const net14InvoiceDate = useMemo(() => {
    const anchor =
      parseDateInput(timeline.finalDraftDue) ?? parseDateInput(timeline.launchDate);
    if (!anchor) return '';
    return addDaysToDateInput(anchor, 14);
  }, [timeline.finalDraftDue, timeline.launchDate]);

  const scheduleWarnings = useMemo(() => {
    const warnings: string[] = [];
    const legalDt = parseDateInput(timeline.legalReviewDeadline);
    const draftDt = parseDateInput(timeline.finalDraftDue);
    const launchDt = parseDateInput(timeline.launchDate);

    if (legalDt && draftDt) {
      const gap = Math.round((draftDt.getTime() - legalDt.getTime()) / 86400000);
      if (gap < 0) {
        warnings.push(
          'Legal Review Deadline is set after Final Draft Due — finalize contract redlines before filming/delivery.'
        );
      } else if (gap < 2) {
        warnings.push(
          `Only ${gap} ${gap === 1 ? 'day' : 'days'} between Legal Review and Final Draft Due — consider a rush surcharge if turnaround is under 5 business days.`
        );
      }
    }

    if (draftDt && launchDt) {
      const gap = Math.round((launchDt.getTime() - draftDt.getTime()) / 86400000);
      if (gap < 0) {
        warnings.push(
          'Final Draft Due is set after Launch Date — adjust dates to allow brand review before go-live.'
        );
      }
    }

    if (legalDt && launchDt && legalDt.getTime() > launchDt.getTime()) {
      warnings.push(
        'Legal Review Deadline falls after Launch Date — never publish sponsored content before executing the signed SOW.'
      );
    }

    return warnings;
  }, [timeline.legalReviewDeadline, timeline.finalDraftDue, timeline.launchDate]);

  const milestones = useMemo(
    () => [
      {
        id: 'legalReview' as const,
        step: '01',
        label: 'Legal Review Deadline',
        fieldKey: 'legalReviewDeadline' as const,
        dateValue: timeline.legalReviewDeadline,
        done: timeline.completed.legalReview,
        detail: 'Redlines finalized & SOW executed',
      },
      {
        id: 'finalDraft' as const,
        step: '02',
        label: 'Final Draft Due',
        fieldKey: 'finalDraftDue' as const,
        dateValue: timeline.finalDraftDue,
        done: timeline.completed.finalDraft,
        detail: 'Final edited asset delivered for approval',
      },
      {
        id: 'launch' as const,
        step: '03',
        label: 'Launch Date',
        fieldKey: 'launchDate' as const,
        dateValue: timeline.launchDate,
        done: timeline.completed.launch,
        detail: 'Go-live post & usage clock starts',
      },
    ],
    [timeline]
  );

  const completedCount = milestones.filter((m) => m.done).length;
  const workflowPct = Math.round((completedCount / milestones.length) * 100);

  const handleToggleDone = (key: 'legalReview' | 'finalDraft' | 'launch') => {
    setTimeline((prev) => ({
      ...prev,
      completed: {
        ...prev.completed,
        [key]: !prev.completed[key],
      },
    }));
  };

  const handleResetToTurnaround = () => {
    setTimeline(buildDefaultTimeline(turnaroundWindow));
  };

  const handleCopySchedule = () => {
    const lines = [
      'Contract Audit & Production Milestone Schedule',
      `- Legal Review Deadline: ${formatShortDate(timeline.legalReviewDeadline)}${
        timeline.completed.legalReview ? ' (Completed)' : ''
      }`,
      `- Final Draft Due: ${formatShortDate(timeline.finalDraftDue)}${
        timeline.completed.finalDraft ? ' (Completed)' : ''
      }`,
      `- Launch Date: ${formatShortDate(timeline.launchDate)}${
        timeline.completed.launch ? ' (Completed)' : ''
      }`,
      `- Target Net-14 Payout Due: ${formatShortDate(net14InvoiceDate)}`,
    ];
    onCopyText(lines.join('\n'), 'contract milestone schedule');
    setCopiedSchedule(true);
    window.setTimeout(() => setCopiedSchedule(false), 1800);
  };

  return (
    <div
      id="contract-timeline-tracker"
      aria-label="Contract timeline tracker"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 transition-colors"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2">
            <CalendarClock
              className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
              aria-hidden="true"
            />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Contract Timeline Tracker
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Set key contract audit and campaign deadlines to keep redlines, approvals, and Net-14 billing on schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
            {completedCount}/3 milestones · {workflowPct}%
          </span>
          <button
            type="button"
            onClick={handleResetToTurnaround}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Sync to {turnaroundWindow === 'rush_under_5d' ? 'Rush' : '14d'} Window
          </button>
          <button
            type="button"
            onClick={handleCopySchedule}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100/80 dark:hover:bg-blue-900/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedSchedule ? (
              <Check
                className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {copiedSchedule ? 'Copied' : 'Copy Schedule'}
          </button>
        </div>
      </div>

      {/* Date Inputs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {milestones.map((m) => (
          <div key={`input-${m.id}`} className="space-y-1">
            <label
              htmlFor={`timeline-${m.id}`}
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
            >
              {m.label}
            </label>
            <input
              id={`timeline-${m.id}`}
              type="date"
              value={m.dateValue}
              onChange={(e) =>
                setTimeline((prev) => ({
                  ...prev,
                  [m.fieldKey]: e.target.value,
                }))
              }
              className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
        ))}
      </div>

      {/* Visual Horizontal Milestone Track */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          {milestones.map((m, idx) => {
            const deltaDays = getDaysDeltaFromToday(m.dateValue);
            const countdown = formatCountdown(deltaDays, m.done);
            const isOverdue = !m.done && deltaDays !== null && deltaDays < 0;

            return (
              <div
                key={`node-${m.id}`}
                className="flex flex-col justify-between gap-2 pb-3 md:pb-0 border-b md:border-b-0 md:border-r last:border-b-0 last:border-r-0 border-slate-100 dark:border-slate-800 md:pr-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleDone(m.id)}
                      aria-pressed={m.done}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-colors ${
                        m.done
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : isOverdue
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          m.done
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                        aria-hidden="true"
                      />
                      <span>
                        {m.step}. {m.label}
                      </span>
                    </button>
                  </div>

                  <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
                    {formatShortDate(m.dateValue)}
                  </div>
                  <div className={`font-mono tabular-nums text-[11px] font-medium ${countdown.toneClass}`}>
                    {countdown.label}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        m.done
                          ? 'bg-emerald-600 dark:bg-emerald-500 w-full'
                          : isOverdue
                            ? 'bg-red-600 dark:bg-red-500 w-2/3'
                            : idx === 0
                              ? 'bg-blue-700 dark:bg-blue-500 w-1/2'
                              : 'bg-slate-300 dark:bg-slate-600 w-1/4'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {m.detail}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Auto-Calculated Net-14 Invoice Target */}
          <div className="flex flex-col justify-between gap-2 md:pl-1">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                04. Target Net-14 Payout
              </div>
              <div className="font-mono tabular-nums text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {formatShortDate(net14InvoiceDate)}
              </div>
              <div className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                +14d from Final Draft
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    completedCount === 3
                      ? 'bg-emerald-600 dark:bg-emerald-500 w-full'
                      : 'bg-emerald-500/40 dark:bg-emerald-500/30 w-1/3'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Invoice due date under statutory Net-14 clause
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Sequencing Warnings */}
      {scheduleWarnings.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 space-y-1">
          {scheduleWarnings.map((warning) => (
            <div
              key={warning}
              className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle
                className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
