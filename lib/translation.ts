import { supabase } from './supabase';

interface TranslationCache {
    [key: string]: string;
}

const cache: TranslationCache = {};

export const translateText = async (text: string, targetLang: string, animeId?: string): Promise<string> => {
    if (!text) return '';
    if (targetLang === 'en') return text; // Assuming source is English

    // 1. Check in-memory cache first
    const cacheKey = animeId ? `anime_${animeId}_${targetLang}` : `${text.substring(0, 20)}_${text.length}_${targetLang}`;
    if (cache[cacheKey]) return cache[cacheKey];

    try {
        // 2. If animeId is provided, check Supabase
        if (animeId) {
            const { data } = await supabase
                .from('anime_translations')
                .select('synopsis')
                .eq('anime_id', animeId)
                .eq('language', targetLang)
                .maybeSingle();

            if (data && data.synopsis) {
                cache[cacheKey] = data.synopsis;
                return data.synopsis;
            }
        }

        // 3. Translate via API
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();

        // data[0] contains the translated segments
        if (data && data[0]) {
            const translatedText = data[0].map((segment: any) => segment[0]).join('');
            cache[cacheKey] = translatedText;

            // 4. Save to Supabase (fire and forget to not block UI)
            if (animeId && translatedText) {
                saveTranslation(animeId, targetLang, translatedText);
            }

            return translatedText;
        }

        return text; // Fallback to original
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Fallback to original on error
    }
};

const saveTranslation = async (animeId: string, language: string, synopsis: string) => {
    try {
        const { error } = await supabase
            .from('anime_translations')
            .insert({
                anime_id: animeId,
                language,
                synopsis
            });

        if (error) {
            // Ignore duplicate key errors (race conditions)
            if (error.code !== '23505') {
                console.warn('Failed to save translation:', error);
            }
        }
    } catch (err) {
        console.warn('Error saving translation:', err);
    }
};
