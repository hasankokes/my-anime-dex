import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { AppConfig, DEFAULT_APP_CONFIG, parseAppConfig } from '../lib/featureFlags';

const CACHE_KEY = 'app_config_v1';
// Re-fetch on foreground at most this often
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

interface AppConfigContextType {
    config: AppConfig;
    /** True once the cached or fetched config has been applied (false = still on code defaults) */
    loaded: boolean;
    refresh: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType>({
    config: DEFAULT_APP_CONFIG,
    loaded: false,
    refresh: async () => { },
});

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
    const [loaded, setLoaded] = useState(false);
    const lastFetchRef = React.useRef(0);

    const refresh = useCallback(async () => {
        lastFetchRef.current = Date.now();
        try {
            const { data, error } = await supabase.from('app_config').select('key, value');
            if (error) throw error;
            const next = parseAppConfig(data ?? []);
            setConfig(next);
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data ?? [])).catch(() => { });
        } catch (e) {
            // Keep the cached / default config; flags fail closed (premium modules stay hidden)
            console.warn('AppConfig fetch failed:', e);
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        AsyncStorage.getItem(CACHE_KEY)
            .then(raw => {
                if (raw) {
                    setConfig(parseAppConfig(JSON.parse(raw)));
                    setLoaded(true);
                }
            })
            .catch(() => { })
            .finally(refresh);

        const sub = AppState.addEventListener('change', state => {
            if (state === 'active' && Date.now() - lastFetchRef.current > REFRESH_INTERVAL_MS) {
                refresh();
            }
        });
        return () => sub.remove();
    }, [refresh]);

    const value = React.useMemo(() => ({ config, loaded, refresh }), [config, loaded, refresh]);

    return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
};

export const useAppConfig = () => useContext(AppConfigContext);
