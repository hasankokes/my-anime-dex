import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { List } from '../../types/lists';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function MyListsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const [lists, setLists] = useState<List[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLists = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setListing([]);
                return;
            }

            const { data, error } = await supabase
                .from('lists')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLists(data || []);
        } catch (error) {
            console.error('Error fetching lists:', error);
            Alert.alert('Error', 'Failed to load your lists.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchLists();
        }, [])
    );

    const renderItem = ({ item }: { item: List }) => (
        <TouchableOpacity
            style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/lists/${item.id}`)}
        >
            <View style={styles.listIconContainer}>
                <Ionicons name="list" size={24} color="#FACC15" />
            </View>
            <View style={styles.listContent}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.listDescription, { color: colors.subtext }]} numberOfLines={1}>
                    {item.description || 'No description'}
                </Text>
                <View style={styles.listMeta}>
                    <Text style={[styles.metaText, { color: colors.subtext }]}>
                        {item.is_public ? 'Public' : 'Private'}
                    </Text>
                    <Text style={[styles.metaText, { color: colors.subtext }]}>
                        • {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </TouchableOpacity>
    );

    function setListing(arg0: never[]) {
        throw new Error('Function not implemented.');
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.myLists')}</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: '#FACC15' }]}
                    onPress={() => router.push('/lists/create')}
                >
                    <Ionicons name="add" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FACC15" />
                </View>
            ) : lists.length > 0 ? (
                <FlatList
                    data={lists}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
                        <Ionicons name="list-outline" size={48} color={colors.subtext} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Lists Yet</Text>
                    <Text style={[styles.emptyText, { color: colors.subtext }]}>
                        Create your first custom anime list to share with others.
                    </Text>
                    <TouchableOpacity
                        style={[styles.createButton, { backgroundColor: '#FACC15' }]}
                        onPress={() => router.push('/lists/create')}
                    >
                        <Text style={styles.createButtonText}>Create New List</Text>
                    </TouchableOpacity>
                </View>
            )}
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 20,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    listIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 2,
    },
    listDescription: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        marginBottom: 4,
    },
    listMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    createButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    createButtonText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#000',
    },
});
