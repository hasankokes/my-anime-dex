import type { CustomPalette } from '../context/ThemeContext';

/**
 * Premium personalization items. The catalog lives in the Supabase `cosmetics` table so new
 * themes / frames / banners / name colors ship without an app update.
 */

export type CosmeticType = 'theme' | 'frame' | 'banner' | 'name_color';

export interface CosmeticItem {
    id: string;
    type: CosmeticType;
    name: Record<string, string>;
    payload: Record<string, any>;
    premium: boolean;
    sort: number;
}

/** profiles.cosmetics: the user's pick per slot (cosmetic ids) */
export interface CosmeticSelection {
    theme?: string | null;
    frame?: string | null;
    banner?: string | null;
    name_color?: string | null;
}

export interface Top10Entry {
    anime_id: string;
    title: string;
    image: string | null;
}

export const TOP10_MAX = 10;

/**
 * Optional frame motion from the cosmetic payload: `{ "animation": { "type": "rotate", "duration_ms": 4000 } }`.
 * Older app versions ignore the field and show the frame static.
 */
export type FrameAnimationType = 'rotate' | 'pulse' | 'shimmer';
export interface FrameAnimation {
    type: FrameAnimationType;
    durationMs: number;
}

const FRAME_ANIMATIONS: FrameAnimationType[] = ['rotate', 'pulse', 'shimmer'];
const DEFAULT_DURATION: Record<FrameAnimationType, number> = { rotate: 4000, pulse: 1600, shimmer: 2400 };

export const parseFrameAnimation = (value: unknown): FrameAnimation | null => {
    if (!value || typeof value !== 'object') return null;
    const { type, duration_ms } = value as { type?: unknown; duration_ms?: unknown };
    if (!FRAME_ANIMATIONS.includes(type as FrameAnimationType)) return null;
    const t = type as FrameAnimationType;
    const ms = typeof duration_ms === 'number' && Number.isFinite(duration_ms) ? duration_ms : DEFAULT_DURATION[t];
    return { type: t, durationMs: Math.min(20000, Math.max(800, ms)) };
};

/**
 * Optional vector art over a banner gradient: `{ "pattern": "sakura", "pattern_color": "#FFFFFF", "pattern_opacity": 0.6 }`.
 * Older app versions ignore it and show the plain gradient.
 */
export type BannerPatternType = 'speedlines' | 'halftone' | 'sakura' | 'stars' | 'seigaiha' | 'synthwave' | 'shine';
export interface BannerPattern {
    type: BannerPatternType;
    color: string;
    opacity: number;
}

const BANNER_PATTERNS: BannerPatternType[] = ['speedlines', 'halftone', 'sakura', 'stars', 'seigaiha', 'synthwave', 'shine'];

export const parseBannerPattern = (payload: Record<string, any> | undefined): BannerPattern | null => {
    const type = payload?.pattern;
    if (!BANNER_PATTERNS.includes(type)) return null;
    const color = typeof payload?.pattern_color === 'string' && HEX.test(payload.pattern_color) ? payload.pattern_color : '#FFFFFF';
    const raw = payload?.pattern_opacity;
    const opacity = typeof raw === 'number' && Number.isFinite(raw) ? Math.min(1, Math.max(0.05, raw)) : 0.35;
    return { type, color, opacity };
};

/** What a profile renders: resolved from the owner's selection, only while they are premium. */
export interface ProfileDecor {
    frameColors: string[] | null;
    frameAnimation: FrameAnimation | null;
    bannerColors: string[] | null;
    bannerPattern: BannerPattern | null;
    bannerImage: string | null;
    nameColor: string | null;
    showBadge: boolean;
}

export const NO_DECOR: ProfileDecor = {
    frameColors: null,
    frameAnimation: null,
    bannerColors: null,
    bannerPattern: null,
    bannerImage: null,
    nameColor: null,
    showBadge: false,
};

const HEX = /^#[0-9a-f]{3,8}$/i;
const colorList = (value: unknown): string[] | null => {
    if (!Array.isArray(value)) return null;
    const colors = value.filter((c): c is string => typeof c === 'string' && HEX.test(c));
    return colors.length >= 2 ? colors : null;
};

export const cosmeticName = (item: CosmeticItem, language: string) =>
    item.name?.[language] ?? item.name?.en ?? item.id;

export const parseSelection = (raw: unknown): CosmeticSelection =>
    raw && typeof raw === 'object' ? (raw as CosmeticSelection) : {};

export const parseTop10 = (raw: unknown): Top10Entry[] =>
    Array.isArray(raw)
        ? raw
            .filter(e => e && typeof e.anime_id === 'string' && typeof e.title === 'string')
            .slice(0, TOP10_MAX)
        : [];

export const paletteFromItem = (item: CosmeticItem | undefined): CustomPalette | null =>
    item?.type === 'theme' ? { id: item.id, dark: item.payload?.dark, light: item.payload?.light } : null;

/** Resolves a profile owner's picks against the catalog. `ownerIsPremium` must come from the server for other users. */
export const resolveDecor = (
    selection: CosmeticSelection,
    catalog: Map<string, CosmeticItem>,
    ownerIsPremium: boolean,
): ProfileDecor => {
    if (!ownerIsPremium) return NO_DECOR;
    const frame = selection.frame ? catalog.get(selection.frame) : undefined;
    const banner = selection.banner ? catalog.get(selection.banner) : undefined;
    const name = selection.name_color ? catalog.get(selection.name_color) : undefined;
    const nameColor = name?.payload?.color;
    const bannerImage = banner?.payload?.image_url;
    return {
        frameColors: colorList(frame?.payload?.colors),
        frameAnimation: parseFrameAnimation(frame?.payload?.animation),
        bannerColors: colorList(banner?.payload?.colors),
        bannerPattern: parseBannerPattern(banner?.payload),
        bannerImage: typeof bannerImage === 'string' && bannerImage.startsWith('https://') ? bannerImage : null,
        nameColor: typeof nameColor === 'string' && HEX.test(nameColor) ? nameColor : null,
        showBadge: true,
    };
};

/** Server premium state of another user (profiles.is_pro + pro_expires_at). */
export const profileIsPremium = (profile: { is_pro?: boolean | null; pro_expires_at?: string | null } | null | undefined) =>
    !!profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at).getTime() > Date.now());
