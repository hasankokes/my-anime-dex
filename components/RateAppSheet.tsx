import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BlurView } from 'expo-blur';

const { height } = Dimensions.get('window');

interface RateAppSheetProps {
    visible: boolean;
    onRate: () => void;
    onClose: () => void;
}

export function RateAppSheet({ visible, onRate, onClose }: RateAppSheetProps) {
    const { colors, isDark } = useTheme();
    const [slideAnim] = useState(new Animated.Value(height));

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 90,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: height,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={onClose}
            animationType="none"
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
                    <View style={styles.backdrop} />
                </TouchableOpacity>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.card,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                    </View>

                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="star" size={40} color="#FACC15" />
                        </View>

                        <Text style={[styles.title, { color: colors.text }]}>Enjoying the app?</Text>
                        <Text style={[styles.subtitle, { color: colors.subtext }]}>
                            Your 5-star rating helps us grow and improve the experience for everyone!
                        </Text>

                        <TouchableOpacity
                            style={[styles.rateButton, { backgroundColor: '#FACC15' }]}
                            onPress={onRate}
                        >
                            <Text style={styles.rateButtonText}>Rate Us</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.laterButton, { backgroundColor: colors.border }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.laterButtonText, { color: colors.text }]}>Not Now</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        minHeight: 300,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        opacity: 0.5,
    },
    content: {
        paddingHorizontal: 24,
        alignItems: 'center',
        paddingBottom: 20,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(250, 204, 21, 0.15)', // Yellow tint
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        fontFamily: 'Poppins_500Medium',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    rateButton: {
        width: '100%',
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: "#FACC15",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    rateButtonText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#000',
    },
    laterButton: {
        width: '100%',
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    laterButtonText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
});
