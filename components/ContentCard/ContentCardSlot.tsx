import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthProvider';
import { useAppConfig } from '../../context/AppConfigProvider';
import { usePremium } from '../../hooks/usePremium';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { getDateFnsLocale } from '../../lib/dateUtils';
import { supabase } from '../../lib/supabase';
import { analytics } from '../../lib/analytics';
import {
    CardPlacement,
    ContentCardData,
    contentCardsService,
    localized,
    safeCtaUrl,
} from '../../services/contentCardsService';

/**
 * Renders the server-driven cards for one place in the app (Module 7). Nothing is rendered when
 * the content_cards flag is off or no card targets this placement / user.
 */
export const ContentCardSlot: React.FC<{ placement: CardPlacement; style?: ViewStyle }> = ({ placement, style }) => {
    const { config } = useAppConfig();
    const { isPremium } = usePremium();
    const { language } = useLanguage();
    const [cards, setCards] = useState<ContentCardData[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        if (!config.content_cards) return;
        const [all, gone] = await Promise.all([contentCardsService.fetchAll(), contentCardsService.getDismissed()]);
        setCards(all);
        setDismissed(gone);
    }, [config.content_cards]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const visible = useMemo(
        () => contentCardsService.select(cards, { placement, isPremium, language, dismissed }),
        [cards, placement, isPremium, language, dismissed],
    );

    if (!config.content_cards || !visible.length) return null;

    return (
        <View style={[styles.slot, style]}>
            {visible.map(card => (
                <ContentCard
                    key={card.id}
                    card={card}
                    onDismiss={async () => {
                        analytics.track('content_card_dismissed', { card_id: card.id, type: card.type });
                        setDismissed(await contentCardsService.dismiss(card.id));
                    }}
                />
            ))}
        </View>
    );
};

const ContentCard: React.FC<{ card: ContentCardData; onDismiss: () => void }> = ({ card, onDismiss }) => {
    const { colors } = useTheme();
    const { t, language } = useLanguage();

    useEffect(() => {
        analytics.track('content_card_viewed', { card_id: card.id, type: card.type });
    }, [card.id, card.type]);

    const icon = card.type === 'poll' ? 'bar-chart' : card.type === 'beta_signup' ? 'flask' : 'megaphone';
    const body = localized(card.body, language);

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.header}>
                <Ionicons name={icon} size={16} color={colors.primary} />
                <Text style={[styles.title, { color: colors.text }]}>{localized(card.title, language)}</Text>
                {card.dismissible && (
                    <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={t('common.close')}>
                        <Ionicons name="close" size={18} color={colors.subtext} />
                    </TouchableOpacity>
                )}
            </View>
            {!!body && <Text style={[styles.body, { color: colors.subtext }]}>{body}</Text>}
            {card.type === 'poll' && <PollBody card={card} />}
            {card.type === 'announcement' && <AnnouncementBody card={card} />}
            {card.type === 'beta_signup' && <BetaBody card={card} />}
        </View>
    );
};

// --- Poll ---------------------------------------------------------------------

const PollBody: React.FC<{ card: ContentCardData }> = ({ card }) => {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { isPremium, openPaywall } = usePremium();
    const requireAuth = useRequireAuth();
    const [myVote, setMyVote] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, number> | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const options = card.payload.options ?? [];
    const ended = !!card.ends_at && new Date(card.ends_at).getTime() <= Date.now();

    const refresh = useCallback(async () => {
        if (user) setMyVote(await contentCardsService.getMyVote(card.id, user.id));
        setResults(await contentCardsService.getResults(card.id));
    }, [card.id, user]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const vote = (optionId: string) => {
        if (myVote || ended || busy) return;
        requireAuth('default', async () => {
            if (!isPremium) {
                analytics.track('premium_gate_tapped', { feature: 'content_cards', source: 'poll' });
                openPaywall('poll', 'content_cards');
                return;
            }
            const { data } = await supabase.auth.getSession();
            const uid = data.session?.user.id;
            if (!uid) return;
            setBusy(optionId);
            try {
                await contentCardsService.vote(card.id, uid, optionId);
                setMyVote(optionId);
                analytics.track('poll_voted', { card_id: card.id });
                setResults(await contentCardsService.getResults(card.id));
            } catch (e) {
                console.warn('Vote failed:', e);
            } finally {
                setBusy(null);
            }
        });
    };

    const total = results ? Object.values(results).reduce((a, b) => a + b, 0) : 0;

    return (
        <View style={styles.pollOptions}>
            {options.map(option => {
                const count = results?.[option.id] ?? 0;
                const share = total ? count / total : 0;
                const mine = myVote === option.id;
                return (
                    <TouchableOpacity
                        key={option.id}
                        onPress={() => vote(option.id)}
                        disabled={!!myVote || ended || !!busy}
                        style={[styles.option, { borderColor: mine ? colors.primary : colors.border }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: mine }}
                    >
                        {results && (
                            <View style={[StyleSheet.absoluteFill, styles.optionFill, { width: `${share * 100}%`, backgroundColor: colors.primary + '33' }]} />
                        )}
                        <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={2}>{localized(option.label, language)}</Text>
                        {busy === option.id ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : results ? (
                            <Text style={[styles.optionPct, { color: colors.text }]}>{Math.round(share * 100)}%</Text>
                        ) : mine ? (
                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        ) : !isPremium && !ended ? (
                            <Ionicons name="lock-closed" size={14} color={colors.subtext} />
                        ) : null}
                    </TouchableOpacity>
                );
            })}
            <Text style={[styles.meta, { color: colors.subtext }]}>
                {ended
                    ? t('contentCards.pollEnded', { count: total })
                    : myVote
                        ? (results ? t('contentCards.votes', { count: total }) : t('contentCards.voted'))
                        : !isPremium
                            ? t('contentCards.premiumToVote')
                            : card.ends_at
                                ? t('contentCards.endsOn', { date: format(new Date(card.ends_at), 'd MMM', { locale: getDateFnsLocale(language) }) })
                                : t('contentCards.tapToVote')}
            </Text>
        </View>
    );
};

// --- Announcement --------------------------------------------------------------

const AnnouncementBody: React.FC<{ card: ContentCardData }> = ({ card }) => {
    const { colors } = useTheme();
    const { language } = useLanguage();
    const router = useRouter();
    const image = card.payload.image_url && /^https:\/\//i.test(card.payload.image_url) ? card.payload.image_url : null;
    const url = safeCtaUrl(card.payload.cta?.url);
    const label = localized(card.payload.cta?.label, language);

    const open = () => {
        if (!url) return;
        analytics.track('content_card_cta', { card_id: card.id, type: card.type });
        if (url.startsWith('/')) router.push(url as any);
        else Linking.openURL(url);
    };

    return (
        <>
            {image && <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />}
            {url && !!label && (
                <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={open}>
                    <Text style={styles.ctaText}>{label}</Text>
                    <Ionicons name={url.startsWith('/') ? 'arrow-forward' : 'open-outline'} size={14} color="#111827" />
                </TouchableOpacity>
            )}
        </>
    );
};

// --- Beta sign-up --------------------------------------------------------------

const BetaBody: React.FC<{ card: ContentCardData }> = ({ card }) => {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const requireAuth = useRequireAuth();
    const [joined, setJoined] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (user) contentCardsService.isSignedUp(card.id, user.id).then(setJoined);
    }, [card.id, user]);

    const join = () => requireAuth('default', async () => {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) return;
        setBusy(true);
        try {
            await contentCardsService.signUp(card.id, uid);
            setJoined(true);
            analytics.track('beta_signed_up', { card_id: card.id });
        } catch (e) {
            console.warn('Beta sign-up failed:', e);
        } finally {
            setBusy(false);
        }
    });

    if (joined) {
        return (
            <View style={styles.joined}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <Text style={[styles.meta, { color: colors.text, marginTop: 0 }]}>
                    {localized(card.payload.success, language) || t('contentCards.betaJoined')}
                </Text>
            </View>
        );
    }
    return (
        <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={join} disabled={busy}>
            {busy
                ? <ActivityIndicator size="small" color="#111827" />
                : <Text style={styles.ctaText}>{localized(card.payload.cta?.label, language) || t('contentCards.betaJoin')}</Text>}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    slot: { gap: 12 },
    card: { borderRadius: 18, borderWidth: 1, padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontFamily: 'Poppins_700Bold', fontSize: 15 },
    body: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 19, marginTop: 6 },
    pollOptions: { gap: 8, marginTop: 12 },
    option: {
        flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10, overflow: 'hidden',
    },
    optionFill: { right: undefined, borderRadius: 0 },
    optionText: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
    optionPct: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
    meta: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 4 },
    image: { width: '100%', height: 140, borderRadius: 12, marginTop: 12 },
    cta: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 12, paddingVertical: 10, marginTop: 12,
    },
    ctaText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#111827' },
    joined: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
});
