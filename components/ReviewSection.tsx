import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    FlatList,
    Alert,
    Modal,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { StarRating } from './StarRating';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { calculateLevelFromXp } from '../lib/levelSystem';

type Review = {
    id: string;
    user_id: string;
    rating: number;
    comment: string;
    created_at: string;
    profiles: {
        username: string;
        avatar_url: string;
    } | {
        username: string;
        avatar_url: string;
    }[];
};

type ReviewSectionProps = {
    animeId: string;
};

export const ReviewSection = ({ animeId }: ReviewSectionProps) => {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [myReview, setMyReview] = useState<Review | null>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter(); // Initialize Router

    useEffect(() => {
        fetchReviews();
    }, [animeId]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
                .eq('anime_id', animeId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setReviews(data || []);

            // Check if current user has a review
            const { data: { session } } = await supabase.auth.getSession();
            if (session && data) {
                const userReview = data.find(r => r.user_id === session.user.id);
                if (userReview) {
                    setMyReview(userReview);
                    setRating(userReview.rating);
                    setComment(userReview.comment);
                }
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert(t('animeDetail.ratingRequired'), t('animeDetail.selectRating'));
            return;
        }

        try {
            setSubmitting(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                Alert.alert(t('animeDetail.loginRequired'), t('animeDetail.loginToReview'));
                return;
            }

            const payload = {
                user_id: session.user.id,
                anime_id: animeId,
                rating,
                comment,
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase
                .from('reviews')
                .upsert(payload, { onConflict: 'user_id, anime_id' })
                .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
                .single();

            if (error) throw error;

            // Update Local State optimally
            if (data) {
                setReviews(prev => {
                    const others = prev.filter(r => r.user_id !== session.user.id);
                    return [data, ...others];
                });
                setMyReview(data);

                // --- AWARD XP LOGIC ---
                // Fetch current profile to get current XP
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('xp')
                    .eq('id', session.user.id)
                    .single();

                if (!profileError && profileData) {
                    const currentXp = profileData.xp || 0;
                    const newXp = currentXp + 2;
                    const newLevel = calculateLevelFromXp(newXp);

                    // Update profile
                    await supabase
                        .from('profiles')
                        .update({ xp: newXp, level: newLevel })
                        .eq('id', session.user.id);


                }
                // ----------------------
            }

            setModalVisible(false);
            Alert.alert(t('common.success'), t('animeDetail.reviewPublished'));

        } catch (error) {
            console.error('Error submitting review:', error);
            Alert.alert(t('common.error'), t('animeDetail.failedToPublish'));
        } finally {
            setSubmitting(false);
        }
    };

    const renderReviewItem = ({ item }: { item: Review }) => {
        // Handle potential array response from Supabase
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        const avatarUrl = profile?.avatar_url || 'https://via.placeholder.com/40';
        const username = profile?.username || 'User';

        return (
            <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        onPress={() => router.push(`/users/${item.user_id}`)}
                    >
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.avatar}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.username, { color: colors.text }]}>
                                {username}
                            </Text>
                            <Text style={[styles.date, { color: colors.subtext }]}>
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <StarRating rating={item.rating} onRatingChange={() => { }} readOnly size={14} />
                </View>
                {item.comment ? (
                    <Text style={[styles.comment, { color: colors.text }]}>{item.comment}</Text>
                ) : null}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header / Expand Toggle */}
            <TouchableOpacity
                style={[styles.headerButton, { borderBottomColor: colors.border }]}
                onPress={() => setExpanded(!expanded)}
            >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('animeDetail.reviews')} ({reviews.length})
                </Text>
                <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.subtext}
                />
            </TouchableOpacity>

            {/* Expanded Content */}
            {expanded && (
                <View style={styles.content}>
                    {/* Add Review Button */}
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.addButtonText}>
                            {myReview ? t('animeDetail.editReview') : t('animeDetail.writeReview')}
                        </Text>
                    </TouchableOpacity>

                    {loading ? (
                        <ActivityIndicator size="small" color="#FACC15" />
                    ) : reviews.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>
                            {t('animeDetail.noReviews')}
                        </Text>
                    ) : (
                        <FlatList
                            data={reviews}
                            scrollEnabled={false} // Nested in main ScrollView
                            renderItem={renderReviewItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ gap: 12 }}
                        />
                    )}
                </View>
            )}

            {/* Write Review Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('animeDetail.rateAnime')}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.ratingContainer}>
                            <StarRating rating={rating} onRatingChange={setRating} size={40} />
                        </View>

                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg }]}
                            placeholder={t('animeDetail.reviewPlaceholder')}
                            placeholderTextColor={colors.subtext}
                            multiline
                            numberOfLines={4}
                            value={comment}
                            onChangeText={setComment}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.submitButtonText}>{t('animeDetail.submitReview')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        backgroundColor: 'transparent',
    },
    headerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    content: {
        gap: 16,
    },
    emptyText: {
        textAlign: 'center',
        fontFamily: 'Poppins_500Medium',
        paddingVertical: 20,
    },
    addButton: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 8,
    },
    addButtonText: {
        fontFamily: 'Poppins_600SemiBold',
        color: '#000',
        fontSize: 14,
    },
    reviewCard: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    username: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
    },
    date: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
    },
    comment: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
        lineHeight: 20,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
    },
    ratingContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    input: {
        borderRadius: 12,
        padding: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        fontSize: 15,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 24,
    },
    submitButton: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        color: '#000',
    },
});
