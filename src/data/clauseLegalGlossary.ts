export interface LegalTermDefinition {
  term: string;
  plainEnglish: string;
  whyItMatters: string;
}

/**
 * Plain-English legal glossary mapped to each of the 15 contract red-flag clauses.
 * Written specifically to demystify common sponsorship legalese for less experienced creators.
 */
export const CLAUSE_LEGAL_GLOSSARY: Record<number, LegalTermDefinition[]> = {
  1: [
    {
      term: 'Net-14 / Net-30 / Net-60',
      plainEnglish:
        'The number of calendar days a brand has to send your payout after receiving your invoice (e.g., Net-30 means payment is due within 30 days).',
      whyItMatters:
        'Without a fixed invoice trigger date, Net-60 after "campaign completion" can stretch past 4 months.',
    },
    {
      term: 'Deemed Approval',
      plainEnglish:
        'A protective rule stating that if the brand does not send revision notes within a set window (such as 5 business days), your draft is automatically considered approved.',
      whyItMatters:
        'Stops slow internal brand reviews from holding up your invoice indefinitely.',
    },
  ],
  2: [
    {
      term: 'CPA (Cost Per Acquisition)',
      plainEnglish:
        'A payment model where you only earn money when a viewer completes a tracked action like a purchase, sign-up, or app install.',
      whyItMatters:
        'You absorb 100% of filming costs even if the brand’s landing page or pricing fails to convert.',
    },
    {
      term: 'Guaranteed Base Creation Fee',
      plainEnglish:
        'A fixed upfront fee paid strictly for producing and delivering the creative content, completely independent of views or sales.',
      whyItMatters:
        'Ensures your production labor and audience access are compensated regardless of algorithm swings.',
    },
  ],
  3: [
    {
      term: 'Pay-When-Paid Clause',
      plainEnglish:
        'Agency contract wording that lets the agency delay paying you until their end-client pays the agency first.',
      whyItMatters:
        'Transfers the agency’s client credit risk onto you—if the client disputes an invoice, you wait months or never get paid.',
    },
    {
      term: 'Unconditional Payment Obligation',
      plainEnglish:
        'Contract language requiring the company that signed your agreement to pay you on time regardless of any third-party disputes.',
      whyItMatters:
        'Keeps the contracting agency legally accountable to your invoice due date.',
    },
  ],
  4: [
    {
      term: 'Work Made for Hire',
      plainEnglish:
        'A legal classification declaring the brand—not you—the original legal author and permanent copyright owner of everything you film.',
      whyItMatters:
        'Once signed, you lose ownership of your own footage and cannot reuse clips or charge renewal licensing fees.',
    },
    {
      term: 'License vs. Copyright Assignment',
      plainEnglish:
        'A license rents specific usage rights for a set time while you keep ownership; an assignment permanently transfers ownership to the brand.',
      whyItMatters:
        'Renting a license lets you charge fairly for extensions instead of giving away lifetime IP for one flat fee.',
    },
  ],
  5: [
    {
      term: 'Perpetual Usage',
      plainEnglish:
        'Permission for a brand to use your video, photo, voice, or likeness forever ("in perpetuity") with no expiration date or renewal payments.',
      whyItMatters:
        'A brand could run your face in paid ads years later—blocking future sponsorships—without ever paying you again.',
    },
    {
      term: 'All Media Now Known or Hereafter Devised',
      plainEnglish:
        'Catch-all legalese granting the brand rights across billboards, TV, paid social, and even future technologies like AI or new platforms.',
      whyItMatters:
        'Limit usage strictly to named digital channels (e.g., paid social on Meta/TikTok) for a fixed 30–90 day term.',
    },
  ],
  6: [
    {
      term: 'Whitelisting (Dark Posting / Partnership Ads)',
      plainEnglish:
        'Granting a brand advertising access to run paid ads directly through your personal social handle (e.g., TikTok Spark Ads or Meta Partnership Ads).',
      whyItMatters:
        'Ads appear as if you posted them personally, leveraging your reputation—so access must carry an expiration date and separate monthly fee.',
    },
    {
      term: 'Authorization Revocation',
      plainEnglish:
        'Your explicit right to disconnect the brand’s ad account or expire Spark Ad codes the moment the paid licensing window ends.',
      whyItMatters:
        'Prevents forgotten ad campaigns from spending behind your handle months after the contract expires.',
    },
  ],
  7: [
    {
      term: 'Usage Term Commencement',
      plainEnglish:
        'The exact calendar date when the countdown starts on a brand’s paid ad license (e.g., 90 days from Launch Date vs. Signature Date).',
      whyItMatters:
        'Tying the clock to first ad deployment prevents confusion if brand legal review delays campaign launch by weeks.',
    },
    {
      term: 'Right of First Refusal (ROFR)',
      plainEnglish:
        'A clause requiring you to offer the brand first dibs to renew your content or book a future campaign before you can accept a competitor’s offer.',
      whyItMatters:
        'Unpaid ROFR windows can stall competing deals; always keep any renewal option short (e.g., 7 days) or require a paid hold fee.',
    },
  ],
  8: [
    {
      term: 'Category Exclusivity',
      plainEnglish:
        'A restriction barring you from partnering with competing brands during (and sometimes after) a campaign.',
      whyItMatters:
        'Broad wording like "any wellness product" can block most of your income—narrow it to 3 explicitly named direct competitors.',
    },
    {
      term: 'Right of First Refusal (ROFR)',
      plainEnglish:
        'An option embedded alongside exclusivity that forces you to let the current sponsor match or decline competing offers before you sign elsewhere.',
      whyItMatters:
        'Creates hidden, unpaid exclusivity beyond the paid lockout period unless explicitly struck or compensated.',
    },
  ],
  9: [
    {
      term: 'Post-Termination Non-Compete',
      plainEnglish:
        'A restriction that continues banning you from working with competitors even after the sponsorship ends or is cancelled early.',
      whyItMatters:
        'A brand should never restrict your future income once they are no longer paying you an active exclusivity fee.',
    },
    {
      term: 'Survival Clause',
      plainEnglish:
        'Contract wording listing which obligations remain legally binding even after the main agreement expires or is terminated.',
      whyItMatters:
        'Make sure exclusivity and non-compete terms are excluded from the Survival section.',
    },
  ],
  10: [
    {
      term: 'Consolidated Feedback Round',
      plainEnglish:
        'All stakeholders on the brand’s team combining their edit requests into a single list per revision round rather than sending piecemeal changes.',
      whyItMatters:
        'Prevents one revision round from turning into five back-to-back re-edits.',
    },
    {
      term: 'Scope Creep',
      plainEnglish:
        'When a brand asks for extra hooks, reshoots, script rewrites, or new aspect ratios that were never part of the approved creative brief.',
      whyItMatters:
        'Capping included revisions at 2 rounds with a per-round overage rate protects your hourly margin.',
    },
  ],
  11: [
    {
      term: 'Indefinite Post Hosting Mandate',
      plainEnglish:
        'A requirement forcing you to keep a sponsored post publicly visible on your profile forever, forbidding you from ever archiving it.',
      whyItMatters:
        'Commit to a reasonable 12-month (365-day) live window so you retain long-term control over your channel curation.',
    },
    {
      term: 'Organic Feed Distribution',
      plainEnglish:
        'Publishing the deliverable to your own public profile so your followers see it naturally, separate from paid brand ad placements.',
      whyItMatters:
        'Distinguishing organic hosting (12 months) from paid ad rights (30–90 days) keeps both timelines clear and enforceable.',
    },
  ],
  12: [
    {
      term: 'Kill Fee',
      plainEnglish:
        'A non-refundable cancellation percentage (typically 50% after signing, 100% after filming) owed if the brand pulls the plug through no fault of yours.',
      whyItMatters:
        'Compensates you for blocked calendar dates, prep work, and competing sponsorships you turned down.',
    },
    {
      term: 'Termination for Convenience',
      plainEnglish:
        'A clause allowing a brand to cancel the contract at any time simply because their budget or strategy changed—not because you breached.',
      whyItMatters:
        'Always pair "termination for convenience" with an automatic milestone Kill Fee.',
    },
  ],
  13: [
    {
      term: 'Morality Clause',
      plainEnglish:
        'Language allowing termination if a party’s public scandal or misconduct harms the other party’s reputation.',
      whyItMatters:
        'One-sided clauses let brands cancel subjectively; insist on a mutual clause covering brand scandals too.',
    },
    {
      term: 'Fee Clawback',
      plainEnglish:
        'A demand that you refund money you already earned and delivered work for if a brand later invokes a morality or termination clause.',
      whyItMatters:
        'Protect completed deliverables so previously earned fees remain non-refundable.',
    },
  ],
  14: [
    {
      term: 'Indemnification (Hold Harmless)',
      plainEnglish:
        'A promise to pay the other party’s legal defense costs and lawsuit damages if a third party sues over something tied to the campaign.',
      whyItMatters:
        'Without mutual terms, you could be forced to pay corporate legal bills if the brand’s own product harms a customer.',
    },
    {
      term: 'Liability Cap',
      plainEnglish:
        'A hard ceiling limiting the maximum dollar amount you can ever owe under the contract—ideally capped at the total fee paid to you.',
      whyItMatters:
        'Shields your personal savings and business assets from disproportionate corporate lawsuit exposure.',
    },
  ],
  15: [
    {
      term: 'FTC Material Connection',
      plainEnglish:
        'Any financial, free-product, affiliate, or personal relationship between a creator and a brand that could affect how viewers weigh an endorsement.',
      whyItMatters:
        'US federal law requires disclosing paid or gifted partnerships clearly—even if a brand pressures you not to.',
    },
    {
      term: 'Clear & Conspicuous Disclosure',
      plainEnglish:
        'Placing "#ad" or the platform Paid Partnership label prominently above the fold (and audibly/visually in video) where viewers cannot miss it.',
      whyItMatters:
        'Burying "#sp" below "See More" violates FTC Endorsement Guides and carries steep civil penalties.',
    },
  ],
};
