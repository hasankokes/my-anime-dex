import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { Share } from '../../services/statsService';

/** Horizontal bar list for a genre / studio breakdown. */
export const ShareBars: React.FC<{ items: Share[]; translateName?: (name: string) => string }> = ({ items, translateName }) => {
    const { colors } = useTheme();
    const max = Math.max(1, ...items.map(i => i.count));

    return (
        <View style={styles.list}>
            {items.map(item => (
                <View key={item.name} style={styles.row}>
                    <View style={styles.labelRow}>
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                            {translateName ? translateName(item.name) : item.name}
                        </Text>
                        <Text style={[styles.value, { color: colors.subtext }]}>
                            {item.count} · {Math.round(item.share * 100)}%
                        </Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.inputBg }]}>
                        <View style={[styles.fill, { backgroundColor: colors.primary, width: `${(item.count / max) * 100}%` }]} />
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    list: {
        gap: 12,
    },
    row: {
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    name: {
        flex: 1,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
    },
    value: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
    },
    track: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
});
