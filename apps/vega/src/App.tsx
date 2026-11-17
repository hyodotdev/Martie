import React, {useCallback, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from '@amazon-devices/react-native-kepler';
import {WebView} from '@amazon-devices/webview';

const MARTIE_WEB_URL = 'https://hyo.dev/martie';

export const App = () => {
  const [loadKey, setLoadKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryFocused, setRetryFocused] = useState(false);

  const retry = useCallback(() => {
    setLoadError(null);
    setLoadKey((current) => current + 1);
  }, []);

  if (loadError) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.title}>Martie</Text>
        <Text style={styles.message}>
          Martie could not load. Check the network connection and try again.
        </Text>
        <Pressable
          focusable
          hasTVPreferredFocus
          onBlur={() => setRetryFocused(false)}
          onFocus={() => setRetryFocused(true)}
          onPress={retry}
          style={[styles.retryButton, retryFocused && styles.retryButtonFocus]}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={loadKey}
        hasTVPreferredFocus={true}
        javaScriptEnabled={true}
        onError={(event: {nativeEvent?: {description?: string}}) => {
          setLoadError(event.nativeEvent?.description ?? 'Unknown load error');
        }}
        onLoad={() => setLoadError(null)}
        source={{uri: MARTIE_WEB_URL}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: '#111111',
    padding: 64,
  },
  title: {
    color: '#f5f5f5',
    fontSize: 56,
    fontWeight: '700',
  },
  message: {
    maxWidth: 760,
    color: '#d8d8d8',
    fontSize: 28,
    lineHeight: 38,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  retryButtonFocus: {
    backgroundColor: '#ffffff',
  },
  retryText: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '700',
  },
});
