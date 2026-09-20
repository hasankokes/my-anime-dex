import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function ArenaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="setup" />
      <Stack.Screen name="game" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
