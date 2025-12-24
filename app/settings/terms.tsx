import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function TermsScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.lastUpdated, { color: colors.subtext }]}>Last Updated: December 22, 2025</Text>

                <Text style={[styles.paragraph, { color: colors.text }]}>
                    Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the MyAnimeDex application operated by us.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>1. Acceptance of Terms</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>2. Accounts</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>3. Content</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    Our Service allows you to track, view, and share information about Anime. You are responsible for the content that you post to the Service, including its legality, reliability, and appropriateness.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>4. Termination</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
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
