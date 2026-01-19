
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface DayTabsProps {
    selectedDay: string;
    onSelectDay: (day: string) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const DayTabs: React.FC<DayTabsProps> = ({ selectedDay, onSelectDay }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const index = DAYS.indexOf(selectedDay);
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5 // Center the item
            });
        }
    }, [selectedDay]);

    const renderItem = ({ item: day }: { item: string }) => {
        const isSelected = selectedDay === day;
        return (
            <TouchableOpacity
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
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={DAYS}
                renderItem={renderItem}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                onScrollToIndexFailed={(info) => {
                    const wait = new Promise(resolve => setTimeout(resolve, 500));
                    wait.then(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
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
        paddingHorizontal: 20, // Align with list content
        gap: 10,
        alignItems: 'center',
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        minWidth: 80,
        alignItems: 'center',
    },
    tabText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        textTransform: 'capitalize',
    },
});
