import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { useAppConfig } from './AppConfigProvider';
import { useTheme } from './ThemeContext';
import { useIsPremium } from '../hooks/usePremium';
import { analytics } from '../lib/analytics';
import {
    CosmeticItem,
    CosmeticSelection,
    paletteFromItem,
    parseSelection,
    parseTop10,
    ProfileDecor,
    profileIsPremium,
    resolveDecor,
    Top10Entry,
} from '../lib/cosmetics';

const CATALOG_CACHE_KEY = 'cosmetics_catalog_v1';

interface CosmeticsContextType {
    /** Module flag is on */
    enabled: boolean;
    catalog: CosmeticItem[];
    byId: Map<string, CosmeticItem>;
    /** The signed-in user's picks and Top 10 (kept even when premium lapses) */
    selection: CosmeticSelection;
    top10: Top10Entry[];
    /** The signed-in user's own decor (empty unless premium) */
    myDecor: ProfileDecor;
    select: (patch: CosmeticSelection) => Promise<boolean>;
    saveTop10: (entries: Top10Entry[]) => Promise<boolean>;
    reload: () => Promise<void>;
}

const CosmeticsContext = createContext<CosmeticsContextType | undefined>(undefined);

/**
 * Loads the cosmetics catalog and the user's picks, and applies the chosen app theme while the
 * user is premium (and the module flag is on). Lapsed premium falls back to the default theme;
 * the picks stay saved and come back on renewal.
 */
export const CosmeticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, status } = useAuth();
    const { config, loaded: configLoaded } = useAppConfig();
    const { isPremium, isReady } = useIsPremium();
    const { setCustomPalette } = useTheme();
    const enabled = config.premium_cosmetics;

    const [catalog, setCatalog] = useState<CosmeticItem[]>([]);
    const [selection, setSelection] = useState<CosmeticSelection>({});
    const [top10, setTop10] = useState<Top10Entry[]>([]);
    // The user id whose picks are loaded (undefined = not yet); the theme waits for it
    const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);

    const loadCatalog = useCallback(async () => {
        try {
            const cached = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
            if (cached) setCatalog(JSON.parse(cached));
        } catch { /* ignore */ }
        const { data, error } = await supabase
            .from('cosmetics')
            .select('id, type, name, payload, premium, sort')
            .order('type')
            .order('sort');
        if (error) {
            console.warn('Cosmetics catalog fetch failed:', error.message);
            return;
        }
        setCatalog((data ?? []) as CosmeticItem[]);
        AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data ?? [])).catch(() => { });
    }, []);

    const loadMine = useCallback(async () => {
        if (!user) {
            setSelection({});
            setTop10([]);
            setLoadedFor(null);
            return;
        }
        const { data, error } = await supabase.from('profiles').select('cosmetics, top10').eq('id', user.id).single();
        if (error) {
            // Offline etc.: keep whatever theme is cached rather than resetting it
            console.warn('Cosmetics selection fetch failed:', error.message);
            return;
        }
        setSelection(parseSelection(data?.cosmetics));
        setTop10(parseTop10(data?.top10));
        setLoadedFor(user.id);
    }, [user]);

    const reload = useCallback(async () => {
        await Promise.all([loadCatalog(), loadMine()]);
    }, [loadCatalog, loadMine]);

    useEffect(() => {
        if (enabled) loadCatalog();
    }, [enabled, loadCatalog]);

    useEffect(() => {
        if (enabled) loadMine();
    }, [enabled, loadMine]);

    const byId = useMemo(() => new Map(catalog.map(item => [item.id, item])), [catalog]);

    // Apply / remove the premium app theme. Wait for the entitlement check so a premium user's
    // cached theme isn't flashed off at launch; the catalog must know the theme to apply it.
    useEffect(() => {
        if (status === 'loading' || !isReady || !configLoaded) return;
        if (!enabled || !isPremium || !user) {
            setCustomPalette(null);
            return;
        }
        if (loadedFor !== user.id) return;
        if (!selection.theme) {
            setCustomPalette(null);
            return;
        }
        const palette = paletteFromItem(byId.get(selection.theme));
        if (palette) setCustomPalette(palette);
        else if (catalog.length) setCustomPalette(null); // theme removed from the catalog
    }, [status, enabled, isPremium, isReady, configLoaded, user, loadedFor, selection.theme, byId, catalog.length, setCustomPalette]);

    const select = useCallback(async (patch: CosmeticSelection) => {
        if (!user) return false;
        const next = { ...selection, ...patch };
        const previous = selection;
        setSelection(next);
        const { error } = await supabase.from('profiles').update({ cosmetics: next }).eq('id', user.id);
        if (error) {
            console.error('Cosmetics save failed:', error);
            setSelection(previous);
            return false;
        }
        for (const [slot, id] of Object.entries(patch)) {
            analytics.track('cosmetic_selected', { slot, cosmetic_id: id ?? 'none' });
        }
        return true;
    }, [user, selection]);

    const saveTop10 = useCallback(async (entries: Top10Entry[]) => {
        if (!user) return false;
        const { error } = await supabase.from('profiles').update({ top10: entries }).eq('id', user.id);
        if (error) {
            console.error('Top 10 save failed:', error);
            return false;
        }
        setTop10(entries);
        analytics.track('top10_saved', { count: entries.length });
        return true;
    }, [user]);

    const myDecor = useMemo(
        () => resolveDecor(selection, byId, enabled && isPremium),
        [selection, byId, enabled, isPremium],
    );

    const value = useMemo(() => ({
        enabled, catalog, byId, selection, top10, myDecor, select, saveTop10, reload,
    }), [enabled, catalog, byId, selection, top10, myDecor, select, saveTop10, reload]);

    return <CosmeticsContext.Provider value={value}>{children}</CosmeticsContext.Provider>;
};

export const useCosmetics = () => {
    const context = useContext(CosmeticsContext);
    if (!context) throw new Error('useCosmetics must be used within a CosmeticsProvider');
    return context;
};

/**
 * Decor for any profile row that carries is_pro / pro_expires_at / cosmetics (reviews,
 * leaderboard, public profiles). Empty unless the module is on and the server confirms premium.
 */
export const useDecorFor = () => {
    const { enabled, byId } = useCosmetics();
    return useCallback(
        (profile: { is_pro?: boolean | null; pro_expires_at?: string | null; cosmetics?: unknown } | null | undefined): ProfileDecor =>
            resolveDecor(parseSelection(profile?.cosmetics), byId, enabled && profileIsPremium(profile)),
        [enabled, byId],
    );
};
