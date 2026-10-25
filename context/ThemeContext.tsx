import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from '../lib/analytics';
import { StatusBar } from 'expo-status-bar';

type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  tabBar: string;
  inputBg: string;
}

/** A premium app theme from the server `cosmetics` catalog: color overrides per mode. */
export interface CustomPalette {
  id: string;
  dark?: Partial<ThemeColors>;
  light?: Partial<ThemeColors>;
}

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
  /** The active premium theme, or null for the default palette */
  customPalette: CustomPalette | null;
  /** Applied by CosmeticsProvider (only while the user is premium); persisted so it shows from launch */
  setCustomPalette: (palette: CustomPalette | null) => void;
}

const CUSTOM_PALETTE_KEY = 'app_custom_palette_v1';

const HEX = /^#[0-9a-f]{3,8}$/i;

// Server palettes are trusted only for well-formed color strings
const sanitize = (colors: unknown): Partial<ThemeColors> => {
  const out: Partial<ThemeColors> = {};
  if (!colors || typeof colors !== 'object') return out;
  for (const [key, value] of Object.entries(colors as Record<string, unknown>)) {
    if (typeof value === 'string' && HEX.test(value)) out[key as keyof ThemeColors] = value;
  }
  return out;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark
  const [customPalette, setCustomPaletteState] = useState<CustomPalette | null>(null);

  useEffect(() => {
    // Load saved theme
    AsyncStorage.getItem('app_theme').then((savedTheme: string | null) => {
      if (savedTheme) {
        setTheme(savedTheme as Theme);
      }
    });
    AsyncStorage.getItem(CUSTOM_PALETTE_KEY)
      .then(raw => {
        if (raw) setCustomPaletteState(JSON.parse(raw));
      })
      .catch(() => { });
  }, []);

  const toggleTheme = React.useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    AsyncStorage.setItem('app_theme', newTheme);
    analytics.track('theme_changed', { theme: newTheme });
  }, [theme]);

  const setCustomPalette = React.useCallback((palette: CustomPalette | null) => {
    const next = palette ? { id: palette.id, dark: sanitize(palette.dark), light: sanitize(palette.light) } : null;
    setCustomPaletteState(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    if (next) AsyncStorage.setItem(CUSTOM_PALETTE_KEY, JSON.stringify(next)).catch(() => { });
    else AsyncStorage.removeItem(CUSTOM_PALETTE_KEY).catch(() => { });
  }, []);

  const isDark = theme === 'dark';

  // Memoized so the context value stays stable and consumers don't re-render on every provider render
  const colors = React.useMemo<ThemeColors>(() => ({
    background: isDark ? '#0F0F0F' : '#F9FAFB',
    card: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#111827',
    subtext: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    primary: '#FACC15', // Yellow stays same
    tabBar: isDark ? '#121212' : '#FFFFFF',
    inputBg: isDark ? '#1F2937' : '#F3F4F6',
    ...(customPalette?.[isDark ? 'dark' : 'light'] ?? {}),
  }), [isDark, customPalette]);

  const contextValue = React.useMemo(() => ({
    theme,
    isDark,
    toggleTheme,
    colors,
    customPalette,
    setCustomPalette,
  }), [theme, isDark, toggleTheme, colors, customPalette, setCustomPalette]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
