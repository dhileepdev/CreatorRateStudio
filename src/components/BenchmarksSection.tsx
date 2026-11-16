import React from 'react';
import { INDUSTRY_TIER_BENCHMARKS, NICHE_BENCHMARKS } from '../data/benchmarks';
import { CalculatedDealResult, CreatorProfile } from '../types/calculator';
import { formatCurrency } from '../utils/pricingEngine';

interface BenchmarksSectionProps {
  profile: CreatorProfile;
  result: CalculatedDealResult;
}

export const BenchmarksSection: React.FC<BenchmarksSectionProps> = ({
  profile,
  result,
}) => {
  return (
    <section id="benchmarks" className="space-y-6 scroll-mt-24">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900">
          2026 Industry Sponsorship Benchmarks & CPM Reference
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Cross-reference your median-view Base Creation Fee against published 2026 CreatiCalc, InfluenceFlow, and Gigapay benchmarks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Follower Tier Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Average Organic Sponsorship Rates by Follower Tier
            </h3>
            <span className="text-xs text-slate-500">
              Your Tier: <strong className="text-blue-700">{result.followerTier.label}</strong>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">Tier</th>
                  <th className="py-2.5 px-4 font-semibold">Followers</th>
                  <th className="py-2.5 px-4 font-semibold text-right">IG Reel</th>
                  <th className="py-2.5 px-4 font-semibold text-right">TikTok</th>
                  <th className="py-2.5 px-4 font-semibold text-right">YT Long-Form</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Typical ER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {INDUSTRY_TIER_BENCHMARKS.map((row) => {
                  const isCurrent = row.id === result.followerTier.id;
                  return (
                    <tr
                      key={row.id}
                      className={
                        isCurrent
                          ? 'bg-blue-50/60 font-medium text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50/60'
                      }
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {row.tierName}
                        {isCurrent && (
                          <span className="ml-1.5 text-[11px] text-blue-700 font-semibold">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {row.followerRange}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right">
                        {row.instagramReel}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right">
                        {row.tiktokVideo}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right">
                        {row.youtubeLongForm}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right text-slate-600">
                        {row.typicalER}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Niche CPM Table */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              2026 Verified Niche Sponsorship CPMs
            </h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {Object.values(NICHE_BENCHMARKS).map((niche) => {
              const isCurrent = niche.id === profile.niche;
              return (
                <div
                  key={niche.id}
                  className={`px-4 py-3 flex items-center justify-between gap-4 ${
                    isCurrent ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {niche.label}
                      {isCurrent && (
                        <span className="ml-1.5 text-[11px] text-blue-700">
                          (Active)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Default benchmark: {formatCurrency(niche.defaultCpm)} / 1K views
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 shrink-0">
                    ${niche.cpmMin} – ${niche.cpmMax}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
