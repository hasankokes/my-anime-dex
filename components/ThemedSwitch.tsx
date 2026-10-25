import React from 'react';
import { Platform, StyleSheet, Switch, SwitchProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// iOS 26 draws UISwitch at 63×28, but React Native still reserves 51×31 for it: the switch
// overflowed its slot and `ios_backgroundColor` was painted as a pill offset from the track.
const IOS_26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

type Props = Omit<SwitchProps, 'trackColor' | 'ios_backgroundColor' | 'thumbColor'>;

/** App-wide switch in theme colors that fits its layout slot on every iOS version. */
export const ThemedSwitch: React.FC<Props> = ({ style, ...props }) => {
    const { colors, isDark } = useTheme();
    const offColor = isDark ? '#4B5563' : '#D1D5DB';

    return (
        <Switch
            {...props}
            trackColor={{ false: offColor, true: colors.primary }}
            // On iOS 26 the native track has its own off color; a background would not line up
            ios_backgroundColor={IOS_26 ? undefined : offColor}
            thumbColor="#FFFFFF"
            style={[IOS_26 && styles.ios26, style]}
        />
    );
};

const styles = StyleSheet.create({
    ios26: {
        width: 63,
        height: 28,
    },
});
