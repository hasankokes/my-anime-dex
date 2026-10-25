/**
 * Locale-aware upper case for small caps labels. `textTransform: 'uppercase'` ignores the app
 * language, so Turkish "Etiketlerim" became "ETIKETLERIM" instead of "ETİKETLERİM".
 */
export const upperCase = (text: string, language: string): string => {
    if (language === 'tr' || language === 'az') {
        return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
    }
    return text.toUpperCase();
};
