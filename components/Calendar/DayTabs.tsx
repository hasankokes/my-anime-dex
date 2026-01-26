import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface DayTabsProps {
    selectedDay: string;
    onSelectDay: (day: string) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Create a large dataset to simulate infinite scrolling
// 500 weeks = 3500 items. Sufficiently "infinite" for this use case.
const NUM_WEEKS = 500;
const MIDDLE_WEEK = Math.floor(NUM_WEEKS / 2);
const ITEM_WIDTH = 110;
const ITEM_GAP = 10;

export const DayTabs: React.FC<DayTabsProps> = ({ selectedDay, onSelectDay }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const flatListRef = useRef<FlatList>(null);
    const [initialScrollDone, setInitialScrollDone] = useState(false);

    // Generate the data once
    const infiniteDays = useMemo(() => {
        const arr = [];
        for (let i = 0; i < NUM_WEEKS; i++) {
            for (const day of DAYS) {
                arr.push(day);
            }
        }
        return arr;
    }, []);

    // Helper to get the index of the selected day in the middle week
    const getInitialIndex = () => {
        const dayIndex = DAYS.indexOf(selectedDay);
        // Fallback to Monday if somehow not found, though unlikely
        const safeDayIndex = dayIndex === -1 ? 0 : dayIndex;
        // Position at the middle week
        return (MIDDLE_WEEK * 7) + safeDayIndex;
    };

    const initialIndex = getInitialIndex();

    // Handle user tap
    const handlePress = (day: string, index: number) => {
        onSelectDay(day);
        flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5
        });
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={infiniteDays}
                initialScrollIndex={initialIndex}
                // Key needs to be unique for each item in the list
                keyExtractor={(item, index) => `${index}-${item}`}
                renderItem={({ item: day, index }) => {
                    const isSelected = selectedDay === day;
                    return (
                        <TouchableOpacity
                            onPress={() => handlePress(day, index)}
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
                                numberOfLines={1}
                            >
                                {t(`calendar.days.${day}`)}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                getItemLayout={(data, index) => ({
                    length: ITEM_WIDTH,
                    offset: (ITEM_WIDTH + ITEM_GAP) * index,
                    index,
                })}
                onScrollToIndexFailed={(info) => {
                    // Fallback if layout calculation or rendering isn't ready
                    const wait = new Promise(resolve => setTimeout(resolve, 100));
                    wait.then(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0.5 });
                    });
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 50,
        marginBottom: 10,
    },
    scrollContent: {
        paddingRight: 20,
        gap: ITEM_GAP,
        alignItems: 'center',
    },
    tab: {
        // Fixed width to support getItemLayout for infinite scrolling
        width: ITEM_WIDTH,
        paddingHorizontal: 5, // Reduced padding to fit text in fixed width
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        textTransform: 'capitalize',
    },
});
