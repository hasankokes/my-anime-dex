import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import * as Localization from 'expo-localization';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
// Per-weight imports so only these three files get bundled, not all 18 weights
import { BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro/500Medium';
import { BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro/600SemiBold';
import { BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro/700Bold';

// Languages whose letters Poppins doesn't cover. Styles everywhere reference the
// `Poppins_*` family names, so for these we register a look-alike font under the
// same names instead of falling back glyph-by-glyph to the system font (mixed fonts
// inside a word). Native fonts can't be swapped after load, so the choice is made
// once at startup from the saved (or device) language.
const POPPINS_REPLACEMENTS: Record<string, Record<string, number>> = {
    vi: {
        Poppins_500Medium: BeVietnamPro_500Medium,
        Poppins_600SemiBold: BeVietnamPro_600SemiBold,
        Poppins_700Bold: BeVietnamPro_700Bold,
    },
};

/** Whether switching between these languages needs an app restart to swap fonts. */
export const needsFontRestart = (from: string, to: string) =>
    (POPPINS_REPLACEMENTS[from] ?? null) !== (POPPINS_REPLACEMENTS[to] ?? null);

const getStartupLanguage = async () => {
    try {
        const saved = await AsyncStorage.getItem('user-language');
        if (saved) return saved;
    } catch { }
    return Localization.getLocales()[0]?.languageCode ?? 'en';
};

export function useAppFonts() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const language = await getStartupLanguage();
            try {
                await Font.loadAsync({
                    Poppins_500Medium,
                    Poppins_600SemiBold,
                    Poppins_700Bold,
                    ...POPPINS_REPLACEMENTS[language],
                    // Icon fonts too, to prevent "squares"
                    ...Ionicons.font,
                    ...Feather.font,
                    ...MaterialIcons.font,
                    ...MaterialCommunityIcons.font,
                });
            } catch (e) {
                console.warn('Font loading failed:', e);
            }
            if (!cancelled) setLoaded(true);
        })();
        return () => { cancelled = true; };
    }, []);

    return loaded;
}
