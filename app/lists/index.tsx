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
    const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
    const [sharedLists, setSharedLists] = useState<List[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLists = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setLists([]);
                setSharedLists([]);
                return;
            }

            // Fetch My Lists
            const { data: myData, error: myError } = await supabase
                .from('lists')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (myError) throw myError;
            setLists(myData || []);

            // Fetch Shared Lists
            const { data: sharedData, error: sharedError } = await supabase
                .from('list_collaborators')
                .select('list:lists(*)') // Select the related list data
                .eq('user_id', session.user.id);

            if (sharedError) throw sharedError;

            // Extract lists from the response
            const formattedSharedLists = sharedData
                .map((item: any) => item.list)
                .filter((list: any) => list !== null)
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setSharedLists(formattedSharedLists);

        } catch (error) {
            console.error('Error fetching lists:', error);
            Alert.alert('Error', 'Failed to load your lists.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchLists();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchLists();
    };

    const renderItem = ({ item }: { item: List }) => (
        <TouchableOpacity
            style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/lists/${item.id}`)}
        >
            <View style={styles.listIconContainer}>
                <Ionicons name={activeTab === 'my' ? "list" : "people"} size={24} color="#FACC15" />
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

            {/* Tabs / Filters */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        {
                            backgroundColor: activeTab === 'my' ? '#FACC15' : colors.card,
                            borderColor: activeTab === 'my' ? '#FACC15' : colors.border
                        }
                    ]}
                    onPress={() => setActiveTab('my')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'my' ? '#000000' : colors.subtext, fontWeight: activeTab === 'my' ? '700' : '500' }
                    ]}>
                        {t('profile.myLists')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterPill,
                        {
                            backgroundColor: activeTab === 'shared' ? '#FACC15' : colors.card,
                            borderColor: activeTab === 'shared' ? '#FACC15' : colors.border
                        }
                    ]}
                    onPress={() => setActiveTab('shared')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'shared' ? '#000000' : colors.subtext, fontWeight: activeTab === 'shared' ? '700' : '500' }
                    ]}>
                        {t('collaborators.sharedWithMe')}
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FACC15" />
                </View>
            ) : (activeTab === 'my' ? lists : sharedLists).length > 0 ? (
                <FlatList
                    data={activeTab === 'my' ? lists : sharedLists}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
                        <Ionicons name={activeTab === 'my' ? "list-outline" : "people-outline"} size={48} color={colors.subtext} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        {activeTab === 'my' ? 'No Lists Yet' : t('collaborators.noSharedLists')}
                    </Text>
                    <Text style={[styles.emptyText, { color: colors.subtext }]}>
                        {activeTab === 'my'
                            ? 'Create your first custom anime list to share with others.'
                            : t('collaborators.sharedListsDesc')}
                    </Text>
                    {activeTab === 'my' && (
                        <TouchableOpacity
                            style={[styles.createButton, { backgroundColor: '#FACC15' }]}
                            onPress={() => router.push('/lists/create')}
                        >
                            <Text style={styles.createButtonText}>Create New List</Text>
                        </TouchableOpacity>
                    )}
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
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 10,
        marginTop: 20,
    },
    filterPill: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
});
