
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface DayTabsProps {
    selectedDay: string;
    onSelectDay: (day: string) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
// Estimated Tab Width including margin/padding calculation
const TAB_WIDTH = 100;

export const DayTabs: React.FC<DayTabsProps> = ({ selectedDay, onSelectDay }) => {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        const index = DAYS.indexOf(selectedDay);
        if (index !== -1 && scrollViewRef.current) {
            // Calculate position to center the tab
            // Screen Width / 2 - Tab Width / 2
            const screenWidth = Dimensions.get('window').width;
            const x = (index * TAB_WIDTH) - (screenWidth / 2) + (TAB_WIDTH / 2);

            scrollViewRef.current.scrollTo({
                x: Math.max(0, x),
                animated: true
            });
        }
    }, [selectedDay]);

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {DAYS.map((day) => {
                    const isSelected = selectedDay === day;
                    return (
                        <TouchableOpacity
                            key={day}
                            onPress={() => onSelectDay(day)}
                            style={[
                                styles.tab,
                                {
                                    backgroundColor: isSelected ? '#FACC15' : colors.card,
                                    borderColor: isSelected ? '#FACC15' : colors.border
                                }
                            ]}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    {
                                        color: isSelected ? '#000000' : colors.subtext,
                                        fontWeight: isSelected ? '700' : '500'
                                    }
                                ]}
                            >
                                {t(`calendar.days.${day}`)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 50,
        marginBottom: 10,
    },
    scrollContent: {
        paddingHorizontal: 0,
        alignItems: 'center',
        gap: 10,
        // Ensure we have enough space
        paddingRight: 20
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        // Min width to make scrolling predictable?
        minWidth: 80,
        alignItems: 'center',
    },
    tabText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        textTransform: 'capitalize',
    },
});
