import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async () => {
        if (!password) {
            Alert.alert('Error', 'Please enter a new password.');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            Alert.alert('Success', 'Your password has been updated!');
            router.replace('/');
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert('Error', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FFFFFF', '#F3F4F6']}
                style={styles.background}
            />

            <View style={styles.content}>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>Enter your new password below.</Text>

                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleUpdatePassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Update Password</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                    <Text style={styles.backText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        padding: 24,
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    title: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        height: 56,
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: '100%',
        fontFamily: 'Poppins_500Medium',
        fontSize: 16,
        color: '#111827',
    },
    primaryButton: {
        backgroundColor: '#FACC15',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
        shadowColor: "#FACC15",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        color: '#000000',
    },
    backLink: {
        alignItems: 'center',
        padding: 8,
    },
    backText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
        color: '#6B7280',
    },
});
