import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { getDateFnsLocale } from '../../lib/dateUtils';

interface DayTabsProps {
    /** Consecutive days starting with today */
    days: Date[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ITEM_WIDTH = 96;
const ITEM_GAP = 10;

export const DayTabs: React.FC<DayTabsProps> = ({ days, selectedIndex, onSelect }) => {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const scrollRef = useRef<ScrollView>(null);
    const locale = getDateFnsLocale(language);

    // Keep the selected tab roughly in view (e.g. after jumping back to today)
    useEffect(() => {
        scrollRef.current?.scrollTo({ x: Math.max(0, (selectedIndex - 1) * (ITEM_WIDTH + ITEM_GAP)), animated: true });
    }, [selectedIndex]);

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {days.map((date, index) => {
                    const isSelected = index === selectedIndex;
                    const label = index === 0
                        ? t('calendar.today')
                        : index === 1
                            ? t('calendar.tomorrow')
                            : t(`calendar.days.${WEEKDAY_KEYS[date.getDay()]}`);

                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => onSelect(index)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isSelected }}
                            style={[
                                styles.tab,
                                {
                                    backgroundColor: isSelected ? colors.primary : colors.card,
                                    borderColor: isSelected ? colors.primary : colors.border,
                                },
                            ]}
                        >
                            <Text
                                style={[styles.tabText, { color: isSelected ? '#000000' : colors.text }]}
                                numberOfLines={1}
                            >
                                {label}
                            </Text>
                            <Text
                                style={[styles.dateText, { color: isSelected ? '#000000' : colors.subtext }]}
                                numberOfLines={1}
                            >
                                {format(date, 'd MMM', { locale })}
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
        height: 58,
        marginBottom: 10,
    },
    scrollContent: {
        paddingRight: 20,
        gap: ITEM_GAP,
        alignItems: 'center',
    },
    tab: {
        width: ITEM_WIDTH,
        paddingHorizontal: 5,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        lineHeight: 18,
    },
    dateText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        lineHeight: 15,
    },
});
