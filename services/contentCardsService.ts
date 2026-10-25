/**
 * Server-driven content cards (Module 7): polls, announcements and beta sign-ups defined as rows
 * in the Supabase content_cards table. Unknown card types are ignored so new types can be
 * added server-side without breaking older app versions.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export type CardType = 'poll' | 'announcement' | 'beta_signup';
export type CardPlacement = 'home' | 'discover' | 'profile';

type Localized = Record<string, string>;

export interface PollOption {
    id: string;
    label: Localized;
}

export interface ContentCardData {
    id: string;
    type: CardType;
    placement: CardPlacement;
    audience: 'all' | 'premium' | 'free';
    locales: string[];
    title: Localized;
    body: Localized;
    payload: {
        options?: PollOption[];
        show_results?: 'after_vote' | 'after_end' | 'always';
        image_url?: string;
        cta?: { label?: Localized; url?: string };
        success?: Localized;
    };
    starts_at: string;
    ends_at: string | null;
    priority: number;
    dismissible: boolean;
}

const KNOWN_TYPES: CardType[] = ['poll', 'announcement', 'beta_signup'];
const CACHE_KEY = 'content_cards_v1';
const DISMISSED_KEY = 'content_cards_dismissed_v1';
const CACHE_MS = 15 * 60 * 1000;

let memory: { at: number; cards: ContentCardData[] } | null = null;
let inFlight: Promise<ContentCardData[]> | null = null;

export const localized = (value: Localized | undefined, language: string): string =>
    value?.[language] ?? value?.en ?? Object.values(value ?? {})[0] ?? '';

/** https links open in the browser; "/route" opens an app screen; anything else is ignored */
export const safeCtaUrl = (url: string | undefined): string | null =>
    url && (/^https:\/\//i.test(url) || /^\/[A-Za-z0-9/_\-?=&.]*$/.test(url)) ? url : null;

export const contentCardsService = {
    /** All live cards (cached 15 min in memory and on the device). */
    async fetchAll(force = false): Promise<ContentCardData[]> {
        if (!force && memory && Date.now() - memory.at < CACHE_MS) return memory.cards;
        if (!force && !memory) {
            try {
                const raw = await AsyncStorage.getItem(CACHE_KEY);
                if (raw) {
                    const cached = JSON.parse(raw);
                    memory = cached;
                    if (Date.now() - cached.at < CACHE_MS) return cached.cards;
                }
            } catch { /* ignore */ }
        }
        inFlight ??= (async () => {
            try {
                const { data, error } = await supabase
                    .from('content_cards')
                    .select('id, type, placement, audience, locales, title, body, payload, starts_at, ends_at, priority, dismissible')
                    .order('priority', { ascending: false })
                    .order('starts_at', { ascending: false });
                if (error) throw error;
                const cards = ((data ?? []) as ContentCardData[]).filter(c => KNOWN_TYPES.includes(c.type));
                memory = { at: Date.now(), cards };
                AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memory)).catch(() => { });
                return cards;
            } catch (e) {
                console.warn('Content cards fetch failed:', e);
                return memory?.cards ?? [];
            } finally {
                inFlight = null;
            }
        })();
        return inFlight;
    },

    /** Cards for one slot, after audience / language / dismissal rules. */
    select(
        cards: ContentCardData[],
        opts: { placement: CardPlacement; isPremium: boolean; language: string; dismissed: Set<string> },
    ): ContentCardData[] {
        return cards.filter(c =>
            c.placement === opts.placement
            && (c.audience === 'all' || (c.audience === 'premium') === opts.isPremium)
            && (!c.locales?.length || c.locales.includes(opts.language))
            && !(c.dismissible && opts.dismissed.has(c.id)));
    },

    async getDismissed(): Promise<Set<string>> {
        try {
            const raw = await AsyncStorage.getItem(DISMISSED_KEY);
            return new Set(raw ? JSON.parse(raw) : []);
        } catch {
            return new Set();
        }
    },

    async dismiss(cardId: string): Promise<Set<string>> {
        const dismissed = await this.getDismissed();
        dismissed.add(cardId);
        // Keep the list bounded; old cards are gone from the server anyway
        const list = [...dismissed].slice(-200);
        AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(list)).catch(() => { });
        return new Set(list);
    },

    // --- Polls (voting is premium-only, enforced by RLS) ---

    async getMyVote(cardId: string, userId: string): Promise<string | null> {
        const { data } = await supabase
            .from('poll_votes')
            .select('option_id')
            .eq('card_id', cardId)
            .eq('user_id', userId)
            .maybeSingle();
        return data?.option_id ?? null;
    },

    async vote(cardId: string, userId: string, optionId: string): Promise<void> {
        const { error } = await supabase.from('poll_votes').insert({ card_id: cardId, user_id: userId, option_id: optionId });
        if (error) throw error;
    },

    /** Vote totals, or null while the poll's show_results rule hides them. */
    async getResults(cardId: string): Promise<Record<string, number> | null> {
        const { data, error } = await supabase.rpc('get_poll_results', { p_card_id: cardId });
        if (error || !data?.length) return null;
        return Object.fromEntries((data as { option_id: string; votes: number }[]).map(r => [r.option_id, Number(r.votes)]));
    },

    // --- Beta sign-ups ---

    async isSignedUp(cardId: string, userId: string): Promise<boolean> {
        const { data } = await supabase
            .from('beta_signups')
            .select('card_id')
            .eq('card_id', cardId)
            .eq('user_id', userId)
            .maybeSingle();
        return !!data;
    },

    async signUp(cardId: string, userId: string): Promise<void> {
        const { error } = await supabase.from('beta_signups').insert({ card_id: cardId, user_id: userId });
        if (error && error.code !== '23505') throw error; // already signed up is fine
    },
};
