import React, {useEffect, useRef, useState} from 'react';
import {styled, css} from 'kstyled';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button, LoadingIndicator, Typography} from 'cpk-ui';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {useAuthActions} from '@convex-dev/auth/react';
import {useConvexAuth, useMutation} from 'convex/react';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {api} from '../convex/_generated/api';
import {t} from '../src/STRINGS';
import {logError} from '../src/utils/error';
import {logScreenView} from '../src/utils/analytics';
import {useAfterSignIn} from '../src/hooks/useAfterSignIn';
import {
  clearPendingSignInLink,
  readPendingSignInLink,
} from '../src/utils/signInLink';

type LinkState = 'signingIn' | 'expired' | 'otherDevice' | 'failed';

export default function SignInLink(): JSX.Element {
  const {code} = useLocalSearchParams<{code?: string}>();
  const {replace} = useRouter();
  const {setSession} = useAuthActions();
  const {isLoading} = useConvexAuth();
  const signInWithLink = useMutation(api.emailAuth.signInWithLink);
  // Without the secret saved when the link was sent, the link was opened on
  // another device (or the app was reinstalled since).
  const [state, setState] = useState<LinkState>(() =>
    code && readPendingSignInLink() ? 'signingIn' : 'otherDevice',
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'sign-in-link',
        screen_class: 'SignInLink',
      });
  }, []);

  useAfterSignIn({
    method: 'email_link',
    enabled: true,
    onFailed: () => setState('failed'),
  });

  // Present the link once, after the stored session (if any) has loaded.
  useEffect(() => {
    if (isLoading || startedRef.current) return;
    startedRef.current = true;

    const pending = readPendingSignInLink();
    if (!code || !pending) return;

    void (async () => {
      try {
        const result = await signInWithLink({
          emailCode: code,
          browserSecret: pending.browserSecret,
        });
        if (result.status !== 'complete') {
          // Keep the secret: an older link may have been opened, and the
          // newest one must still work.
          setState('expired');
          return;
        }
        clearPendingSignInLink();
        await setSession(result.tokens);
      } catch (error) {
        logError(error, 'sign-in-link');
        setState('failed');
      }
    })();
  }, [isLoading, code, signInWithLink, setSession]);

  const message =
    state === 'expired'
      ? t('signInLink.expired')
      : state === 'otherDevice'
        ? t('signInLink.otherDevice')
        : state === 'failed'
          ? t('error.message')
          : t('signInLink.signingIn');

  return (
    <Container>
      <Stack.Screen options={{headerShown: false}} />
      <Content>
        <View
          style={css`
            gap: 24px;
            align-items: center;
          `}
        >
          {state === 'signingIn' ? <LoadingIndicator /> : null}
          <Typography.Body1
            style={css`
              text-align: center;
            `}
          >
            {message}
          </Typography.Body1>
        </View>
        {state === 'signingIn' ? null : (
          <Footer>
            <Button
              hapticFeedback={ImpactFeedbackStyle.Soft}
              styles={{
                container: css`
                  height: 56px;
                  border-width: 0;
                `,
              }}
              borderRadius={16}
              text={t('signInLink.retry')}
              onPress={() => replace('/sign-in')}
            />
          </Footer>
        )}
      </Content>
    </Container>
  );
}

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const Content = styled.View`
  flex: 1;
  padding: 0 28px;
  justify-content: center;
`;

const Footer = styled.View`
  position: absolute;
  left: 28px;
  right: 28px;
  bottom: 16px;
`;
