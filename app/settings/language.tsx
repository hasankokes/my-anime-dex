import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { language, setLanguage, t } = useLanguage();

    const languages = [
        { code: 'en', name: 'English (US)', flag: 'us' },
        { code: 'tr', name: 'Türkçe', flag: 'tr' },
        { code: 'ja', name: '日本語 (Japanese)', flag: 'jp' },
        { code: 'ru', name: 'Русский (Russian)', flag: 'ru' },
        { code: 'de', name: 'Deutsch (German)', flag: 'de' },
        { code: 'es', name: 'Español (Spanish)', flag: 'es' },
        { code: 'pt', name: 'Português (Portuguese)', flag: 'pt' },
        { code: 'id', name: 'Bahasa Indonesia', flag: 'id' },
        { code: 'hi', name: 'हिन्दी (Hindi)', flag: 'in' },
        { code: 'ar', name: 'العربية (Arabic)', flag: 'sa' },
    ];

    const handleLanguageSelect = async (langCode: string) => {
        await setLanguage(langCode);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('settings.language')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Select Language</Text>

                <View style={[styles.optionsContainer, { backgroundColor: colors.card }]}>
                    {languages.map((lang, index) => (
                        <React.Fragment key={lang.code}>
                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => handleLanguageSelect(lang.code)}
                            >
                                <View style={styles.optionLeft}>
                                    <Image 
                                        source={{ uri: `https://flagcdn.com/w80/${lang.flag}.png` }}
                                        style={styles.flagImage}
                                        contentFit="cover"
                                    />
                                    <Text style={[styles.optionLabel, { color: colors.text }]}>{lang.name}</Text>
                                </View>
                                {language === lang.code && (
                                    <Ionicons name="checkmark-circle" size={20} color="#FACC15" />
                                )}
                            </TouchableOpacity>
                            {index < languages.length - 1 && (
                                <View style={[styles.separator, { backgroundColor: colors.border }]} />
                            )}
                        </React.Fragment>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.1)',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 10,
        marginLeft: 4,
    },
    optionsContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flagImage: {
        width: 28,
        height: 20,
        borderRadius: 4,
        marginRight: 12,
    },
    optionLabel: {
        fontSize: 16,
        fontFamily: 'Poppins_500Medium',
    },
    separator: {
        height: 1,
        marginLeft: 52, // Align with text
    }
});
