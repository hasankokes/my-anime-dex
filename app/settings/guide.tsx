import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function GuideScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();

    const sections = [
        {
            title: t('help.guide.keys.title'),
            icon: "keypad-outline",
            items: [
                { icon: "arrow-back", label: t('help.guide.keys.back.label'), desc: t('help.guide.keys.back.desc') },
                { icon: "heart", label: t('help.guide.keys.favorite.label'), desc: t('help.guide.keys.favorite.desc') },
                { icon: "add-circle", label: t('help.guide.keys.add.label'), desc: t('help.guide.keys.add.desc') },
                { icon: "list", label: t('help.guide.keys.custom.label'), desc: t('help.guide.keys.custom.desc') },
                { icon: "trash", label: t('help.guide.keys.remove.label'), desc: t('help.guide.keys.remove.desc') },
            ]
        },
        {
            title: t('help.guide.sections.addFav.title'),
            icon: "heart-outline",
            content: t('help.guide.sections.addFav.content')
        },
        {
            title: t('help.guide.sections.addList.title'),
            icon: "library-outline",
            content: t('help.guide.sections.addList.content')
        },
        {
            title: t('help.guide.sections.customList.title'),
            icon: "albums-outline",
            content: t('help.guide.sections.customList.content')
        },
        {
            title: t('help.guide.sections.calendar.title'),
            icon: "calendar-outline",
            content: t('help.guide.sections.calendar.content')
        },
        {
            title: t('help.guide.sections.writeReview.title'),
            icon: "create-outline",
            content: t('help.guide.sections.writeReview.content')
        }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('help.guide.title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {sections.map((section, index) => (
                    <View key={index} style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name={section.icon as any} size={24} color="#FACC15" style={{ marginRight: 10 }} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                        </View>

                        {section.items ? (
                            <View style={styles.itemsGrid}>
                                {section.items.map((item, i) => (
                                    <View key={i} style={styles.keyItem}>
                                        <View style={[styles.iconBox, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                                            <Ionicons name={item.icon as any} size={20} color={colors.text} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.keyLabel, { color: colors.text }]}>{item.label}</Text>
                                            <Text style={[styles.keyDesc, { color: colors.subtext }]}>{item.desc}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={[styles.sectionContent, { color: colors.subtext }]}>
                                {section.content}
                            </Text>
                        )}
                    </View>
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
    sectionCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
    },
    sectionContent: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        lineHeight: 22,
    },
    itemsGrid: {
        flexDirection: 'column',
        gap: 16,
    },
    keyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 2,
    },
    keyDesc: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
    },
});
