import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

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

                <Text style={[styles.heading, { color: colors.text }]}>{t('privacy.sections.collection.title')}</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    {t('privacy.sections.collection.content')}
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>{t('privacy.sections.usage.title')}</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    {t('privacy.sections.usage.content')}
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>3. Third-Party Services</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    We use third-party services like Jikan API for anime data. Please review their privacy policies as well.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>{t('privacy.sections.security.title')}</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    {t('privacy.sections.security.content')}
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
});
