import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

interface PulseEvent {
    id: string;
    username: string;
    anime_id: number;
    anime_title: string;
    anime_image: string;
    action_type: string;
    created_at: string;
}

export const AnimePulse = () => {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();
    const [events, setEvents] = useState<PulseEvent[]>([]);
    
    // Animation for new items
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateXAnim = useRef(new Animated.Value(-50)).current;

    useEffect(() => {
        // Fetch initial data (last 10 items)
        const fetchInitialData = async () => {
            const { data } = await supabase
                .from('watch_activity')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (data) {
                setEvents(data);
                triggerAnimation();
            }
        };

        fetchInitialData();

        // Subscribe to real-time inserts
        const channel = supabase.channel('public:watch_activity')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'watch_activity' },
                (payload) => {
                    const newEvent = payload.new as PulseEvent;
                    setEvents((currentEvents) => {
                        const newArray = [newEvent, ...currentEvents].slice(0, 10);
                        return newArray;
                    });
                    triggerAnimation();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const triggerAnimation = () => {
        fadeAnim.setValue(0);
        translateXAnim.setValue(-50);
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(translateXAnim, {
                toValue: 0,
                duration: 500,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            })
        ]).start();
    };

    if (events.length === 0) return null;

    return (
        <View style={styles.container}>
            <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.feedContainer}
            >
                {events.map((ev, index) => {
                    const isNewest = index === 0;
                    
                    // Parse translation string (fallback if missing)
                    const key = ev.action_type === 'completed' ? 'pulse.completed' : 'pulse.watching';
                    let textTemplate = t(key) || (ev.action_type === 'completed' ? '{user} completed {anime}' : '{user} started watching {anime}');
                    const parts = textTemplate.split(/({user}|{anime})/);
                    
                    return (
                        <Animated.View 
                            key={ev.id} 
                            style={[
                                styles.cardWrapper,
                                isNewest && {
                                    opacity: fadeAnim,
                                    transform: [{ translateX: translateXAnim }]
                                }
                            ]}
                        >
                            <TouchableOpacity 
                                activeOpacity={0.8}
                                onPress={() => router.push(`/anime/${ev.anime_id}`)}
                            >
                                <BlurView 
                                    intensity={isDark ? 30 : 60} 
                                    tint={isDark ? "dark" : "light"} 
                                    style={[
                                        styles.card,
                                        { 
                                            backgroundColor: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(255, 255, 255, 0.6)',
                                            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                            borderWidth: 1,
                                        }
                                    ]}
                                >
                                    <Image 
                                        source={{ uri: ev.anime_image }} 
                                        style={styles.image} 
                                        contentFit="cover"
                                        transition={300}
                                    />
                                    <View style={styles.content}>
                                        <Text style={[styles.actionText, { color: colors.subtext }]} numberOfLines={2}>
                                            {parts.map((part, i) => {
                                                if (part === '{user}') {
                                                    return <Text key={i} style={[styles.bold, { color: colors.text }]}>{ev.username}</Text>;
                                                } else if (part === '{anime}') {
                                                    return <Text key={i} style={[styles.bold, { color: colors.primary }]}>{ev.anime_title}</Text>;
                                                }
                                                return <Text key={i}>{part}</Text>;
                                            })}
                                        </Text>
                                    </View>
                                </BlurView>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        marginBottom: 12,
    },
    feedContainer: {
        gap: 12,
        paddingRight: 20,
    },
    cardWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        width: 260,
    },
    card: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        borderRadius: 16,
    },
    image: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    content: {
        flex: 1,
        marginLeft: 12,
    },
    actionText: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 18,
    },
    bold: {
        fontFamily: 'Poppins_600SemiBold',
    },
    timeText: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#888',
        marginTop: 2,
    }
});
