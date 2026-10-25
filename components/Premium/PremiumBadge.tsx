import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

/** Small "PRO" pill shown next to premium users' names. */
export const PremiumBadge: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'sm' }) => {
    const { t } = useLanguage();
    const md = size === 'md';
    return (
        <View style={[styles.badge, md && styles.badgeMd]} accessibilityLabel={t('premium.badgeLabel')}>
            <Ionicons name="diamond" size={md ? 12 : 9} color="#111827" />
            <Text style={[styles.text, md && styles.textMd]}>PRO</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FACC15',
        borderRadius: 6,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    badgeMd: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 9,
        color: '#111827',
        letterSpacing: 0.5,
    },
    textMd: {
        fontSize: 12,
    },
});
