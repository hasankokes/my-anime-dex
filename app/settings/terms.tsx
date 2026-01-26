import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function TermsScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useLanguage();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('terms.title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.lastUpdated, { color: colors.subtext }]}>{t('terms.lastUpdated')}</Text>

                <TouchableOpacity
                    style={[styles.eulaButton, { borderColor: colors.primary, backgroundColor: colors.card }]}
                    onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula')}
                >
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.eulaText, { color: colors.primary }]}>{t('terms.readAppleEula')}</Text>
                    <Ionicons name="open-outline" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <Text style={[styles.paragraph, { color: colors.text }]}>
                    {t('terms.intro')}
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>{t('terms.sections.acceptance.title')}</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    {t('terms.sections.acceptance.content')}
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>{t('terms.sections.accounts.title')}</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    {t('terms.sections.accounts.content')}
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>{t('terms.sections.content.title')}</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    {t('terms.sections.content.content')}
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>{t('terms.sections.termination.title')}</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    {t('terms.sections.termination.content')}
                </Text>

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
    eulaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
        alignSelf: 'flex-start',
    },
    eulaText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
    },
});
