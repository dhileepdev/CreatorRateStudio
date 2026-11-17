import {
  CREATOR_PRESETS,
  EXCLUSIVITY_SPECS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import {
  CreatorProfile,
  DealScope,
  ExclusivityType,
  NicheId,
  PlatformId,
  TurnaroundWindow,
  UsageRightsTerm,
} from '../types/calculator';

export const SHARE_CONFIG_QUERY_PARAM = 'cfg';

interface EncodedSharePayload {
  v: 1;
  profile: CreatorProfile;
  scope: DealScope;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): Uint8Array | null {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function toNonNegativeNumber(val: unknown, fallback: number): number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0
    ? val
    : fallback;
}

export function encodeShareConfig(
  profile: CreatorProfile,
  scope: DealScope
): string {
  const payload: EncodedSharePayload = {
    v: 1,
    profile,
    scope,
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(bytes);
}

export function decodeShareConfig(
  encoded: string
): { profile: CreatorProfile; scope: DealScope } | null {
  if (!encoded || encoded.trim() === '') return null;
  const bytes = fromBase64Url(encoded.trim());
  if (!bytes) return null;

  try {
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<EncodedSharePayload>;
    if (!parsed || typeof parsed !== 'object' || !parsed.profile || !parsed.scope) {
      return null;
    }

    const fallbackProfile = CREATOR_PRESETS[0].profile;
    const fallbackScope = CREATOR_PRESETS[0].scope;
    const rawProfile = parsed.profile as Partial<CreatorProfile>;
    const rawScope = parsed.scope as Partial<DealScope>;

    const platform: PlatformId =
      typeof rawProfile.platform === 'string' && rawProfile.platform in PLATFORM_SPECS
        ? (rawProfile.platform as PlatformId)
        : fallbackProfile.platform;

    const niche: NicheId =
      typeof rawProfile.niche === 'string' && rawProfile.niche in NICHE_BENCHMARKS
        ? (rawProfile.niche as NicheId)
        : fallbackProfile.niche;

    const rawEngagement = (rawProfile.engagementMetrics ?? {}) as Partial<
      CreatorProfile['engagementMetrics']
    >;

    const sanitizedProfile: CreatorProfile = {
      platform,
      youtubeMultiplier: Math.min(
        6,
        Math.max(
          4,
          toNonNegativeNumber(
            rawProfile.youtubeMultiplier,
            fallbackProfile.youtubeMultiplier
          )
        )
      ),
      niche,
      customCpm:
        typeof rawProfile.customCpm === 'number' &&
        Number.isFinite(rawProfile.customCpm) &&
        rawProfile.customCpm > 0
          ? rawProfile.customCpm
          : null,
      followerCount: toNonNegativeNumber(
        rawProfile.followerCount,
        fallbackProfile.followerCount
      ),
      medianViews: toNonNegativeNumber(
        rawProfile.medianViews,
        fallbackProfile.medianViews
      ),
      engagementMetrics: {
        comments: toNonNegativeNumber(
          rawEngagement.comments,
          fallbackProfile.engagementMetrics.comments
        ),
        shares: toNonNegativeNumber(
          rawEngagement.shares,
          fallbackProfile.engagementMetrics.shares
        ),
        saves: toNonNegativeNumber(
          rawEngagement.saves,
          fallbackProfile.engagementMetrics.saves
        ),
      },
      productionFloorCost: toNonNegativeNumber(
        rawProfile.productionFloorCost,
        fallbackProfile.productionFloorCost
      ),
    };

    const usageRightsTerm: UsageRightsTerm =
      typeof rawScope.usageRightsTerm === 'string' &&
      rawScope.usageRightsTerm in USAGE_RIGHTS_SPECS
        ? (rawScope.usageRightsTerm as UsageRightsTerm)
        : fallbackScope.usageRightsTerm;

    const exclusivityType: ExclusivityType =
      typeof rawScope.exclusivityType === 'string' &&
      rawScope.exclusivityType in EXCLUSIVITY_SPECS
        ? (rawScope.exclusivityType as ExclusivityType)
        : fallbackScope.exclusivityType;

    const turnaroundWindow: TurnaroundWindow =
      rawScope.turnaroundWindow === 'rush_under_5d' ||
      rawScope.turnaroundWindow === 'standard_14d'
        ? rawScope.turnaroundWindow
        : fallbackScope.turnaroundWindow;

    const sanitizedScope: DealScope = {
      usageRightsTerm,
      whitelistingEnabled: Boolean(rawScope.whitelistingEnabled),
      whitelistingAdSpendEstimate: toNonNegativeNumber(
        rawScope.whitelistingAdSpendEstimate,
        fallbackScope.whitelistingAdSpendEstimate
      ),
      whitelistingExpirationDays: Math.min(
        365,
        Math.max(
          7,
          toNonNegativeNumber(
            rawScope.whitelistingExpirationDays,
            fallbackScope.whitelistingExpirationDays
          )
        )
      ),
      exclusivityType,
      turnaroundWindow,
      includedRevisionRounds: Math.min(
        10,
        Math.max(
          1,
          Math.round(
            toNonNegativeNumber(
              rawScope.includedRevisionRounds,
              fallbackScope.includedRevisionRounds
            )
          )
        )
      ),
      excessRevisionFeePerRound: Math.max(
        150,
        toNonNegativeNumber(
          rawScope.excessRevisionFeePerRound,
          fallbackScope.excessRevisionFeePerRound
        )
      ),
    };

    return { profile: sanitizedProfile, scope: sanitizedScope };
  } catch {
    return null;
  }
}

export function buildShareConfigUrl(
  profile: CreatorProfile,
  scope: DealScope,
  baseHref: string = window.location.href
): string {
  const url = new URL(baseHref);
  url.searchParams.set(SHARE_CONFIG_QUERY_PARAM, encodeShareConfig(profile, scope));
  return url.toString();
}

export function readSharedConfigFromLocation(
  search: string = window.location.search
): { profile: CreatorProfile; scope: DealScope } | null {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get(SHARE_CONFIG_QUERY_PARAM);
    if (!raw) return null;
    return decodeShareConfig(raw);
  } catch {
    return null;
  }
}
