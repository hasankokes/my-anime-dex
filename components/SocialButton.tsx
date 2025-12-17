import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SocialButtonProps {
  provider: 'apple' | 'google';
  onPress: () => void;
  isLoading?: boolean;
}

export const SocialButton: React.FC<SocialButtonProps> = ({ provider, onPress, isLoading }) => {
  const isApple = provider === 'apple';
  
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        isApple ? styles.appleButton : styles.googleButton
      ]} 
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={isApple ? '#FFF' : '#000'} />
      ) : (
        <>
          <Ionicons 
            name={isApple ? "logo-apple" : "logo-google"} 
            size={24} 
            color={isApple ? "white" : "black"} 
            style={styles.icon}
          />
          <Text style={[styles.text, isApple ? styles.appleText : styles.googleText]}>
            Continue with {isApple ? 'Apple' : 'Google'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    width: '100%',
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: '#1A1A1A',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  appleText: {
    color: '#FFFFFF',
  },
  googleText: {
    color: '#000000',
  },
});
