import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../lib/i18n';
import * as Localization from 'expo-localization';

type LanguageContextType = {
    language: string;
    setLanguage: (lang: string) => Promise<void>;
    t: (key: string, options?: any) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguageState] = useState(i18n.locale);

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('user-language');
            if (savedLanguage) {
                i18n.locale = savedLanguage;
                setLanguageState(savedLanguage);
            } else {
                // Default to English as per user request, ignoring system locale for initial default
                i18n.locale = 'en';
                setLanguageState('en');
            }
        } catch (error) {
            console.log('Error loading language', error);
        }
    };

    const setLanguage = async (lang: string) => {
        try {
            i18n.locale = lang;
            setLanguageState(lang);
            await AsyncStorage.setItem('user-language', lang);
        } catch (error) {
            console.log('Error saving language', error);
        }
    };

    const t = (key: string, options?: any) => {
        return i18n.t(key, options);
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
