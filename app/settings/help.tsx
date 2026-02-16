import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWalkthrough } from '../../context/WalkthroughContext';

export default function HelpScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { startWalkthrough, resetWalkthroughs } = useWalkthrough();

    const handleStartWalkthrough = () => {
        router.replace('/(tabs)');
        setTimeout(() => startWalkthrough('home'), 500);
    };

    const handleResetAllWalkthroughs = async () => {
        await resetWalkthroughs();
        Alert.alert(
            t('common.success'),
            t('help.walkthrough.resetSuccess' as any),
            [{ text: t('common.confirm'), onPress: handleStartWalkthrough }]
        );
    };

    const faqs = [
        {
            question: t('help.faq.q1'),
            answer: t('help.faq.a1')
        },
        {
            question: t('help.faq.q2'),
            answer: t('help.faq.a2')
        },
        {
            question: t('help.faq.q3'),
            answer: t('help.faq.a3')
        }
    ];

    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@myanimedex.com?subject=Support Request');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('settings.support')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Walkthrough Banner */}
                <TouchableOpacity
                    style={[styles.guideBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push('/settings/guide')}
                >
                    <View style={[styles.guideIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="book" size={24} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.guideTitle, { color: colors.text }]}>{t('help.walkthrough.title')}</Text>
                        <Text style={[styles.guideSubtitle, { color: colors.subtext }]}>{t('help.walkthrough.subtitle')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </TouchableOpacity>

                {/* Interactive Walkthrough Button */}
                <TouchableOpacity
                    style={[styles.guideBanner, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}
                    onPress={handleStartWalkthrough}
                >
                    <View style={[styles.guideIcon, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="walk" size={24} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.guideTitle, { color: colors.text }]}>{t('walkthrough.startAgain' as any)}</Text>
                        <Text style={[styles.guideSubtitle, { color: colors.subtext }]}>{t('help.walkthrough.subtitle')}</Text>
                    </View>
                    <Ionicons name="play-circle" size={24} color="#FACC15" />
                </TouchableOpacity>

                {/* Reset All Walkthroughs */}
                <TouchableOpacity
                    style={[styles.guideBanner, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 0 }]}
                    onPress={handleResetAllWalkthroughs}
                >
                    <View style={[styles.guideIcon, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="refresh" size={24} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.guideTitle, { color: colors.text }]}>{t('help.walkthrough.resetAll' as any)}</Text>
                        <Text style={[styles.guideSubtitle, { color: colors.subtext }]}>{t('help.walkthrough.resetDesc' as any)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help.faq.title')}</Text>

                {faqs.map((faq, index) => (
                    <View key={index} style={[styles.faqItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.question, { color: colors.text }]}>{faq.question}</Text>
                        <Text style={[styles.answer, { color: colors.subtext }]}>{faq.answer}</Text>
                    </View>
                ))}

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>{t('help.contact.title')}</Text>
                <TouchableOpacity
                    style={[styles.contactButton, { backgroundColor: '#FACC15' }]}
                    onPress={handleEmailSupport}
                >
                    <Ionicons name="mail" size={20} color="#000" style={{ marginRight: 8 }} />
                    <Text style={styles.contactButtonText}>{t('help.contact.emailButton')}</Text>
                </TouchableOpacity>


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
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 16,
    },
    faqItem: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    question: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 8,
    },
    answer: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        lineHeight: 20,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
    },
    contactButtonText: {
        color: '#000',
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 20,
    },
    guideBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    guideIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    guideTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 2,
    },
    guideSubtitle: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    }
});
