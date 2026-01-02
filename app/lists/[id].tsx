import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Share, Image, Modal, TextInput, TouchableWithoutFeedback, Platform, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { List, ListItem } from '../../types/lists';
import { useTheme } from '../../context/ThemeContext';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';


export default function ListDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const [list, setList] = useState<List | null>(null);
    const [items, setItems] = useState<ListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);

    // Edit State
    const [editingItem, setEditingItem] = useState<ListItem | null>(null);
    const [editScore, setEditScore] = useState('');
    const [editComment, setEditComment] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchListDetails();
    }, [id]);

    const fetchListDetails = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            // Fetch List Metadata
            const { data: listData, error: listError } = await supabase
                .from('lists')
                .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
                .eq('id', id)
                .single();

            if (listError) throw listError;
            setList(listData);

            if (session && listData.user_id === session.user.id) {
                setIsOwner(true);
            }

            // Fetch List Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('list_items')
                .select('*')
                .eq('list_id', id)
                .order('position', { ascending: true })
                .order('added_at', { ascending: false });

            if (itemsError) throw itemsError;

            // normalize items to ensure position exists locally if null in db
            const validItems = (itemsData || []).map((item, index) => ({
                ...item,
                position: item.position ?? index
            }));

            setItems(validItems);

        } catch (error) {
            console.error('Error fetching list details:', error);
            Alert.alert('Error', 'Failed to load list details');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const onDragEnd = async ({ data }: { data: ListItem[] }) => {
        setItems(data);
        // Persist new order
        if (isOwner) {
            try {
                const updates = data.map((item, index) => ({
                    id: item.id,
                    position: index,
                    updated_at: new Date()
                }));

                // Upsert all positions (batch update logic would be better but simple loops work for small lists)
                // Supabase standard bulk update isn't straightforward for different values on different rows without a function or multiple calls.
                // For simplicity, we loop. Optimizations could include a custom SQL function.
                for (const item of updates) {
                    await supabase.from('list_items').update({ position: item.position }).eq('id', item.id);
                }
            } catch (e) {
                console.error('Failed to save order', e);
            }
        }
    };

    const handleShare = async () => {
        if (!list) return;

        // Generate Web Link (which will redirect to app)
        const webUrl = `https://myanimedex.com/?list_id=${list.id}`;

        // Generate Direct App Link (Deep Link)
        const appUrl = Linking.createURL(`/lists/${list.id}`);

        // Create a text summary (All Items)
        const allItems = items.map((item, index) =>
            `${index + 1}. ${item.anime_title} ${item.user_score ? `(★${item.user_score})` : ''}`
        ).join('\n');

        const message = `Check out my anime list "${list.title}"! 📺\n\n${list.description ? list.description + '\n\n' : ''}${allItems}\n\nView details:\nUse Link: ${webUrl}\nApp Link: ${appUrl}`;

        try {
            await Share.share({
                message: message,
            });
        } catch (error) {
            // ignore
        }
    };

    const removeItem = (itemId: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to remove this anime from the list?')) {
                performRemoveItem(itemId);
            }
        } else {
            Alert.alert(
                'Remove Item',
                'Are you sure you want to remove this anime from the list?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => performRemoveItem(itemId)
                    }
                ]
            );
        }
    }

    const performRemoveItem = async (itemId: string) => {
        try {
            const { error } = await supabase
                .from('list_items')
                .delete()
                .eq('id', itemId);

            if (error) throw error;

            setItems(prev => prev.filter(i => i.id !== itemId));
        } catch (error) {
            Alert.alert('Error', 'Failed to remove item');
        }
    }

    const handleDeleteList = () => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
                performDeleteList();
            }
        } else {
            Alert.alert(
                'Delete List',
                'Are you sure you want to delete this list? This action cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: performDeleteList
                    }
                ]
            );
        }
    }

    const performDeleteList = async () => {
        try {
            const { error } = await supabase
                .from('lists')
                .delete()
                .eq('id', id);
            if (error) throw error;
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete list');
        }
    }

    const openEditModal = (item: ListItem) => {
        setEditingItem(item);
        setEditScore(item.user_score?.toString() || '');
        setEditComment(item.user_comment || '');
    }

    const saveItemDetails = async () => {
        if (!editingItem) return;

        const scoreNum = parseInt(editScore);
        if (editScore && (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10)) {
            Alert.alert('Error', 'Score must be between 1 and 10');
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase
                .from('list_items')
                .update({
                    user_score: editScore ? scoreNum : null,
                    user_comment: editComment.trim() || null
                })
                .eq('id', editingItem.id);

            if (error) throw error;

            // Update local state
            setItems(prev => prev.map(i => {
                if (i.id === editingItem.id) {
                    return { ...i, user_score: editScore ? scoreNum : undefined, user_comment: editComment.trim() || null };
                }
                return i;
            }));

            setEditingItem(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to save details');
        } finally {
            setSaving(false);
        }
    }

    const renderItem = ({ item, drag, isActive }: RenderItemParams<ListItem>) => {
        // Native render with Drag support
        if (Platform.OS !== 'web') {
            return (
                <ScaleDecorator>
                    <View
                        style={[
                            styles.listItem,
                            {
                                backgroundColor: isActive ? colors.border : colors.card,
                                borderColor: isActive ? '#FACC15' : colors.border,
                                flexDirection: 'row',
                            }
                        ]}
                    >
                        <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row' }}
                            onPress={() => router.push(`/anime/${item.anime_id}`)}
                            onLongPress={isOwner ? drag : undefined}
                            disabled={isActive}
                        >
                            <View style={styles.itemImageContainer}>
                                <Image source={{ uri: item.anime_image }} style={styles.itemImage} />
                            </View>

                            <View style={styles.itemContent}>
                                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{item.anime_title}</Text>

                                <View style={styles.scoreRow}>
                                    <View style={styles.globalScore}>
                                        <Ionicons name="star" size={12} color="#F59E0B" />
                                        <Text style={[styles.scoreText, { color: colors.subtext }]}>{item.score || 'N/A'}</Text>
                                    </View>
                                    {item.user_score && (
                                        <View style={[styles.userScoreBadge, { backgroundColor: '#FACC15' }]}>
                                            <Text style={styles.userScoreText}>My Score: {item.user_score}</Text>
                                        </View>
                                    )}
                                </View>

                                {item.user_comment && (
                                    <Text style={[styles.userComment, { color: colors.subtext, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
                                        "{item.user_comment}"
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {isOwner && (
                            <View style={styles.actionsColumn}>
                                <TouchableOpacity
                                    onPressIn={drag}
                                    style={{ marginBottom: 4, padding: 4 }}
                                >
                                    <Ionicons name="reorder-two" size={24} color={colors.subtext} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: colors.border }]}
                                    onPress={() => openEditModal(item)}
                                >
                                    <Ionicons name="create-outline" size={18} color={colors.text} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: '#FEE2E2', marginTop: 8 }]}
                                    onPress={() => removeItem(item.id)}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScaleDecorator>
            );
        }

        // Web Render (Standard View)
        return (
            <View
                style={[
                    styles.listItem,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        flexDirection: 'row',
                    }
                ]}
            >
                <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row' }}
                    onPress={() => router.push(`/anime/${item.anime_id}`)}
                >
                    <View style={styles.itemImageContainer}>
                        <Image source={{ uri: item.anime_image }} style={styles.itemImage} />
                    </View>

                    <View style={styles.itemContent}>
                        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{item.anime_title}</Text>

                        <View style={styles.scoreRow}>
                            <View style={styles.globalScore}>
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text style={[styles.scoreText, { color: colors.subtext }]}>{item.score || 'N/A'}</Text>
                            </View>
                            {item.user_score && (
                                <View style={[styles.userScoreBadge, { backgroundColor: '#FACC15' }]}>
                                    <Text style={styles.userScoreText}>My Score: {item.user_score}</Text>
                                </View>
                            )}
                        </View>

                        {item.user_comment && (
                            <Text style={[styles.userComment, { color: colors.subtext, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
                                "{item.user_comment}"
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>

                {isOwner && (
                    <View style={styles.actionsColumn}>
                        {/* No Drag Handle on Web for now */}

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.border }]}
                            onPress={() => openEditModal(item)}
                        >
                            <Ionicons name="create-outline" size={18} color={colors.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#FEE2E2', marginTop: 8 }]}
                            onPress={() => removeItem(item.id)}
                        >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const ListHeader = () => (
        <View style={styles.listHeader}>
            <Text style={[styles.title, { color: colors.text }]}>{list?.title}</Text>
            {list?.description && (
                <Text style={[styles.description, { color: colors.subtext }]}>{list.description}</Text>
            )}
            <View style={styles.authorRow}>
                <Image
                    source={{ uri: (list as any)?.profiles?.avatar_url || 'https://via.placeholder.com/150' }}
                    style={styles.avatar}
                />
                <Text style={[styles.authorName, { color: colors.subtext }]}>
                    by {(list as any)?.profiles?.username || 'Unknown'}
                </Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{items.length} items</Text>
                </View>
            </View>
            {isOwner && Platform.OS !== 'web' && items.length > 1 && (
                <Text style={[styles.dragHint, { color: colors.subtext }]}>long press an item to reorder</Text>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color="#FACC15" />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                    <Ionicons name="share-outline" size={24} color={colors.text} />
                </TouchableOpacity>
                {isOwner && (
                    <TouchableOpacity onPress={handleDeleteList} style={[styles.iconButton, { marginLeft: 8 }]}>
                        <Ionicons name="trash-outline" size={24} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>

            {Platform.OS === 'web' ? (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => renderItem({
                        item,
                        drag: () => { },
                        isActive: false,
                        getIndex: () => index
                    } as RenderItemParams<ListItem>)}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListHeaderComponent={ListHeader}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>This list is empty.</Text>
                        </View>
                    }
                />
            ) : (
                <DraggableFlatList
                    data={items}
                    onDragEnd={onDragEnd}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    containerStyle={styles.listContent}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    activationDistance={20}
                    ListHeaderComponent={ListHeader}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>This list is empty.</Text>
                        </View>
                    }
                />
            )}

            {/* Edit Modal */}
            <Modal
                visible={!!editingItem}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditingItem(null)}
            >
                <TouchableWithoutFeedback onPress={() => setEditingItem(null)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={() => { }}>
                            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Rate & Review</Text>

                                <Text style={[styles.inputLabel, { color: colors.subtext }]}>Score (1-10)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                    value={editScore}
                                    onChangeText={setEditScore}
                                    keyboardType="numeric"
                                    placeholder="e.g. 9"
                                    placeholderTextColor={colors.subtext}
                                    maxLength={2}
                                />

                                <Text style={[styles.inputLabel, { color: colors.subtext }]}>Comment</Text>
                                <TextInput
                                    style={[styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                    value={editComment}
                                    onChangeText={setEditComment}
                                    multiline
                                    numberOfLines={3}
                                    placeholder="Write your thoughts..."
                                    placeholderTextColor={colors.subtext}
                                    textAlignVertical="top"
                                />

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, { backgroundColor: colors.border }]}
                                        onPress={() => setEditingItem(null)}
                                    >
                                        <Text style={{ color: colors.text }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, { backgroundColor: '#FACC15' }]}
                                        onPress={saveItemDetails}
                                        disabled={saving}
                                    >
                                        {saving ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: 'bold' }}>Save</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    iconButton: {
        padding: 4,
    },
    listContent: {
        // paddingHorizontal: 20, // Move padding to item or container if using Draggable
        // paddingBottom: 40,
    },
    listHeader: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        marginBottom: 16,
        lineHeight: 22,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    authorName: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        marginRight: 12,
    },
    badge: {
        backgroundColor: 'rgba(250, 204, 21, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    badgeText: {
        color: '#FACC15',
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
    },
    dragHint: {
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 10,
        opacity: 0.7,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'Poppins_500Medium',
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 16,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        marginHorizontal: 20, // Add horizontal margin here since parent lost it
    },
    itemImageContainer: {
        width: 80,
        height: 110,
    },
    itemImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    itemContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'flex-start',
    },
    itemTitle: {
        fontSize: 15,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 6,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    globalScore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    scoreText: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    userScoreBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    userScoreText: {
        fontSize: 10,
        color: '#000',
        fontFamily: 'Poppins_700Bold',
    },
    userComment: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        fontStyle: 'italic',
        padding: 6,
        borderRadius: 6,
        overflow: 'hidden',
    },
    actionsColumn: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0,0,0,0.05)',
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        borderRadius: 24,
        padding: 24,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 16,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        minHeight: 80,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
