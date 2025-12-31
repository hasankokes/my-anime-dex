import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function GuideScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const sections = [
        {
            title: "Keys & Buttons Guide",
            icon: "keypad-outline",
            items: [
                { icon: "arrow-back", label: "Back", desc: "Returns to the previous screen." },
                { icon: "heart", label: "Favorite", desc: "Adds the anime to your Favorites list." },
                { icon: "add-circle", label: "Add to List", desc: "Adds anime to Watching, Plan to Watch, or Completed." },
                { icon: "list", label: "Custom List", desc: "Save anime to one of your custom lists." },
                { icon: "trash", label: "Remove", desc: "Removes an anime from your list." },
            ]
        },
        {
            title: "How to Add to Favorites",
            icon: "heart-outline",
            content: "On any Anime Details page, look for the Heart icon in the top right corner (or slightly below the header image). Tapping this icon will toggle the anime as a 'Favorite'. You can view all your favorites on your Profile page."
        },
        {
            title: "How to Add to List",
            icon: "library-outline",
            content: "On the Anime Details page, tap the large yellow 'Add to List' button (or the button showing your current status). A menu will pop up allowing you to choose 'Watching', 'Completed', or 'Plan to Watch'. Selecting a status automatically tracks it in your library."
        },
        {
            title: "How to Create Custom Lists",
            icon: "albums-outline",
            content: "You can organize anime into your own custom categories!\n\n1. Go to your Profile.\n2. Tap 'My Lists' under 'My Library'.\n3. Tap the '+' (Create) button.\n4. Give your list a name (e.g., 'Weekend Binge') and save.\n\nTo add an anime to this list: Go to the Anime Details page and tap 'Save to Custom List'."
        }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>App Walkthrough</Text>
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
