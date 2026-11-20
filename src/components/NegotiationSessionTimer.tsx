import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  Clock,
  Pause,
  Play,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';

interface NegotiationSessionTimerProps {
  onNotify: (message: string) => void;
}

const THRESHOLD_PRESETS = [15, 30, 45, 60];
const TIMER_PREFS_STORAGE_KEY = 'creator_rate_studio_session_timer_prefs_v1';

function loadTimerPrefs(): { thresholdMinutes: number; alertEnabled: boolean } {
  try {
    const raw = localStorage.getItem(TIMER_PREFS_STORAGE_KEY);
    if (!raw) return { thresholdMinutes: 30, alertEnabled: true };
    const parsed = JSON.parse(raw) as Partial<{
      thresholdMinutes: number;
      alertEnabled: boolean;
    }>;
    const mins =
      typeof parsed.thresholdMinutes === 'number' &&
      Number.isFinite(parsed.thresholdMinutes)
        ? Math.min(240, Math.max(1, Math.round(parsed.thresholdMinutes)))
        : 30;
    return {
      thresholdMinutes: mins,
      alertEnabled:
        typeof parsed.alertEnabled === 'boolean' ? parsed.alertEnabled : true,
    };
  } catch {
    return { thresholdMinutes: 30, alertEnabled: true };
  }
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export const NegotiationSessionTimer: React.FC<NegotiationSessionTimerProps> = ({
  onNotify,
}) => {
  const initialPrefs = loadTimerPrefs();
  const [thresholdMinutes, setThresholdMinutes] = useState<number>(
    initialPrefs.thresholdMinutes
  );
  const [alertEnabled, setAlertEnabled] = useState<boolean>(
    initialPrefs.alertEnabled
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [alertDismissed, setAlertDismissed] = useState<boolean>(false);

  const accumulatedMsRef = useRef<number>(0);
  const startedAtMsRef = useRef<number | null>(null);
  const notifiedThresholdSecRef = useRef<number | null>(null);

  const thresholdSeconds = Math.max(60, thresholdMinutes * 60);
  const isOverThreshold = alertEnabled && elapsedSeconds >= thresholdSeconds;
  const overtimeSeconds = Math.max(0, elapsedSeconds - thresholdSeconds);
  const remainingSeconds = Math.max(0, thresholdSeconds - elapsedSeconds);
  const progressPct = Math.min(100, Math.round((elapsedSeconds / thresholdSeconds) * 100));

  useEffect(() => {
    try {
      localStorage.setItem(
        TIMER_PREFS_STORAGE_KEY,
        JSON.stringify({ thresholdMinutes, alertEnabled })
      );
    } catch {
      // Ignore storage quota issues in restricted contexts
    }
  }, [thresholdMinutes, alertEnabled]);

  useEffect(() => {
    if (!isRunning) return;
    startedAtMsRef.current = Date.now();

    const intervalId = window.setInterval(() => {
      if (startedAtMsRef.current === null) return;
      const totalMs =
        accumulatedMsRef.current + (Date.now() - startedAtMsRef.current);
      setElapsedSeconds(Math.floor(totalMs / 1000));
    }, 250);

    return () => {
      if (startedAtMsRef.current !== null) {
        accumulatedMsRef.current += Date.now() - startedAtMsRef.current;
        startedAtMsRef.current = null;
      }
      window.clearInterval(intervalId);
    };
  }, [isRunning]);

  useEffect(() => {
    if (
      alertEnabled &&
      elapsedSeconds >= thresholdSeconds &&
      notifiedThresholdSecRef.current !== thresholdSeconds
    ) {
      notifiedThresholdSecRef.current = thresholdSeconds;
      setAlertDismissed(false);
      onNotify(
        `Negotiation session reached your ${thresholdMinutes}-minute wrap-up threshold.`
      );
    }
  }, [alertEnabled, elapsedSeconds, thresholdSeconds, thresholdMinutes, onNotify]);

  const handleToggleRun = () => {
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    accumulatedMsRef.current = 0;
    startedAtMsRef.current = null;
    notifiedThresholdSecRef.current = null;
    setElapsedSeconds(0);
    setAlertDismissed(false);
  };

  const handleSetThreshold = (mins: number) => {
    const clamped = Math.min(240, Math.max(1, Math.round(mins)));
    setThresholdMinutes(clamped);
    if (elapsedSeconds < clamped * 60) {
      notifiedThresholdSecRef.current = null;
      setAlertDismissed(false);
    }
  };

  const handleExtendThreshold = (extraMinutes: number) => {
    const nextMins = Math.min(240, Math.ceil(elapsedSeconds / 60) + extraMinutes);
    handleSetThreshold(nextMins);
    onNotify(`Extended wrap-up threshold to ${nextMins} minutes.`);
  };

  const statusText = isOverThreshold
    ? 'Over Threshold'
    : isRunning
      ? 'Active Session'
      : elapsedSeconds > 0
        ? 'Paused'
        : 'Ready';

  const statusColorClass = isOverThreshold
    ? 'text-amber-700 dark:text-amber-400'
    : isRunning
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-slate-600 dark:text-slate-400';

  return (
    <div
      aria-label="Contract negotiation session timer"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Clock Readout + Status + Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0">
              <Clock className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-display font-semibold text-slate-900 dark:text-slate-100">
                  Negotiation Session Timer
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span className={`font-medium ${statusColorClass}`}>{statusText}</span>
              </div>
              <div className="flex items-baseline gap-2.5 mt-0.5 tabular-nums">
                <span
                  aria-live="off"
                  className={`font-mono text-2xl font-bold leading-none ${
                    isOverThreshold
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {formatDuration(elapsedSeconds)}
                </span>
                {alertEnabled && (
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {isOverThreshold
                      ? `+${formatDuration(overtimeSeconds)} over ${thresholdMinutes}m limit`
                      : `${formatDuration(remainingSeconds)} until ${thresholdMinutes}m wrap-up`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleRun}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isRunning
                  ? 'bg-amber-600 dark:bg-amber-500 text-white hover:bg-amber-700 dark:hover:bg-amber-400'
                  : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  {elapsedSeconds > 0 ? 'Resume' : 'Start Session'}
                </>
              )}
            </button>
            <button
              type="button"
              disabled={elapsedSeconds === 0 && !isRunning}
              onClick={handleReset}
              aria-label="Reset session timer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        {/* Right: Wrap-Up Alert Threshold Settings */}
        <div className="flex flex-wrap items-center gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <label
              htmlFor="session-alert-toggle"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap"
            >
              {alertEnabled ? (
                <Bell className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              )}
              Wrap-Up Alert
            </label>
            <button
              id="session-alert-toggle"
              type="button"
              role="switch"
              aria-checked={alertEnabled}
              onClick={() => {
                setAlertEnabled((prev) => !prev);
                setAlertDismissed(false);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                alertEnabled
                  ? 'bg-blue-700 dark:bg-blue-600'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  alertEnabled ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {alertEnabled && (
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                role="group"
                aria-label="Wrap-up threshold presets"
                className="inline-flex items-center gap-1"
              >
                {THRESHOLD_PRESETS.map((mins) => {
                  const active = thresholdMinutes === mins;
                  return (
                    <button
                      key={`preset-${mins}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSetThreshold(mins)}
                      className={`px-2 py-1 text-[11px] font-mono font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {mins}m
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <label htmlFor="session-threshold-input" className="sr-only">
                  Custom alert threshold in minutes
                </label>
                <input
                  id="session-threshold-input"
                  type="number"
                  min={1}
                  max={240}
                  step={1}
                  value={thresholdMinutes}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isFinite(val) && val >= 1) {
                      handleSetThreshold(val);
                    }
                  }}
                  className="w-16 px-2 py-1 text-xs font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">min</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Track toward Wrap-Up Threshold */}
      {alertEnabled && (
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isOverThreshold
                  ? 'bg-amber-600 dark:bg-amber-500'
                  : progressPct >= 80
                    ? 'bg-amber-500 dark:bg-amber-400'
                    : 'bg-blue-700 dark:bg-blue-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Non-Blocking Wrap-Up Alert Banner */}
      {isOverThreshold && !alertDismissed && (
        <div
          role="alert"
          className="px-3.5 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/45 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200"
        >
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle
              className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <span className="font-semibold">Time to wrap up this negotiation session.</span>{' '}
              <span className="text-amber-900/90 dark:text-amber-300">
                You have passed your {thresholdMinutes}-minute threshold (
                <span className="font-mono tabular-nums">
                  +{formatDuration(overtimeSeconds)}
                </span>
                ). Recap agreed redlines, confirm next steps by email, and protect your billable prep time.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExtendThreshold(15)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />
              Extend +15m
            </button>
            <button
              type="button"
              onClick={() => setAlertDismissed(true)}
              aria-label="Dismiss wrap-up alert"
              className="p-1 text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
