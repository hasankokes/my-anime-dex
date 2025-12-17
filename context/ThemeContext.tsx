import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
    primary: string;
    tabBar: string;
    inputBg: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark

  useEffect(() => {
    // Load saved theme
    AsyncStorage.getItem('app_theme').then(savedTheme => {
      if (savedTheme) {
        setTheme(savedTheme as Theme);
      }
    });
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    AsyncStorage.setItem('app_theme', newTheme);
  };

  const isDark = theme === 'dark';

  const colors = {
    background: isDark ? '#0F0F0F' : '#F9FAFB',
    card: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#111827',
    subtext: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    primary: '#FACC15', // Yellow stays same
    tabBar: isDark ? '#121212' : '#FFFFFF',
    inputBg: isDark ? '#1F2937' : '#F3F4F6',
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
