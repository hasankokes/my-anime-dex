import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';

export default function CreateListScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showAdIfNeeded } = useInterstitialAd();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a list title');
            return;
        }

        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                Alert.alert('Error', 'You must be logged in to create a list');
                return;
            }

            const { error } = await supabase
                .from('lists')
                .insert({
                    user_id: session.user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    is_public: isPublic
                });

            if (error) throw error;

            Alert.alert('Success', 'List created!');
            showAdIfNeeded('create_list');
            router.back();
        } catch (error) {
            console.error('Error creating list:', error);
            Alert.alert('Error', 'Failed to create list');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>New List</Text>
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={loading || !title.trim()}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#FACC15" />
                    ) : (
                        <Text style={[styles.saveText, { color: title.trim() ? '#FACC15' : colors.subtext }]}>Create</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Title</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g. My Favorite Isekai"
                        placeholderTextColor={colors.subtext}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={50}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Description (Optional)</Text>
                    <TextInput
                        style={[styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        placeholder="What needs to be watched..."
                        placeholderTextColor={colors.subtext}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        maxLength={200}
                        textAlignVertical="top"
                    />
                </View>

                <View style={[styles.switchRow, { borderColor: colors.border }]}>
                    <View>
                        <Text style={[styles.switchLabel, { color: colors.text }]}>Public List</Text>
                        <Text style={[styles.switchSubLabel, { color: colors.subtext }]}>
                            Anyone can see this list when visiting your profile
                        </Text>
                    </View>
                    <Switch
                        value={isPublic}
                        onValueChange={setIsPublic}
                        trackColor={{ false: '#374151', true: '#FACC15' }}
                        thumbColor={'#FFFFFF'}
                    />
                </View>
            </View>
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
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    iconButton: {
        padding: 4,
    },
    saveText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    form: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        minHeight: 100,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        marginTop: 10,
    },
    switchLabel: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    switchSubLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        maxWidth: 250,
        marginTop: 2,
    },
});
