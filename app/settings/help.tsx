import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function HelpScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useLanguage();

    const faqs = [
        {
            question: t('help.faq.q1'),
            answer: t('help.faq.a1')
        },
        {
            question: t('help.faq.q2'),
            answer: t('help.faq.a2')
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
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help.faq.title')}</Text>

                {faqs.map((faq, index) => (
                    <View key={index} style={[styles.faqItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.question, { color: colors.text }]}>{faq.question}</Text>
                        <Text style={[styles.answer, { color: colors.subtext }]}>{faq.answer}</Text>
                    </View>
                ))}

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Contact Us</Text>
                <TouchableOpacity
                    style={[styles.contactButton, { backgroundColor: '#FACC15' }]}
                    onPress={handleEmailSupport}
                >
                    <Ionicons name="mail" size={20} color="#000" style={{ marginRight: 8 }} />
                    <Text style={styles.contactButtonText}>Email Support</Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: colors.subtext }]}>{t('settings.appVersion')} 2.4.0 (Build 391)</Text>
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
    }
});
