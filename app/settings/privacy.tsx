import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function PrivacyScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.lastUpdated, { color: colors.subtext }]}>Last Updated: December 22, 2025</Text>

                <Text style={[styles.paragraph, { color: colors.text }]}>
                    Your privacy is important to us. It is MyAnimeDex's policy to respect your privacy regarding any information we may collect from you across our application.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>1. Information We Collect</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.

                    - **Account Data**: We collect your email address and authentication details via Supabase to secure your account.
                    - **Usage Data**: We may collect anonymous usage data to improve app performance.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>2. Use of Data</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    We use the collected data for various purposes:
                    - To provide and maintain our Service
                    - To notify you about changes to our Service
                    - To allow you to participate in interactive features
                    - To provide customer support
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>3. Third-Party Services</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    We use third-party services like Jikan API for anime data. Please review their privacy policies as well.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>4. Security</Text>
                <Text style={[styles.paragraph, { color: colors.subtext }]}>
                    We value your trust in providing us your Personal Information, thus we strive to use commercially acceptable means of protecting it. But remember that no method of transmission over the internet is 100% secure.
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
