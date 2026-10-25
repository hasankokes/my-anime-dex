import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { DISCOVER_GENRES } from '../../services/recommendationService';
import { genreLabel } from './discoverText';

export const MAX_PICKED_GENRES = 5;

interface Props {
  selected: string[];
  onChange: (genres: string[]) => void;
}

/** Multi-select genre chips (up to MAX_PICKED_GENRES) */
export const GenrePicker: React.FC<Props> = ({ selected, onChange }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const toggle = (g: string) => {
    if (selected.includes(g)) onChange(selected.filter(x => x !== g));
    else if (selected.length < MAX_PICKED_GENRES) onChange([...selected, g]);
  };

  return (
    <View style={styles.grid}>
      {DISCOVER_GENRES.map(g => {
        const active = selected.includes(g);
        const disabled = !active && selected.length >= MAX_PICKED_GENRES;
        return (
          <TouchableOpacity
            key={g}
            onPress={() => toggle(g)}
            disabled={disabled}
            style={[
              styles.chip,
              active
                ? { backgroundColor: '#FACC15', borderColor: '#FACC15' }
                : { backgroundColor: colors.background, borderColor: colors.border, opacity: disabled ? 0.45 : 1 },
            ]}
          >
            {active && <Ionicons name="checkmark" size={13} color="#000" />}
            <Text style={[styles.chipText, { color: active ? '#000' : colors.text }]}>{genreLabel(t, g)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12.5,
  },
});
