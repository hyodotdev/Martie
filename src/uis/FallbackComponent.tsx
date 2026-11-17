import React, {useCallback} from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {reloadAsync} from 'expo-updates';

import {t} from '../STRINGS';
import {APP_STORE_URLS, MARTIE_SHARE_URL} from '../utils/constants';

const STORE_URL_OPTIONS = {
  ...APP_STORE_URLS,
  web: MARTIE_SHARE_URL,
  default: MARTIE_SHARE_URL,
};

function FallbackComponent(): JSX.Element {
  const handleReload = useCallback(() => {
    void reloadAsync().catch(() => {
      // A reload failure should not replace the already visible fallback.
    });
  }, []);

  const handleOpenStore = useCallback(() => {
    const appStoreUrl = Platform.select(STORE_URL_OPTIONS);
    if (!appStoreUrl) return;

    void Linking.openURL(appStoreUrl).catch(() => {
      // Keep the fallback visible if the store cannot be opened.
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('error.title')}
        </Text>
        <Text style={styles.message}>{t('error.message')}</Text>
        <Text style={styles.hint}>{t('error.updateMessage')}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={t('error.updateButton')}
            accessibilityRole="button"
            onPress={handleOpenStore}
            style={[styles.button, styles.secondaryButton]}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              {t('error.updateButton')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t('error.tryAgain')}
            accessibilityRole="button"
            onPress={handleReload}
            style={[styles.button, styles.primaryButton]}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {t('error.tryAgain')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    gap: 14,
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
    textAlign: 'center',
  },
  hint: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#111827',
  },
});

export default FallbackComponent;
