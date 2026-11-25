import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, FileText, X } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import {
  CalculatedDealResult,
  ClauseRiskWeight,
  ContractClause,
  CreatorProfile,
  DealScope,
} from '../types/calculator';
import { generatePlainTextContract } from '../utils/pricingEngine';

interface ContractExportModalProps {
  open: boolean;
  onClose: () => void;
  brandName: string;
  creatorName: string;
  representedBy?: string;
  primaryContactName?: string;
  primaryContactRole?: string;
  primaryContactEmail?: string;
  onChangeBrandName: (value: string) => void;
  onChangeCreatorName: (value: string) => void;
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
  flaggedClauses: ContractClause[];
  clauseRiskWeights: Partial<Record<number, ClauseRiskWeight>>;
  customClauses: string;
  onCopyText: (text: string, label: string) => void;
}

export const ContractExportModal: React.FC<ContractExportModalProps> = ({
  open,
  onClose,
  brandName,
  creatorName,
  representedBy = '',
  primaryContactName = '',
  primaryContactRole = '',
  primaryContactEmail = '',
  onChangeBrandName,
  onChangeCreatorName,
  profile,
  scope,
  result,
  flaggedClauses,
  clauseRiskWeights,
  customClauses,
  onCopyText,
}) => {
  const { currency } = useCurrency();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const plainTextContract = useMemo(
    () =>
      generatePlainTextContract({
        brandName,
        creatorName,
        representedBy,
        primaryContactName,
        primaryContactRole,
        primaryContactEmail,
        profile,
        scope,
        result,
        flaggedClauses,
        clauseRiskWeights,
        customClauses,
        currency,
      }),
    [
      brandName,
      creatorName,
      representedBy,
      primaryContactName,
      primaryContactRole,
      primaryContactEmail,
      profile,
      scope,
      result,
      flaggedClauses,
      clauseRiskWeights,
      customClauses,
      currency,
    ]
  );

  const wordCount = useMemo(() => {
    const trimmed = plainTextContract.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [plainTextContract]);

  const customStipulationCount = useMemo(() => {
    const trimmed = customClauses.trim();
    if (!trimmed) return 0;
    return trimmed
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean).length;
  }, [customClauses]);

  if (!open) return null;

  const handleCopyPlainText = () => {
    onCopyText(plainTextContract, 'plain-text contract document');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const safeBrand = (brandName.trim() || 'Sponsor')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const today = new Date();
    const dateStamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const filename = `Creator-Contract-${safeBrand || 'Draft'}-${dateStamp}.txt`;

    const blob = new Blob([plainTextContract], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-contract-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2">
              <FileText
                className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
                aria-hidden="true"
              />
              <h2
                id="export-contract-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Export Plain-Text Contract Draft
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clean, non-Markdown legal text ready to paste directly into Google Docs, Microsoft Word, DocuSign, or PandaDoc.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export contract modal"
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/70 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Party Names & Metadata Strip */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="export-brand-name"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Brand / Client Legal Name
              </label>
              <input
                id="export-brand-name"
                type="text"
                value={brandName}
                onChange={(e) => onChangeBrandName(e.target.value)}
                placeholder="e.g., Acme Brands, Inc."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label
                htmlFor="export-creator-name"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Creator / Studio Legal Name
              </label>
              <input
                id="export-creator-name"
                type="text"
                value={creatorName}
                onChange={(e) => onChangeCreatorName(e.target.value)}
                placeholder="e.g., Alex Rivera Media LLC"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              Plain Text (No Markdown)
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {flaggedClauses.length}{' '}
              {flaggedClauses.length === 1 ? 'modification' : 'modifications'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {customStipulationCount}{' '}
              {customStipulationCount === 1 ? 'custom clause' : 'custom clauses'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{wordCount} words</span>
          </div>
        </div>

        {/* Scrollable Plain-Text Preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/70 dark:bg-slate-950/70">
          <textarea
            readOnly
            rows={18}
            aria-label="Plain-text formatted contract preview"
            value={plainTextContract}
            onFocus={(e) => e.target.select()}
            className="w-full h-full min-h-[340px] p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-blue-600 resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Download .txt
            </button>
            <button
              type="button"
              onClick={handleCopyPlainText}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {copied ? 'Copied Plain Text' : 'Copy Plain Text'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
