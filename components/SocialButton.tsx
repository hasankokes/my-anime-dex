import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../lib/i18n';

interface SocialButtonProps {
  provider: 'apple' | 'google';
  onPress: () => void;
  isLoading?: boolean;
  iconOnly?: boolean;
  style?: ViewStyle;
}

const { width, height } = Dimensions.get('window');
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;
const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
const normalize = (size: number) => Math.round(size * scale);

export const SocialButton: React.FC<SocialButtonProps> = ({ provider, onPress, isLoading, iconOnly, style }) => {
  const isApple = provider === 'apple';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isApple ? styles.appleButton : styles.googleButton,
        iconOnly && styles.iconOnlyButton,
        style
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={isApple ? '#FFF' : '#000'} />
      ) : (
        <>
          {isApple ? (
            <Ionicons
              name="logo-apple"
              size={normalize(24)}
              color="white"
              style={iconOnly ? undefined : styles.icon}
            />
          ) : (
            <Image
              source={require('../assets/images/google-logo.png')}
              style={[iconOnly ? undefined : styles.icon, { width: normalize(24), height: normalize(24) }]}
            />
          )}
          {!iconOnly && (
            <Text style={[styles.text, isApple ? styles.appleText : styles.googleText]}>
              {isApple ? i18n.t('common.continueWithApple') : 'Continue with Google'}
            </Text>
          )}
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
    height: normalize(50), // Reduced from 56
    borderRadius: normalize(28),
    width: '100%',
    marginBottom: normalize(16),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  iconOnlyButton: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(25),
    marginBottom: 0,
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
    marginRight: normalize(12),
  },
  text: {
    fontSize: normalize(16),
    fontFamily: 'Poppins_600SemiBold',
  },
  appleText: {
    color: '#FFFFFF',
  },
  googleText: {
    color: '#000000',
  },
});
