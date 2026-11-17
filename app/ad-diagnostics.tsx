import {useEffect} from 'react';
import {Button, Text, View} from 'react-native';
import {Redirect, Stack} from 'expo-router';
import {useAdConsentStore} from '../src/stores/adConsentStore';
import {launchAdTestSuite} from '../src/utils/mobileAdsConfig';
import {logError} from '../src/utils/error';

export default function AdDiagnostics(): JSX.Element {
  const ready = useAdConsentStore((state) => state.isMobileAdsReady);
  const requestConsent = useAdConsentStore((state) => state.requestConsent);
  useEffect(() => {
    if (__DEV__) void requestConsent();
  }, [requestConsent]);

  if (!__DEV__) return <Redirect href="/(tabs)" />;

  return (
    <View style={{flex: 1, padding: 24, justifyContent: 'center'}}>
      <Stack.Screen options={{title: 'Ad diagnostics'}} />
      <Text testID="ad-sdk-status">
        LevelPlay: {ready ? 'ready' : 'waiting for consent / initialization'}
      </Text>
      {!ready && (
        <Button
          title="Retry initialization"
          onPress={() => void requestConsent()}
        />
      )}
      <Button
        testID="ad-test-suite"
        title="Open LevelPlay test suite"
        disabled={!ready}
        onPress={() => {
          void launchAdTestSuite().catch((error: unknown) =>
            logError(error, 'ad_test_suite'),
          );
        }}
      />
    </View>
  );
}
