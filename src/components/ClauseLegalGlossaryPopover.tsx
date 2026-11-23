import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X } from 'lucide-react';
import { CLAUSE_LEGAL_GLOSSARY } from '../data/clauseLegalGlossary';

interface ClauseLegalGlossaryPopoverProps {
  clauseId: number;
  clauseTitle: string;
  variant?: 'compact' | 'labeled';
}

interface PopoverCoords {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

const POPOVER_WIDTH = 336;
const VIEWPORT_MARGIN = 12;

export const ClauseLegalGlossaryPopover: React.FC<ClauseLegalGlossaryPopoverProps> = ({
  clauseId,
  clauseTitle,
  variant = 'compact',
}) => {
  const definitions = CLAUSE_LEGAL_GLOSSARY[clauseId] ?? [];
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const popoverId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const estimatedHeight = Math.min(340, 96 + definitions.length * 108);

    const spaceBelow = viewportHeight - rect.bottom;
    const placement: 'top' | 'bottom' =
      spaceBelow >= estimatedHeight + 16 || spaceBelow >= rect.top
        ? 'bottom'
        : 'top';

    const top = placement === 'bottom' ? rect.bottom + 8 : rect.top - 8;
    const idealLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
    const clampedLeft = Math.max(
      VIEWPORT_MARGIN,
      Math.min(viewportWidth - POPOVER_WIDTH - VIEWPORT_MARGIN, idealLeft)
    );

    setCoords({ top, left: clampedLeft, placement });
  }, [definitions.length]);

  const openPopover = useCallback(() => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }, [clearCloseTimer, updatePosition]);

  const scheduleClose = useCallback(() => {
    if (pinned) return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 140);
  }, [clearCloseTimer, pinned]);

  const closeImmediately = useCallback(() => {
    clearCloseTimer();
    setPinned(false);
    setOpen(false);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;

    const handleViewportChange = () => updatePosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImmediately();
        triggerRef.current?.focus();
      }
    };
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        cardRef.current?.contains(target)
      ) {
        return;
      }
      closeImmediately();
    };

    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open, updatePosition, closeImmediately]);

  if (definitions.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-label={`Legal definitions for ${clauseTitle}`}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onFocus={openPopover}
        onBlur={(e) => {
          if (!cardRef.current?.contains(e.relatedTarget as Node | null)) {
            scheduleClose();
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (open && pinned) {
            closeImmediately();
          } else {
            setPinned(true);
            openPopover();
          }
        }}
        className={
          variant === 'labeled'
            ? `inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                open
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-blue-700 dark:hover:text-blue-400'
              }`
            : `inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                open
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300'
              }`
        }
      >
        <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>
          {variant === 'labeled'
            ? `Legal Definitions (${definitions.length})`
            : 'Glossary'}
        </span>
      </button>

      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={cardRef}
            id={popoverId}
            role="dialog"
            aria-label={`Legal definitions for ${clauseTitle}`}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2),
              transform:
                coords.placement === 'top' ? 'translateY(-100%)' : 'translateY(0)',
            }}
            className="z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 space-y-3 text-left"
          >
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Legal Definitions
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                  Clause #{clauseId} · {clauseTitle}
                </div>
              </div>
              <button
                type="button"
                onClick={closeImmediately}
                aria-label="Close legal definitions"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-0.5">
              {definitions.map((item) => (
                <div
                  key={item.term}
                  className="space-y-1 pb-2.5 last:pb-0 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {item.term}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.plainEnglish}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Creator impact:
                    </span>{' '}
                    {item.whyItMatters}
                  </p>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
