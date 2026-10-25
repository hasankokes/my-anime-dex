/**
 * Premium cloud backups (Module 6). Backups are made server-side: daily by pg_cron for premium
 * users, or on demand via the create_backup RPC; restore_backup replaces the list (after saving
 * the current state as a 'pre_restore' backup). Premium is enforced by the database.
 */
import { supabase } from '../lib/supabase';
import { recommendationService } from './recommendationService';

export interface BackupInfo {
    id: string;
    created_at: string;
    kind: 'daily' | 'manual' | 'pre_restore';
    item_count: number;
}

export class BackupError extends Error {
    constructor(public code: 'premium' | 'rate_limited' | 'not_found' | 'failed') {
        super(code);
    }
}

const toBackupError = (error: { code?: string; hint?: string | null; message?: string }) => {
    if (error.code === '42501') return new BackupError('premium');
    if (error.hint === 'rate_limited') return new BackupError('rate_limited');
    if (error.code === 'P0002') return new BackupError('not_found');
    return new BackupError('failed');
};

export const backupService = {
    async list(userId: string): Promise<BackupInfo[]> {
        const { data, error } = await supabase
            .from('user_backups')
            .select('id, created_at, kind, item_count')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []) as BackupInfo[];
    },

    async create(): Promise<void> {
        const { error } = await supabase.rpc('create_backup');
        if (error) throw toBackupError(error);
    },

    /** Returns the number of list entries restored. */
    async restore(backupId: string): Promise<number> {
        const { data, error } = await supabase.rpc('restore_backup', { p_backup_id: backupId });
        if (error) throw toBackupError(error);
        recommendationService.clearCache();
        return Number(data ?? 0);
    },
};
