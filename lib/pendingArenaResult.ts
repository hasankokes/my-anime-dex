import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// A guest's finished Arena quiz, kept until they sign in so it can be saved once.
// Lives in memory and in AsyncStorage (survives backgrounding / app kill / email verification).

const STORAGE_KEY = 'arena_pending_result_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

export type PendingArenaResult = {
    key: string;
    category: string;
    size: number;
    winner_id: number;
    winner_name: string;
    winner_image: string;
    rating: number;
    createdAt: number;
};

let memory: PendingArenaResult | null = null;
let inFlight: Promise<string | null> | null = null;
// key -> saved arena_results.id, so a second save request for the same result returns the first insert
const savedIds = new Map<string, string>();

const isExpired = (p: PendingArenaResult) => Date.now() - p.createdAt > TTL_MS;

const read = async (): Promise<PendingArenaResult | null> => {
    if (memory) return isExpired(memory) ? null : memory;
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PendingArenaResult;
        if (isExpired(parsed)) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            return null;
        }
        memory = parsed;
        return parsed;
    } catch {
        return null;
    }
};

const write = async (p: PendingArenaResult | null) => {
    memory = p;
    try {
        if (p) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
        // memory copy still works for this app session
    }
};

export const pendingArenaResult = {
    async set(data: Omit<PendingArenaResult, 'key' | 'createdAt' | 'rating'>): Promise<string> {
        const key = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        await write({ ...data, key, rating: 0, createdAt: Date.now() });
        return key;
    },

    async setRating(key: string, rating: number) {
        const p = await read();
        if (p && p.key === key) await write({ ...p, rating });
    },

    getSavedId: (key: string) => savedIds.get(key) ?? null,

    clear: () => write(null),

    /**
     * Saves the pending result for the signed-in user exactly once and removes it.
     * Concurrent callers share the same insert. Returns the arena_results id, or null.
     */
    flush(key?: string): Promise<string | null> {
        if (key && savedIds.has(key)) return Promise.resolve(savedIds.get(key)!);
        if (inFlight) return inFlight;

        inFlight = (async () => {
            const p = await read();
            if (!p) return null;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return null;

            // Claim it before inserting so a parallel/next launch can't insert it again
            await write(null);
            const { data, error } = await supabase
                .from('arena_results')
                .insert({
                    user_id: session.user.id,
                    category: p.category,
                    size: p.size,
                    winner_id: p.winner_id,
                    winner_name: p.winner_name,
                    winner_image: p.winner_image,
                    rating: p.rating,
                })
                .select('id')
                .single();

            if (error || !data) {
                // Put it back so the user can retry with "Save score"
                await write(p);
                return null;
            }
            savedIds.set(p.key, data.id);
            return data.id as string;
        })().finally(() => {
            inFlight = null;
        });

        return inFlight;
    },
};
