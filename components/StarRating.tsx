import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type StarRatingProps = {
    rating: number;
    onRatingChange: (rating: number) => void;
    readOnly?: boolean;
    size?: number;
};

export const StarRating = ({ rating, onRatingChange, readOnly = false, size = 24 }: StarRatingProps) => {
    return (
        <View style={styles.container}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                    key={star}
                    onPress={() => !readOnly && onRatingChange(star)}
                    disabled={readOnly}
                    style={styles.star}
                >
                    <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={size}
                        color="#FACC15"
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
    },
    star: {
        marginRight: 4,
    },
});
