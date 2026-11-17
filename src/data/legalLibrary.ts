import { LegalLibraryEntry } from '../types/calculator';

export const LEGAL_LIBRARY_ENTRIES: LegalLibraryEntry[] = [
  {
    id: 'indemnification',
    term: 'Indemnification',
    aliases: ['Hold Harmless', 'Liability Cap', 'Third-Party Claims', 'Defense & Indemnity', 'Legal Liability'],
    category: 'Liability & Scope',
    relatedClauseId: 14,
    standardDefinition:
      'A contractual obligation requiring one party to compensate, defend, and hold the other party harmless from losses, lawsuits, or damages arising out of specific acts, omissions, or claims by third parties.',
    balancedStandard:
      'Mutual indemnification where each party covers claims caused by its own negligence or breach—and Brand indemnifies Creator for product defects and Brand-approved claims—with Creator’s total liability strictly capped at fees actually paid under the agreement.',
  },
  {
    id: 'termination-for-convenience',
    term: 'Termination for Convenience',
    aliases: ['Kill Fee', 'Cancellation Clause', 'Early Termination', 'At-Will Cancellation', 'Campaign Pause'],
    category: 'Payment',
    relatedClauseId: 12,
    standardDefinition:
      'A clause permitting a contracting party (typically the Brand or Agency) to cancel the campaign without cause or breach prior to completion, usually upon written notice.',
    balancedStandard:
      'If a Brand cancels without Creator fault after booking or production begins, a tiered Kill Fee applies: 50% of total fees upon contract execution and 100% once drafts or filming deliverables are submitted.',
  },
  {
    id: 'work-made-for-hire',
    term: 'Work Made for Hire (IP Assignment)',
    aliases: ['Copyright Transfer', 'IP Stripping', 'Full Ownership', 'Raw Footage', 'Intellectual Property'],
    category: 'Rights & IP',
    relatedClauseId: 4,
    standardDefinition:
      'A copyright doctrine under which the hiring party is legally treated as the original author and sole owner of the creative work, transferring all copyright, raw files, and derivative rights away from the Creator.',
    balancedStandard:
      'Creator retains 100% copyright ownership of all deliverables and raw footage, granting the Brand a time-limited, non-exclusive commercial license strictly tied to the paid Scope Schedule.',
  },
  {
    id: 'perpetual-usage-rights',
    term: 'Usage Rights in Perpetuity',
    aliases: ['Perpetual Buyout', 'Forever Rights', 'Irrevocable License', 'Paid Ad Usage', 'All Media Now Known'],
    category: 'Rights & IP',
    relatedClauseId: 5,
    standardDefinition:
      'An open-ended intellectual property license allowing a Brand to publish, repurpose, and run paid advertisements featuring the Creator’s likeness, voice, and content indefinitely without renewal fees.',
    balancedStandard:
      'Paid digital advertising licenses are fixed to 30, 90, or 180 days from first live ad deployment (priced at 25%–85% of Base Fee), or priced as a true Perpetual Buyout carrying a mandatory 350% surcharge.',
  },
  {
    id: 'net-payment-terms',
    term: 'Net Payment Terms & Approval Triggers',
    aliases: ['Net-30', 'Net-60', 'Net-90', 'Invoice Timing', 'Final Approval', 'Freelance Isnt Free'],
    category: 'Payment',
    relatedClauseId: 1,
    standardDefinition:
      'The contractual timeline specifying when an invoice becomes due (e.g., Net-14 or Net-30) and the milestone event that starts the payment clock.',
    balancedStandard:
      'Payment due Net-14 or Net-30 from deliverable submission (or 50% upfront / 50% on delivery), paired with a 5-business-day deemed-approval window so Brand review delays cannot stall payout.',
  },
  {
    id: 'pay-when-paid',
    term: 'Pay-When-Paid Contingency',
    aliases: ['Agency Escrow', 'End-Client Payment', 'Conditional Payout', 'Third-Party Credit Risk'],
    category: 'Payment',
    relatedClauseId: 3,
    standardDefinition:
      'An intermediary clause inserted by talent or marketing agencies stating that the agency is only obligated to pay the Creator after the agency collects funds from its End-Client.',
    balancedStandard:
      'The contracting Agency bears direct, unconditional responsibility for paying the Creator by the agreed due date regardless of when or whether the End-Client settles its master invoice.',
  },
  {
    id: 'performance-contingency',
    term: 'Performance-Only Contingency',
    aliases: ['Affiliate Only', 'CPA Model', 'Commission Only', 'Guaranteed Views', 'ROAS Contingency'],
    category: 'Payment',
    relatedClauseId: 2,
    standardDefinition:
      'A compensation structure that ties creator fees wholly or partially to downstream metrics—such as impressions, clicks, affiliate conversions, or sales—rather than creative production.',
    balancedStandard:
      'A guaranteed Base Creation Fee compensates production labor and audience access upon publication, with affiliate commissions or view-tier bonuses layered strictly on top as additive upside.',
  },
  {
    id: 'category-exclusivity',
    term: 'Category Exclusivity',
    aliases: ['Blanket Exclusivity', 'Competitive Lockout', 'Vertical Prohibition', 'Named Competitors'],
    category: 'Exclusivity',
    relatedClauseId: 8,
    standardDefinition:
      'A restriction preventing the Creator from endorsing or creating sponsored content for competing products or services during a defined commercial window.',
    balancedStandard:
      'Exclusivity is restricted to 3 explicitly named direct competitors for 30–60 days (priced at +30% to +60% of Base Fee), rather than a broad industry-wide blackout.',
  },
  {
    id: 'post-termination-non-compete',
    term: 'Post-Termination Non-Compete',
    aliases: ['Survival Clause', 'Post-Term Lockout', 'Tail Exclusivity', 'Expiration Survival'],
    category: 'Exclusivity',
    relatedClauseId: 9,
    standardDefinition:
      'A survival provision extending non-compete or category exclusivity obligations beyond the expiration or early cancellation of the sponsorship agreement.',
    balancedStandard:
      'All exclusivity restrictions expire immediately at the end of the paid Exclusivity Period or upon any early termination without Creator fault unless separately compensated via an ongoing retainer.',
  },
  {
    id: 'whitelisting-dark-posting',
    term: 'Whitelisting & Partnership Ads',
    aliases: ['Spark Ads', 'Allowlisting', 'Handle Access', 'Dark Posting', 'Meta Partnership Ads'],
    category: 'Rights & IP',
    relatedClauseId: 6,
    standardDefinition:
      'Granting a Brand advertising permissions to run paid social campaigns directly through the Creator’s handle (e.g., Meta Partnership Ads or TikTok Spark Ads) to target lookalike audiences.',
    balancedStandard:
      'Whitelisting includes a hard expiration date for ad-account revocation and separate monthly compensation equal to 20% of Base Fee or 15% of monthly ad spend (whichever is greater).',
  },
  {
    id: 'usage-clock-commencement',
    term: 'Usage Term Commencement',
    aliases: ['License Start Date', 'Premature Usage Clock', 'Launch Date', 'Effective Date'],
    category: 'Rights & IP',
    relatedClauseId: 7,
    standardDefinition:
      'The trigger date on which a time-bounded paid usage license begins counting down (for example, 30 or 90 days of paid media rights).',
    balancedStandard:
      'The Usage Term starts on the actual Launch Date (when the asset is first published or deployed in paid ads), avoiding ambiguity from multi-week pre-launch legal review cycles.',
  },
  {
    id: 'unlimited-revisions',
    term: 'Revision Scope & Reshoots',
    aliases: ['Unlimited Revisions', 'Until Satisfied', 'Scope Creep', 'Feedback Rounds', 'Reshoot Fee'],
    category: 'Liability & Scope',
    relatedClauseId: 10,
    standardDefinition:
      'Provisions governing how many rounds of edits or creative adjustments a Brand may request on submitted drafts before final sign-off.',
    balancedStandard:
      'Base fees include up to 2 rounds of consolidated, non-substantive edits aligned with the approved creative brief; extra rounds or out-of-scope reshoots incur a pre-agreed per-round fee.',
  },
  {
    id: 'morality-clause',
    term: 'Morality & Reputational Harm Clause',
    aliases: ['Clawback', 'Public Disrepute', 'Moral Turpitude', 'Reputation Termination'],
    category: 'Liability & Scope',
    relatedClauseId: 13,
    standardDefinition:
      'A termination and fee-recovery provision allowing a party to exit the agreement if the counterparty engages in behavior causing public scandal or reputational damage.',
    balancedStandard:
      'Mutually binding on both Brand and Creator, strictly tied to verified unlawful conduct or material public misconduct—never subjective Brand discretion—with earned fees preserved for delivered work.',
  },
  {
    id: 'indefinite-post-hosting',
    term: 'Feed Hosting & Archiving Mandate',
    aliases: ['Keep Post Live', 'Indefinite Hosting', 'Archive Rights', 'Deletion Penalty'],
    category: 'Rights & IP',
    relatedClauseId: 11,
    standardDefinition:
      'A requirement obligating the Creator to leave the sponsored post publicly visible on their primary social feed for a minimum duration.',
    balancedStandard:
      'Creator commits to keeping the organic post live and public for 12 months (365 days), retaining the right to archive after that period without fee clawbacks.',
  },
  {
    id: 'ftc-endorsement-disclosure',
    term: 'FTC Material Connection Disclosure',
    aliases: ['FTC Guides', '#ad', 'Paid Partnership Label', 'Disclosure Suppression', '16 CFR Part 255'],
    category: 'Liability & Scope',
    relatedClauseId: 15,
    standardDefinition:
      'Regulatory compliance requirements under the FTC Endorsement Guides (16 CFR Part 255) mandating clear, conspicuous disclosure of paid sponsorships or gifted material connections.',
    balancedStandard:
      'Both Brand and Creator commit to unambiguous above-the-fold disclosures (#ad, platform Paid Partnership tags, and audible/visual video callouts) that cannot be waived by contract.',
  },
];

export const FEATURED_LEGAL_SEARCH_TERMS: string[] = [
  'Indemnification',
  'Termination for Convenience',
  'Work Made for Hire',
  'Perpetual Usage',
  'Pay-When-Paid',
  'Exclusivity',
];
