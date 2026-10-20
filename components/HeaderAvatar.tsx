import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Fills the round header profile button: the user's avatar, or a profile icon
// for guests and users without an avatar.
export const HeaderAvatar = ({ uri }: { uri?: string | null }) => {
    const { colors } = useTheme();

    if (uri) {
        return <Image source={{ uri }} style={styles.fill} contentFit="cover" />;
    }

    return (
        <View style={[styles.fill, styles.center, { backgroundColor: colors.card }]}>
            <Ionicons name="person" size={18} color={colors.primary} />
        </View>
    );
};

const styles = StyleSheet.create({
    fill: {
        width: '100%',
        height: '100%',
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
