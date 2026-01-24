import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from '../../components/StarRating';
import { formatDistanceToNow } from 'date-fns';
import { jikanApi } from '../../lib/jikan';

type MyReview = {
    id: string;
    anime_id: string;
    rating: number;
    comment: string;
    created_at: string;
    anime_title?: string;
    anime_image?: string;
};

export default function MyReviewsScreen() {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();
    const [reviews, setReviews] = useState<MyReview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyReviews();
    }, []);

    const fetchMyReviews = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setLoading(false);
                return;
            }

            // 1. Fetch user's reviews
            const { data: reviewsData, error: reviewsError } = await supabase
                .from('reviews')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (reviewsError) throw reviewsError;

            if (!reviewsData || reviewsData.length === 0) {
                setReviews([]);
                setLoading(false);
                return;
            }

            // 2. Fetch anime details for these reviews from user_anime_list to get title/image
            // We'll collect all anime_ids
            const animeIds = reviewsData.map(r => r.anime_id);

            const { data: animeData, error: animeError } = await supabase
                .from('user_anime_list')
                .select('anime_id, anime_title, anime_image')
                .eq('user_id', session.user.id)
                .in('anime_id', animeIds);

            // 3. enrich reviews. If missing from animeData, fetch from Jikan
            const enrichedReviews = await Promise.all(reviewsData.map(async (review) => {
                const cachedAnime = animeData?.find(a => a.anime_id === review.anime_id);

                let title = cachedAnime?.anime_title;
                let image = cachedAnime?.anime_image;

                if (!title || !image) {
                    try {
                        console.log(`Fetching details for anime: ${review.anime_id}`);
                        const { data: jikanData } = await jikanApi.getAnimeDetails(review.anime_id);
                        if (jikanData) {
                            title = jikanData.title_english || jikanData.title;
                            image = jikanData.images?.jpg?.large_image_url;
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch details for anime ${review.anime_id}:`, e);
                        title = t('common.unknown');
                    }
                }

                return {
                    ...review,
                    anime_title: title,
                    anime_image: image
                };
            }));

            setReviews(enrichedReviews);

        } catch (error) {
            console.error('Error fetching my reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: MyReview }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/anime/${item.anime_id}`)}
        >
            <Image
                source={{ uri: item.anime_image || 'https://via.placeholder.com/100' }}
                style={styles.animeImage}
            />
            <View style={styles.contentContainer}>
                <Text style={[styles.animeTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.anime_title || t('common.unknown')}
                </Text>

                <View style={styles.ratingRow}>
                    <StarRating rating={item.rating} size={14} readOnly onRatingChange={() => { }} />
                    <Text style={[styles.date, { color: colors.subtext }]}>
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </Text>
                </View>

                {item.comment ? (
                    <Text style={[styles.comment, { color: colors.subtext }]} numberOfLines={2}>
                        {item.comment}
                    </Text>
                ) : null}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Custom Header similar to My Lists */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.myReviews')}</Text>
                <View style={{ width: 36 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#FACC15" />
                </View>
            ) : reviews.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="chatbubbles-outline" size={64} color={colors.border} />
                    <Text style={[styles.emptyText, { color: colors.subtext }]}>{t('animeDetail.noReviews')}</Text>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 8,
    },
    animeImage: {
        width: 60,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#333'
    },
    contentContainer: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center'
    },
    animeTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6
    },
    date: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
    },
    comment: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 18
    },
    emptyText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 16,
    }
});
