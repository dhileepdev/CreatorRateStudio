import { CONTRACT_RED_FLAGS } from './benchmarks';

export type ClauseVariantPosture =
  | 'standard'
  | 'creator_friendly'
  | 'balanced_compromise';

export interface ClauseLibraryVariant {
  id: string;
  posture: ClauseVariantPosture;
  label: string;
  bestFor: string;
  clauseText: string;
}

const CUSTOM_ALTERNATIVES: Record<number, Omit<ClauseLibraryVariant, 'id'>[]> = {
  1: [
    {
      posture: 'creator_friendly',
      label: 'Creator-Friendly 50% Deposit + Net-14',
      bestFor: 'New brand partners or agencies with slow AP departments.',
      clauseText:
        'Brand shall remit a non-refundable 50% production deposit upon execution of this Agreement prior to commencement of work, with the remaining 50% payable within fourteen (14) calendar days of Creator’s delivery of the agreed Deliverables. Deliverables not rejected with specific brief-based notes within three (3) business days are deemed approved. Overdue balances accrue 1.5% monthly interest and suspend all usage licenses until paid in full.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Enterprise Net-30 w/ Auto-Approval',
      bestFor: 'Fortune 500 procurement teams bound by mandatory Net-30 cycles.',
      clauseText:
        'Brand shall remit 100% of the Total Fee within thirty (30) calendar days of Creator’s invoice issued upon submission of the initial Deliverables. Brand has five (5) business days from submission to request brief-aligned revisions, after which Deliverables are deemed approved and payment timing cannot be delayed by internal campaign scheduling.',
    },
  ],
  2: [
    {
      posture: 'creator_friendly',
      label: '100% Guaranteed Flat Fee + Optional Bonus',
      bestFor: 'Protecting studio overhead regardless of algorithm reach.',
      clauseText:
        'All fees under this Agreement represent guaranteed fixed compensation for Creator’s creative services, production costs, and audience access, and are fully earned upon Deliverable submission irrespective of impressions, engagement, click-through rate, or sales conversions. Any affiliate commission or performance bonus is strictly additive and may never offset or reduce the guaranteed Base Creation Fee.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Guaranteed Base + Tiered Performance Upside',
      bestFor: 'Performance-driven DTC brands asking for skin in the game.',
      clauseText:
        'Brand shall pay Creator the guaranteed Base Creation Fee in full upon Deliverable delivery, independent of campaign metrics. In addition, if tracked referral sales exceed the agreed baseline within 30 days of launch, Brand shall pay Creator an additive performance bonus equal to 10% of net attributed revenue.',
    },
  ],
  3: [
    {
      posture: 'creator_friendly',
      label: 'Strict Agency Direct Liability',
      bestFor: 'Preventing agency-to-client collection delays.',
      clauseText:
        'Agency contracts as principal and assumes unconditional, direct financial liability for all payments due to Creator on the agreed due dates. Under no circumstances shall payment to Creator be conditioned upon, delayed by, or reduced due to Agency’s receipt of funds from any End-Client or media buyer.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Direct Liability w/ 7-Day Cure Window',
      bestFor: 'Established agencies requiring a brief accounting grace period.',
      clauseText:
        'Agency’s obligation to pay Creator is independent of End-Client remittance. If Agency has not received End-Client funds by the invoice due date, Agency shall nevertheless remit full payment directly to Creator within seven (7) calendar days of the original due date.',
    },
  ],
  4: [
    {
      posture: 'creator_friendly',
      label: 'Creator-Friendly IP Retention & Portfolio License',
      bestFor: 'Keeping full copyright, raw files, and AI-training protection.',
      clauseText:
        'Creator retains sole and exclusive worldwide copyright, moral rights, and ownership of all Deliverables, raw footage, project files, and underlying intellectual property; nothing herein constitutes a "work made for hire." Upon receipt of full payment, Creator grants Brand solely a limited, revocable, non-exclusive, non-transferable license for the explicit Term, Territory, and Channels in the Scope Schedule. No raw files or AI/machine-learning training rights are granted.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Creator IP Retention w/ Brand Asset Co-Ownership',
      bestFor: 'Brands sensitive about trademarked product imagery inside videos.',
      clauseText:
        'Brand retains all rights to its pre-existing trademarks and product materials, while Creator retains sole copyright ownership of the Deliverables and underlying footage. Subject to full payment, Creator grants Brand a non-exclusive license to distribute the finished Deliverables strictly within the agreed Term and Channels, excluding raw footage and derivative editing without consent.',
    },
  ],
  5: [
    {
      posture: 'creator_friendly',
      label: 'Strict 30-Day Paid License (Zero Perpetuity)',
      bestFor: 'Maximizing recurring licensing revenue on high-performing ads.',
      clauseText:
        'Paid commercial advertising rights are granted strictly for thirty (30) calendar days from first ad deployment and expire automatically thereafter. No perpetual or worldwide all-media rights are granted. Any extension requires Creator’s prior written consent and prepayment of a renewal fee equal to 30% of the Base Creation Fee per additional 30-day period.',
    },
    {
      posture: 'balanced_compromise',
      label: '90-Day Paid License + Pre-Priced Renewal Option',
      bestFor: 'Growth teams that want predictable renewal rates locked upfront.',
      clauseText:
        'Paid digital social advertising rights are granted for ninety (90) calendar days from Launch Date across agreed social platforms. Brand holds an option to renew paid usage in additional 90-day increments at 50% of the Base Creation Fee per quarter, payable prior to each renewal period. Organic brand reposting on Brand’s owned social feed is permitted for twelve (12) months.',
    },
  ],
  6: [
    {
      posture: 'creator_friendly',
      label: 'Time-Capped Whitelisting + Ad-Spend Escalator',
      bestFor: 'High-spend Meta/TikTok campaigns running through your handle.',
      clauseText:
        'Whitelisting / Partnership Ad permissions (TikTok Spark Ads / Meta Partnership Ads) are limited to thirty (30) days ending on the specified Expiration Date, at which time Creator may revoke ad-account access automatically without notice. Whitelisting is billed separately at the greater of 25% of Base Fee per 30 days or 15% of monthly media spend, and Brand may not alter captions or run ads targeting excluded categories without Creator approval.',
    },
    {
      posture: 'balanced_compromise',
      label: '90-Day Whitelisting w/ Spend Cap & Copy Approval',
      bestFor: 'Performance teams running 1-quarter Spark or Partnership tests.',
      clauseText:
        'Creator grants Brand whitelisting authorization for ninety (90) days from Launch Date, capped at $25,000 in total media spend unless an extension fee is agreed in writing. Brand shall obtain Creator’s written approval on any ad copy or CTA overlays prior to launch, and access terminates automatically upon Term expiration.',
    },
  ],
  7: [
    {
      posture: 'creator_friendly',
      label: 'Launch-Date Clock w/ 30-Day Deployment Window',
      bestFor: 'Preventing brands from shelving your video for months before running ads.',
      clauseText:
        'The Paid Usage Term commences on the earlier of: (a) the date Deliverables are first deployed in paid media, or (b) thirty (30) calendar days following Creator’s final Deliverable submission. Upon expiration of the Usage Term, all paid ads must be paused immediately unless renewed in writing.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Launch-Date Clock w/ 60-Day Grace Window',
      bestFor: 'Seasonal retail campaigns planned 4–6 weeks ahead of launch.',
      clauseText:
        'The Paid Usage Term begins on the actual commercial Launch Date of the paid media campaign, provided Launch occurs within sixty (60) days of final Deliverable approval. Brand shall notify Creator in writing of the Launch Date so both parties can track expiration accurately.',
    },
  ],
  8: [
    {
      posture: 'creator_friendly',
      label: 'Strict 30-Day Named 3-Competitor Lock',
      bestFor: 'Protecting your primary sponsorship vertical while satisfying the brand.',
      clauseText:
        'Exclusivity applies strictly for thirty (30) calendar days following organic publication and is limited solely to paid sponsored posts for up to three (3) explicitly named direct competitors: [Competitor 1], [Competitor 2], and [Competitor 3]. Organic editorial mentions, pre-existing partnerships, affiliate links, and all other brands remain completely unrestricted.',
    },
    {
      posture: 'balanced_compromise',
      label: '60-Day Narrow Product-Line Exclusivity',
      bestFor: 'Category sponsors willing to pay a 60% exclusivity rider.',
      clauseText:
        'For sixty (60) days following publication, Creator shall not publish new paid brand integrations directly promoting competing [Specific Product Category, e.g., Vitamin C Serums] from the following named brands: [Competitor 1–5]. Adjacent lifestyle categories and previously contracted commitments remain unaffected.',
    },
  ],
  9: [
    {
      posture: 'creator_friendly',
      label: 'Zero Post-Termination Restriction',
      bestFor: 'Eliminating unpaid lockouts after cancellation or campaign completion.',
      clauseText:
        'All exclusivity and category restrictions expire automatically and immediately upon the end of the paid Exclusivity Period or upon any early termination of this Agreement. No non-compete or Right of First Refusal survives termination unless Brand pays a separate monthly exclusivity retainer.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Immediate Release + 7-Day Renewal Courtesy Notice',
      bestFor: 'Maintaining goodwill with repeat anchor sponsors.',
      clauseText:
        'Exclusivity terminates upon expiration of the paid Exclusivity Period or early cancellation. For seven (7) days prior to expiration, Brand may elect in writing to extend exclusivity at the agreed monthly retainer rate; if unexercised, Creator is immediately free of all restrictions.',
    },
  ],
  10: [
    {
      posture: 'creator_friendly',
      label: 'Strict 2-Round Edit Cap + Reshoot Exclusion',
      bestFor: 'Eliminating unpaid scope creep and subjective re-filming demands.',
      clauseText:
        'The Base Creation Fee includes up to two (2) rounds of consolidated, minor editorial edits (such as captions, text overlays, or audio trims) within the approved creative brief. Any revision beyond two rounds is billed at $250 per round. Full or partial reshoots—except where Creator deviated materially from the approved written brief—require a separate reshoot fee equal to 50% of the Base Creation Fee.',
    },
    {
      posture: 'balanced_compromise',
      label: '2 Consolidated Rounds + 1 Factual Compliance Pass',
      bestFor: 'Regulated FinTech, health, or legal-reviewed brand integrations.',
      clauseText:
        'Creator shall provide up to two (2) rounds of consolidated creative revisions plus one (1) mandatory factual/legal compliance adjustment strictly to satisfy regulatory requirements. Any additional creative edits or out-of-brief changes shall be billed at $200 per round.',
    },
  ],
  11: [
    {
      posture: 'creator_friendly',
      label: '90-Day Guaranteed Hosting Window',
      bestFor: 'Creators who actively curate or archive seasonal feed posts.',
      clauseText:
        'Creator agrees to keep the organic Deliverable publicly visible on Creator’s primary channel for a minimum of ninety (90) calendar days following initial publication. Thereafter, Creator retains full discretion to archive or reorganize their feed without penalty or fee clawback.',
    },
    {
      posture: 'balanced_compromise',
      label: '12-Month Hosting w/ Platform-Change Exception',
      bestFor: 'Standard YouTube, TikTok, and Instagram brand campaigns.',
      clauseText:
        'Creator shall keep the sponsored Deliverable live and publicly visible for twelve (12) months from publication, excluding third-party platform removals, music-licensing changes, or account-policy updates outside Creator’s control. After 12 months, Creator may archive the post freely.',
    },
  ],
  12: [
    {
      posture: 'creator_friendly',
      label: 'Creator-Friendly 50% / 100% Milestone Kill Fee',
      bestFor: 'Full protection against sudden budget freezes or strategy pivots.',
      clauseText:
        'If Brand cancels or postpones this campaign for convenience after Agreement execution, Brand shall pay a non-refundable Kill Fee within fourteen (14) days: 50% of the Total Deal Value if cancelled during Pre-Production prior to filming, and 100% of the Total Deal Value if cancelled once filming commences or any draft is submitted. Upon cancellation, all unpaid commercial usage rights immediately revert to Creator.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Tiered 25% / 50% / 100% Kill Fee Schedule',
      bestFor: 'Agency agreements requesting a lower early pre-production tier.',
      clauseText:
        'If Brand terminates for convenience without Creator breach, Brand shall remit a Kill Fee equal to: 25% of the Total Fee if cancelled within 48 hours of signing prior to concepting; 50% after concept/script approval; and 100% once filming or Deliverable submission has occurred, payable Net-14.',
    },
  ],
  13: [
    {
      posture: 'creator_friendly',
      label: 'Mutual Morality Clause (Objective Felony Standard)',
      bestFor: 'Protecting earned fees from vague or partisan brand cancellations.',
      clauseText:
        'Morality termination rights are strictly mutual and may be invoked only if the other party is convicted of a felony or commits verified public fraud causing documented material harm. Termination operates prospectively only—Creator retains 100% of fees earned for Deliverables already produced or published, with zero fee clawback.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Mutual Morality Clause w/ 5-Day Consultation',
      bestFor: 'Consumer brands with formal PR compliance teams.',
      clauseText:
        'Either party may terminate prospectively if the other party engages in verified illegal conduct or major public scandal that materially impairs the campaign, following a five (5) business day good-faith consultation window. Previously earned fees for delivered work remain non-refundable.',
    },
  ],
  14: [
    {
      posture: 'creator_friendly',
      label: 'Creator-Friendly Indemnity (Mutual + 1× Fee Cap)',
      bestFor: 'Shielding personal assets from brand product defects and lawsuits.',
      clauseText:
        'Brand shall defend, indemnify, and hold Creator harmless from any third-party claims, regulatory actions, or legal fees arising from Brand’s products, services, claims, or Brand-supplied scripts/assets. Creator’s indemnification is limited strictly to Creator’s own knowing copyright infringement or uncured material breach. Neither party is liable for consequential or indirect damages, and Creator’s maximum aggregate liability under this Agreement shall never exceed the total fees actually paid to Creator.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Mutual Indemnity w/ 2× Fee Cap & Insurance Carve-Out',
      bestFor: 'Enterprise legal departments requiring a higher negotiated ceiling.',
      clauseText:
        'Each party shall mutually indemnify the other for third-party claims directly caused by its own gross negligence, willful misconduct, or breach of intellectual property warranties, with Brand fully indemnifying Creator for all product-liability and brand-claim disputes. Creator’s aggregate liability shall not exceed two times (2×) the total fees actually paid under this Agreement.',
    },
  ],
  15: [
    {
      posture: 'creator_friendly',
      label: 'Strict FTC Compliance & Creator Disclosure Control',
      bestFor: 'Eliminating federal civil penalty risk up to $53,088 per post.',
      clauseText:
        'Both parties shall strictly comply with the FTC Endorsement Guides (16 CFR Part 255) and equivalent international advertising regulations. Creator retains unilateral authority to place clear, unambiguous disclosures ("#ad", "Paid Partnership", and audible/visual video callouts) above the fold. Brand may never request removal, suppression, or softening of legally required sponsorship disclosures.',
    },
    {
      posture: 'balanced_compromise',
      label: 'Joint FTC Compliance w/ Pre-Approved Disclosure Format',
      bestFor: 'Brands that prefer consistent disclosure phrasing across creator rosters.',
      clauseText:
        'Creator and Brand agree to comply with FTC Endorsement Guides (16 CFR Part 255) using mutually approved, unmistakable disclosures (such as "Paid partnership with [Brand]" and "#ad" at the start of captions and on-screen in video) that remain visible without clicking "More."',
    },
  ],
};

export function getClauseLibraryVariants(clauseId: number): ClauseLibraryVariant[] {
  const baseClause = CONTRACT_RED_FLAGS.find((c) => c.clauseId === clauseId);
  const standardVariant: ClauseLibraryVariant = {
    id: 'standard',
    posture: 'standard',
    label: 'Standard Benchmark',
    bestFor: 'Balanced industry-standard replacement clause from the 15-clause audit.',
    clauseText: baseClause?.replacementText ?? '',
  };

  const extra = (CUSTOM_ALTERNATIVES[clauseId] ?? []).map((alt, idx) => ({
    ...alt,
    id: `${alt.posture}_${idx}`,
  }));

  return [standardVariant, ...extra];
}

export function resolveClauseVariant(
  clauseId: number,
  variantId?: string
): ClauseLibraryVariant {
  const variants = getClauseLibraryVariants(clauseId);
  if (!variantId) return variants[0];
  return variants.find((v) => v.id === variantId) ?? variants[0];
}
