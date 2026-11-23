import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Copy,
  MessageSquarePlus,
  Send,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { CONTRACT_RED_FLAGS } from '../data/benchmarks';

export type NegotiationLogEntryType =
  | 'creator_counter'
  | 'brand_response'
  | 'agreed'
  | 'note';

export interface NegotiationLogEntry {
  id: string;
  clauseId: number;
  entryType: NegotiationLogEntryType;
  note: string;
  createdAt: string;
}

const ENTRY_TYPE_META: Record<
  NegotiationLogEntryType,
  {
    label: string;
    shortLabel: string;
    textClass: string;
    activeBtnClass: string;
  }
> = {
  creator_counter: {
    label: 'Counter Sent',
    shortLabel: 'Counter Sent',
    textClass: 'text-blue-700 dark:text-blue-400',
    activeBtnClass:
      'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600',
  },
  brand_response: {
    label: 'Brand Reply',
    shortLabel: 'Brand Reply',
    textClass: 'text-amber-700 dark:text-amber-400',
    activeBtnClass:
      'bg-amber-600 dark:bg-amber-500 text-white border-amber-600 dark:border-amber-500',
  },
  agreed: {
    label: 'Agreed / Resolved',
    shortLabel: 'Agreed',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    activeBtnClass:
      'bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-700 dark:border-emerald-600',
  },
  note: {
    label: 'Internal Note',
    shortLabel: 'Note',
    textClass: 'text-slate-600 dark:text-slate-400',
    activeBtnClass:
      'bg-slate-800 dark:bg-slate-600 text-white border-slate-800 dark:border-slate-600',
  },
};

const ENTRY_TYPE_OPTIONS: NegotiationLogEntryType[] = [
  'creator_counter',
  'brand_response',
  'agreed',
  'note',
];

function formatLogTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

interface NegotiationLogPanelProps {
  entries: NegotiationLogEntry[];
  activeClauseId: number;
  flaggedClauseIds: number[];
  onAddEntry: (clauseId: number, entryType: NegotiationLogEntryType, note: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onClearAllEntries: () => void;
  onSelectClause: (clauseId: number) => void;
  onCopyText: (text: string, label: string) => void;
}

type LogViewFilter = 'all' | 'active_clause' | 'flagged_only';

export const NegotiationLogPanel: React.FC<NegotiationLogPanelProps> = ({
  entries,
  activeClauseId,
  flaggedClauseIds,
  onAddEntry,
  onDeleteEntry,
  onClearAllEntries,
  onSelectClause,
  onCopyText,
}) => {
  const [targetClauseId, setTargetClauseId] = useState<number>(activeClauseId);
  const [entryType, setEntryType] = useState<NegotiationLogEntryType>('creator_counter');
  const [noteInput, setNoteInput] = useState('');
  const [viewFilter, setViewFilter] = useState<LogViewFilter>('all');

  // Keep target dropdown synced when user hasn't started typing a note and switches active clause
  const [lastSyncedActiveId, setLastSyncedActiveId] = useState<number>(activeClauseId);
  if (activeClauseId !== lastSyncedActiveId) {
    setLastSyncedActiveId(activeClauseId);
    if (noteInput.trim() === '') {
      setTargetClauseId(activeClauseId);
    }
  }

  const activeClauseObj =
    CONTRACT_RED_FLAGS.find((c) => c.clauseId === activeClauseId) ?? CONTRACT_RED_FLAGS[0];

  const visibleEntries = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (viewFilter === 'active_clause') {
      return sorted.filter((e) => e.clauseId === activeClauseId);
    }
    if (viewFilter === 'flagged_only') {
      return sorted.filter((e) => flaggedClauseIds.includes(e.clauseId));
    }
    return sorted;
  }, [entries, viewFilter, activeClauseId, flaggedClauseIds]);

  const activeClauseEntryCount = useMemo(
    () => entries.filter((e) => e.clauseId === activeClauseId).length,
    [entries, activeClauseId]
  );

  const uniqueLoggedClausesCount = useMemo(
    () => new Set(entries.map((e) => e.clauseId)).size,
    [entries]
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    onAddEntry(targetClauseId, entryType, trimmed);
    setNoteInput('');
  };

  const handleCopyHistory = () => {
    if (visibleEntries.length === 0) return;
    const lines = visibleEntries.map((entry) => {
      const clause = CONTRACT_RED_FLAGS.find((c) => c.clauseId === entry.clauseId);
      const clauseLabel = clause
        ? `Clause #${clause.clauseId} (${clause.clauseTitle})`
        : `Clause #${entry.clauseId}`;
      const meta = ENTRY_TYPE_META[entry.entryType];
      return `[${formatLogTimestamp(entry.createdAt)}] [${meta.label}] ${clauseLabel}\n${entry.note}`;
    });
    onCopyText(lines.join('\n\n'), `negotiation log (${visibleEntries.length} entries)`);
  };

  return (
    <div
      id="negotiation-log"
      aria-label="Clause negotiation log"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 scroll-mt-24"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2">
            <ClipboardList
              className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
              aria-hidden="true"
            />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Negotiation Log
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Append timestamped counter-offer notes to specific red-flag clauses to track every revision and brand reply.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} ·{' '}
            {uniqueLoggedClausesCount}{' '}
            {uniqueLoggedClausesCount === 1 ? 'clause' : 'clauses'}
          </span>
          {visibleEntries.length > 0 && (
            <button
              type="button"
              onClick={handleCopyHistory}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              Copy Log
            </button>
          )}
          {entries.length > 0 && (
            <button
              type="button"
              onClick={onClearAllEntries}
              className="text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Add Timestamped Note Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Target Clause Selector */}
          <div className="md:col-span-5">
            <label
              htmlFor="negotiation-log-clause"
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Clause Reference
            </label>
            <select
              id="negotiation-log-clause"
              value={targetClauseId}
              onChange={(e) => setTargetClauseId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            >
              {CONTRACT_RED_FLAGS.map((clause) => {
                const flagged = flaggedClauseIds.includes(clause.clauseId);
                return (
                  <option key={clause.clauseId} value={clause.clauseId}>
                    #{clause.clauseId} · {clause.clauseTitle}
                    {flagged ? ' [Flagged]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Entry Type Segmented Buttons */}
          <div className="md:col-span-7">
            <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Update Type
            </span>
            <div
              role="group"
              aria-label="Negotiation update type"
              className="flex flex-wrap items-center gap-1.5"
            >
              {ENTRY_TYPE_OPTIONS.map((typeId) => {
                const meta = ENTRY_TYPE_META[typeId];
                const active = entryType === typeId;
                return (
                  <button
                    key={typeId}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setEntryType(typeId)}
                    className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? meta.activeBtnClass
                        : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {meta.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Note Input + Submit */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
          <div className="flex-1">
            <label htmlFor="negotiation-log-note" className="sr-only">
              Counter-offer or negotiation note
            </label>
            <textarea
              id="negotiation-log-note"
              rows={2}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Document counter-offer details, brand concessions, or open blockers (Cmd/Ctrl + Enter to log)..."
              className="w-full px-3 py-2 text-xs bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-y"
            />
          </div>
          <button
            type="submit"
            disabled={noteInput.trim().length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
            Log Entry
          </button>
        </div>
      </form>

      {/* Filter Bar + Chronological History */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Filter negotiation log entries"
            className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            {(
              [
                { id: 'all', label: `All (${entries.length})` },
                {
                  id: 'active_clause',
                  label: `Clause #${activeClauseObj.clauseId} (${activeClauseEntryCount})`,
                },
                {
                  id: 'flagged_only',
                  label: 'Flagged Only',
                },
              ] as const
            ).map((tab) => {
              const active = viewFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setViewFilter(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Saved automatically in this browser
          </span>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="py-5 text-center space-y-1.5 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {entries.length === 0
                ? 'No counter-offer notes logged yet.'
                : 'No log entries match the current filter.'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {entries.length === 0
                ? 'Select a clause above to record sent redlines, brand counter-offers, and agreed concessions.'
                : 'Switch to All entries or log a new update for this clause above.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto border-t border-slate-100 dark:border-slate-800">
            {visibleEntries.map((entry) => {
              const clause = CONTRACT_RED_FLAGS.find((c) => c.clauseId === entry.clauseId);
              const meta = ENTRY_TYPE_META[entry.entryType];
              const isSelectedClause = entry.clauseId === activeClauseId;

              return (
                <div
                  key={entry.id}
                  className="py-3 flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${meta.textClass}`}
                      >
                        {entry.entryType === 'agreed' ? (
                          <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                        ) : entry.entryType === 'creator_counter' ? (
                          <Send className="w-3 h-3 shrink-0" aria-hidden="true" />
                        ) : (
                          <StickyNote className="w-3 h-3 shrink-0" aria-hidden="true" />
                        )}
                        {meta.label}
                      </span>
                      <span
                        className="text-slate-300 dark:text-slate-600"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectClause(entry.clauseId)}
                        className={`font-medium hover:underline cursor-pointer truncate ${
                          isSelectedClause
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        #{entry.clauseId}{' '}
                        {clause ? clause.clauseTitle : 'Contract Clause'}
                      </button>
                      <span
                        className="text-slate-300 dark:text-slate-600"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <time
                        dateTime={entry.createdAt}
                        className="font-mono tabular-nums text-slate-400 dark:text-slate-500"
                      >
                        {formatLogTimestamp(entry.createdAt)}
                      </time>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {entry.note}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteEntry(entry.id)}
                    aria-label={`Delete negotiation log note for clause ${entry.clauseId}`}
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
