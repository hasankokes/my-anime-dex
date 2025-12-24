import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export const OfflineBanner = () => {
    const { isConnected, isInternetReachable } = useNetwork();
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState(false);

    // Show if disconnected OR connected but no internet
    const isOffline = !isConnected || (isConnected && isInternetReachable === false);

    if (!isOffline) return null;

    return (
        <Animated.View
            entering={FadeInUp.duration(500)}
            exiting={FadeOutUp.duration(500)}
            style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 10) }]}
        >
            <View style={styles.content}>
                <Ionicons name="cloud-offline" size={20} color="#FFFFFF" style={styles.icon} />
                <View style={styles.textContainer}>
                    <Text style={styles.title}>No Internet Connection</Text>
                    <Text style={styles.subtitle}>Some features may be unavailable.</Text>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#EF4444', // Red warning color
        zIndex: 9999, // Ensure it's on top
        paddingBottom: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontFamily: 'Poppins_600SemiBold', // Assuming you have this font
        fontSize: 14,
    },
    subtitle: {
        color: '#FECACA',
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
    }
});
