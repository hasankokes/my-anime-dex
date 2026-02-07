import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Image, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface User {
    id: string;
    username: string;
    avatar_url: string | null;
}

interface CollaboratorModalProps {
    visible: boolean;
    onClose: () => void;
    listId: string;
}

export default function CollaboratorModal({ visible, onClose, listId }: CollaboratorModalProps) {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const [collaborators, setCollaborators] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchCollaborators();
        }
    }, [visible]);

    const fetchCollaborators = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('list_collaborators')
                .select('user:user_id(id, username, avatar_url)')
                .eq('list_id', listId);

            if (error) throw error;

            if (data) {
                setCollaborators(data.map((item: any) => item.user));
            }
        } catch (error) {
            console.error('Error fetching collaborators:', error);
            Alert.alert(t('common.error'), t('collaborators.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async () => {
        if (!searchQuery.trim() || searchQuery.length < 3) return;

        try {
            setSearching(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .ilike('username', `%${searchQuery}%`)
                .limit(5);

            if (error) throw error;

            // Filter out users who are already collaborators
            const filteredResults = (data || []).filter(
                user => !collaborators.some(c => c.id === user.id)
            );

            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setSearching(false);
        }
    };

    const addCollaborator = async (user: User) => {
        try {
            const { error } = await supabase
                .from('list_collaborators')
                .insert({
                    list_id: listId,
                    user_id: user.id
                });

            if (error) throw error;

            setCollaborators([...collaborators, user]);
            setSearchResults(prev => prev.filter(u => u.id !== user.id));
            Alert.alert(t('common.success'), `${user.username} ${t('collaborators.addedSuccess')}`);
        } catch (error) {
            console.error('Error adding collaborator:', error);
            Alert.alert(t('common.error'), t('collaborators.failedToAdd'));
        }
    };

    const removeCollaborator = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('list_collaborators')
                .delete()
                .eq('list_id', listId)
                .eq('user_id', userId);

            if (error) throw error;

            setCollaborators(prev => prev.filter(c => c.id !== userId));
            Alert.alert(t('common.success'), t('collaborators.removeSuccess'));
        } catch (error) {
            console.error('Error removing collaborator:', error);
            Alert.alert(t('common.error'), t('collaborators.failedToRemove'));
        }
    };

    const renderCollaborator = ({ item }: { item: User }) => (
        <View style={[styles.userItem, { borderColor: colors.border }]}>
            <Image
                source={{ uri: item.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
            />
            <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeCollaborator(item.id)}
            >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    const renderSearchResult = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={[styles.userItem, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => addCollaborator(item)}
        >
            <Image
                source={{ uri: item.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
            />
            <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
            <Ionicons name="add-circle" size={24} color="#10B981" />
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('collaborators.title')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('collaborators.add')}</Text>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={[styles.searchInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                            placeholder={t('collaborators.searchPlaceholder')}
                            placeholderTextColor={colors.subtext}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={searchUsers}
                        />
                        <TouchableOpacity
                            style={[styles.searchButton, { backgroundColor: '#FACC15' }]}
                            onPress={searchUsers}
                            disabled={searching}
                        >
                            {searching ? (
                                <ActivityIndicator color="#000" size="small" />
                            ) : (
                                <Ionicons name="search" size={20} color="#000" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {searchResults.length > 0 && (
                        <View style={styles.resultsContainer}>
                            <FlatList
                                data={searchResults}
                                renderItem={renderSearchResult}
                                keyExtractor={item => item.id}
                                style={{ maxHeight: 150 }}
                            />
                        </View>
                    )}

                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>{t('collaborators.current')}</Text>
                    {loading ? (
                        <ActivityIndicator size="large" color="#FACC15" style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={collaborators}
                            renderItem={renderCollaborator}
                            keyExtractor={item => item.id}
                            ListEmptyComponent={
                                <Text style={[styles.emptyText, { color: colors.subtext }]}>{t('collaborators.noCollaborators')}</Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%',
        width: '100%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
    },
    closeButton: {
        padding: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
    },
    searchButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultsContainer: {
        marginBottom: 10,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    username: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    removeButton: {
        padding: 4,
    },
    emptyText: {
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 10,
        fontFamily: 'Poppins_400Regular',
    }
});
