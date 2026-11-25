import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { ClauseRiskWeight, ContractClause } from '../types/calculator';

export type CounterpartyRepresentationType =
  | 'direct_brand'
  | 'marketing_agency'
  | 'in_house_legal';

export interface BrandAgencyProfile {
  brandName: string;
  representedBy: string;
  representationType: CounterpartyRepresentationType;
  primaryContactName: string;
  primaryContactRole: string;
  primaryContactEmail: string;
  dealNotes: string;
}

export const EMPTY_BRAND_AGENCY_PROFILE: BrandAgencyProfile = {
  brandName: '',
  representedBy: '',
  representationType: 'direct_brand',
  primaryContactName: '',
  primaryContactRole: '',
  primaryContactEmail: '',
  dealNotes: '',
};

const REPRESENTATION_OPTIONS: Array<{
  id: CounterpartyRepresentationType;
  label: string;
}> = [
  { id: 'direct_brand', label: 'Direct Brand' },
  { id: 'marketing_agency', label: 'Agency / Talent Rep' },
  { id: 'in_house_legal', label: 'In-House Legal' },
];

export function hasCounterpartyProfileDetails(
  profile: BrandAgencyProfile
): boolean {
  return Boolean(
    profile.brandName.trim() ||
      profile.representedBy.trim() ||
      profile.primaryContactName.trim() ||
      profile.primaryContactRole.trim() ||
      profile.primaryContactEmail.trim() ||
      profile.dealNotes.trim()
  );
}

export function buildPersonalizedClauseCommentary(
  counterparty: BrandAgencyProfile,
  clause: ContractClause,
  riskWeight: ClauseRiskWeight
): {
  headline: string;
  commentary: string;
  marginNote: string;
} {
  const brand = counterparty.brandName.trim() || 'the Brand';
  const rep = counterparty.representedBy.trim();
  const contact = counterparty.primaryContactName.trim();
  const contactRole = counterparty.primaryContactRole.trim();
  const isAgency =
    counterparty.representationType === 'marketing_agency' ||
    (Boolean(rep) && counterparty.representationType !== 'in_house_legal');
  const isLegal = counterparty.representationType === 'in_house_legal';

  const addressee = contact
    ? contactRole
      ? `${contact} (${contactRole})`
      : contact
    : rep
      ? `${rep} team`
      : `${brand} team`;

  const greetingName = contact || (rep ? `${rep} team` : `${brand} team`);

  const priorityPhrase =
    riskWeight === 'critical'
      ? 'a non-negotiable sign-off item'
      : riskWeight === 'moderate'
        ? 'a key commercial alignment item'
        : 'a quick housekeeping clarification';

  let categoryGuidance = '';
  switch (clause.category) {
    case 'Payment':
      categoryGuidance = isAgency
        ? `Because ${brand} is represented by ${rep || 'an external agency'}, confirm that invoice timing is tied strictly to your delivery date—never conditioned on ${brand} funding ${rep || 'the agency'} first (eliminate sequential liability / pay-when-paid delays).`
        : isLegal
          ? `Procurement and legal counsel at ${brand} often default to slow enterprise AP templates; anchor ${addressee} on Net-14 or a 50% execution deposit paired with an automatic 5-business-day approval clock.`
          : `Flag this directly with ${addressee} before production starts so ${brand}'s accounts payable schedule matches your delivery milestones and protects cash flow.`;
      break;

    case 'Rights & IP':
      categoryGuidance = isAgency
        ? `When negotiating via ${rep || 'an agency'}, make sure licensing is granted solely to ${brand} for this specific campaign—preventing ${rep || 'the agency'} or affiliated parent brands from sublicensing your likeness across unrelated accounts.`
        : isLegal
          ? `${brand}'s in-house legal templates frequently bundle perpetual "work made for hire" language by default; frame the fixed-term license with ${addressee} as a clean commercial structure with transparent renewal pricing.`
          : `Clarify with ${addressee} that ${brand} is licensing finished deliverables for a defined campaign term rather than purchasing permanent ownership of your face, voice, or raw footage.`;
      break;

    case 'Exclusivity':
      categoryGuidance = isAgency
        ? `Ensure this restriction applies strictly to ${brand}'s named direct competitors—never to the broader client portfolio managed by ${rep || 'the agency'}—and expires automatically on a fixed calendar date.`
        : isLegal
          ? `Ask ${addressee} to replace broad vertical blackout definitions with an explicit schedule of up to three (3) named direct competitors of ${brand} so legal compliance is unambiguous.`
          : `Work with ${addressee} to narrow ${brand}'s exclusivity window to named direct competitors and match the blackout length to the paid exclusivity rider.`;
      break;

    case 'Liability & Scope':
    default:
      categoryGuidance = isAgency
        ? `With ${rep || 'an agency'} coordinating approvals on behalf of ${brand}, require consolidated written sign-off from one designated decision-maker (${addressee}) and ensure mutual indemnification covers both ${brand}'s product claims and agency-supplied scripts.`
        : isLegal
          ? `Legal reviewers at ${brand} typically accept balanced mutual indemnification and a liability cap equal to total fees paid once raised directly as standard creator studio policy.`
          : `Align with ${addressee} so ${brand}'s product claims remain ${brand}'s responsibility, revision rounds stay consolidated, and termination triggers a fair milestone kill fee.`;
      break;
  }

  const notesAppendix = counterparty.dealNotes.trim()
    ? ` Context noted for this deal: ${counterparty.dealNotes.trim()}`
    : '';

  const headline = rep
    ? `Tailored Commentary · ${brand} (via ${rep})`
    : `Tailored Commentary · ${brand}`;

  const marginNote = `Hi ${greetingName} — flagging Section [${clause.clauseTitle}] as ${priorityPhrase} before we finalize the ${brand}${rep ? ` / ${rep}` : ''} agreement. To keep terms aligned with standard creator studio policy, could we substitute the following wording?\n\n"${clause.replacementText}"`;

  return {
    headline,
    commentary: `${categoryGuidance}${notesAppendix}`,
    marginNote,
  };
}

interface BrandAgencyProfileCardProps {
  profile: BrandAgencyProfile;
  onChange: (next: BrandAgencyProfile) => void;
  onReset: () => void;
  onCopyText: (text: string, label: string) => void;
}

export const BrandAgencyProfileCard: React.FC<BrandAgencyProfileCardProps> = ({
  profile,
  onChange,
  onReset,
  onCopyText,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const hasDetails = hasCounterpartyProfileDetails(profile);

  const updateField = <K extends keyof BrandAgencyProfile>(
    key: K,
    value: BrandAgencyProfile[K]
  ) => {
    onChange({ ...profile, [key]: value });
  };

  const filledCoreCount = [
    profile.brandName,
    profile.representedBy,
    profile.primaryContactName,
  ].filter((v) => v.trim().length > 0).length;

  const summaryParts = [
    profile.brandName.trim() ? `Brand: ${profile.brandName.trim()}` : null,
    profile.representedBy.trim()
      ? `Rep: ${profile.representedBy.trim()}`
      : null,
    profile.primaryContactName.trim()
      ? `Contact: ${profile.primaryContactName.trim()}${
          profile.primaryContactRole.trim()
            ? ` (${profile.primaryContactRole.trim()})`
            : ''
        }`
      : null,
  ].filter(Boolean);

  const handleCopyCounterpartyBrief = () => {
    const repTypeLabel =
      REPRESENTATION_OPTIONS.find((o) => o.id === profile.representationType)
        ?.label ?? 'Direct Brand';
    const lines = [
      'COUNTERPARTY PROFILE',
      `Brand Name: ${profile.brandName.trim() || 'Not specified'}`,
      `Representation: ${repTypeLabel}`,
      `Represented By: ${profile.representedBy.trim() || 'Direct (No External Agency)'}`,
      `Negotiation Primary Contact: ${profile.primaryContactName.trim() || 'Not specified'}${
        profile.primaryContactRole.trim()
          ? ` — ${profile.primaryContactRole.trim()}`
          : ''
      }`,
      profile.primaryContactEmail.trim()
        ? `Contact Email: ${profile.primaryContactEmail.trim()}`
        : null,
      profile.dealNotes.trim()
        ? `Negotiation Context: ${profile.dealNotes.trim()}`
        : null,
    ].filter((l): l is string => l !== null);

    onCopyText(lines.join('\n'), 'Brand/Agency Profile summary');
  };

  return (
    <div
      id="brand-agency-profile"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 scroll-mt-24"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Building2
              className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
              aria-hidden="true"
            />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Brand / Agency Profile
            </h3>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
              {filledCoreCount}/3 core fields
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {summaryParts.length > 0
              ? summaryParts.join(' · ')
              : 'Store counterparty details to personalize clause commentary, margin redlines, negotiation emails, and contract exports.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasDetails && (
            <>
              <button
                type="button"
                onClick={handleCopyCounterpartyBrief}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy Profile
              </button>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Clear
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {collapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                Edit Details
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                Collapse
              </>
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Primary Counterparty Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label
                htmlFor="counterparty-brand-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Brand Name
              </label>
              <input
                id="counterparty-brand-name"
                type="text"
                value={profile.brandName}
                onChange={(e) => updateField('brandName', e.target.value)}
                placeholder="e.g., Acme Audio Inc."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label
                htmlFor="counterparty-represented-by"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Represented By (Agency / Counsel)
              </label>
              <input
                id="counterparty-represented-by"
                type="text"
                value={profile.representedBy}
                onChange={(e) => updateField('representedBy', e.target.value)}
                placeholder="e.g., Northstar Media Agency or Direct"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label
                htmlFor="counterparty-primary-contact"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Negotiation Primary Contact
              </label>
              <input
                id="counterparty-primary-contact"
                type="text"
                value={profile.primaryContactName}
                onChange={(e) =>
                  updateField('primaryContactName', e.target.value)
                }
                placeholder="e.g., Jordan Lee"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          </div>

          {/* Secondary Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Counterparty Channel
              </span>
              <div
                role="group"
                aria-label="Counterparty representation type"
                className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                {REPRESENTATION_OPTIONS.map((opt) => {
                  const active = profile.representationType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => updateField('representationType', opt.id)}
                      className={`px-2 py-1.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap truncate ${
                        active
                          ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="counterparty-contact-role"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Primary Contact Title / Role
              </label>
              <input
                id="counterparty-contact-role"
                type="text"
                value={profile.primaryContactRole}
                onChange={(e) =>
                  updateField('primaryContactRole', e.target.value)
                }
                placeholder="e.g., Sr. Creator Partnerships Lead"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label
                htmlFor="counterparty-contact-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Contact Email
              </label>
              <input
                id="counterparty-contact-email"
                type="email"
                value={profile.primaryContactEmail}
                onChange={(e) =>
                  updateField('primaryContactEmail', e.target.value)
                }
                placeholder="e.g., jordan@acmeaudio.com"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          </div>

          {/* Deal Context Note */}
          <div>
            <label
              htmlFor="counterparty-deal-notes"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Negotiation Context &amp; Counterparty Notes
              <span className="font-normal text-slate-500 dark:text-slate-400 ml-1">
                (woven into clause commentary)
              </span>
            </label>
            <input
              id="counterparty-deal-notes"
              type="text"
              value={profile.dealNotes}
              onChange={(e) => updateField('dealNotes', e.target.value)}
              placeholder="e.g., Q4 hardware launch; agency mentioned standard Net-30 AP policy but open to 50% upfront deposit."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
        </div>
      )}
    </div>
  );
};
