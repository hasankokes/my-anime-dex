import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthProvider';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  // Guests and signed-in users both start on Home; login opens only when needed.
  return <Redirect href="/(tabs)" />;
}
