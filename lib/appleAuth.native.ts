import * as AppleAuthentication from 'expo-apple-authentication';

export const signInWithAppleNative = async () => {
    const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
    });
    return credential;
};
