import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

// Keep in sync with privacy.sections in lib/i18n.ts and web/privacy*.html
const SECTIONS = ['collection', 'usage', 'thirdParty', 'ads', 'device', 'public', 'retention', 'children', 'rights', 'contact'] as const;

export default function PrivacyScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useLanguage();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('privacy.title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.lastUpdated, { color: colors.subtext }]}>{t('privacy.lastUpdated')}</Text>

                <Text style={[styles.paragraph, { color: colors.text }]}>
                    {t('privacy.intro')}
                </Text>

                {SECTIONS.map((key) => (
                    <React.Fragment key={key}>
                        <Text style={[styles.heading, { color: colors.text }]}>{t(`privacy.sections.${key}.title`)}</Text>
                        <Text style={[styles.paragraph, { color: colors.subtext }]}>
                            {t(`privacy.sections.${key}.content`)}
                        </Text>
                    </React.Fragment>
                ))}

                <View style={{ height: 40 }} />
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
    lastUpdated: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 20,
    },
    heading: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
        marginTop: 16,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        lineHeight: 22,
        marginBottom: 16,
    },
});
