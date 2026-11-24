import React, {
  useState,
  useEffect,
  ComponentProps,
  Fragment,
  useRef,
} from 'react';
import {styled, css} from 'kstyled';
import {TouchableWithoutFeedback, Keyboard, View} from 'react-native';
import {
  EditText,
  Button,
  Typography,
  CustomPressable,
  Icon,
  useCPK,
} from 'cpk-ui';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useAuthActions} from '@convex-dev/auth/react';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {getLocale, t} from '../src/STRINGS';
import {normalizeEmail} from '../src/utils/common';
import {logError} from '../src/utils/error';
import {useConvexAuth, useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {
  logEvent,
  LOG_EVENTS,
  logScreenView,
  registerAnalyticsSuperProperties,
} from '../src/utils/analytics';
import {SafeAreaView} from 'react-native-safe-area-context';
import {storage, Storage} from '../src/utils/storage';
import {decodePendingBattle} from '../src/utils/battle';
import {toast} from '@backpackapp-io/react-native-toast';
import {getAcquisitionSource} from '../src/utils/acquisition';

const MAX_CODE_LENGTH = 8;
const HOME_ROUTE = '/(tabs)' as const;

export default function SignInCode(): JSX.Element {
  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'sign-in-code',
        screen_class: 'SignInCode',
      });
  }, []);

  const {signIn} = useAuthActions();
  const {theme} = useCPK();
  const [code, setCode] = useState('');
  const {back, navigate, replace, dismissAll} = useRouter();
  const params = useLocalSearchParams<{email: string}>();
  const email = normalizeEmail(decodeURIComponent(params.email || ''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const createUserProfile = useMutation(api.user.mutations.createUserProfile);
  const applyReferral = useMutation(api.referral.mutations.applyReferral);
  const completeDailyChallenge = useMutation(
    api.dailyChallenge.mutations.completeDailyChallenge,
  );
  const {isAuthenticated} = useConvexAuth();
  const didHandleAuthenticatedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Handle navigation after authentication with improved error handling
  useEffect(() => {
    if (!email) {
      try {
        replace(HOME_ROUTE);
        dismissAll();
      } catch (err) {
        logError(err, 'sign-in-code-no-email');
        navigate(HOME_ROUTE);
      }
      return;
    }

    if (isAuthenticated && !didHandleAuthenticatedRef.current) {
      didHandleAuthenticatedRef.current = true;
      setLoading(true);
      createUserProfile({email})
        .then(async (profile) => {
          if (profile) {
            const source = getAcquisitionSource() ?? 'organic';
            registerAnalyticsSuperProperties({acquisition_source: source});

            if (
              profile.isNew &&
              !storage.getBoolean(Storage.DidFireSignupCompleted)
            ) {
              storage.set(Storage.DidFireSignupCompleted, true);
              logEvent(LOG_EVENTS.SIGNUP_COMPLETED, {
                source,
                method: 'email_otp',
              });
            }

            // 비로그인 상태에서 풀었던 데일리 퀴즈 결과 서버 동기화
            const guestDailyRaw = storage.getString(Storage.GuestDailyResult);
            if (guestDailyRaw) {
              try {
                const guestDaily = JSON.parse(guestDailyRaw);
                const today = new Date().toISOString().split('T')[0];
                if (
                  guestDaily.date === today &&
                  Array.isArray(guestDaily.results)
                ) {
                  await completeDailyChallenge({
                    results: guestDaily.results,
                  });
                }
                storage.delete(Storage.GuestDailyResult);
              } catch (err) {
                logError(err, 'sync-guest-daily');
              }
            }

            // Apply pending referral code if exists
            const pendingCode = storage.getString(Storage.PendingReferralCode);
            if (pendingCode) {
              try {
                const result = await applyReferral({
                  referralCode: pendingCode,
                });
                if (result.success) {
                  toast.success(t('referral.reward', {count: 5}));
                  logEvent('referral_applied');
                }
              } catch (err) {
                logError(err, 'apply-referral');
              }
              storage.delete(Storage.PendingReferralCode);
            }

            // Close any open modals and go to the My tab at root
            try {
              dismissAll();
            } catch {}

            // A battle link opened while signed out resumes in its room.
            const pendingBattleCode = decodePendingBattle(
              storage.getString(Storage.PendingBattleCode),
              Date.now(),
            );
            storage.delete(Storage.PendingBattleCode);
            if (pendingBattleCode) {
              replace({
                pathname: '/battle/[code]',
                params: {code: pendingBattleCode},
              });
              return;
            }
            replace('/my');
          } else {
            setError(t('signInCode.error'));
            isSubmittingRef.current = false;
            setLoading(false);
            didHandleAuthenticatedRef.current = false;
          }
        })
        .catch((err) => {
          logError(err, 'create-profile');
          setError(t('signInCode.error'));
          isSubmittingRef.current = false;
          setLoading(false);
          didHandleAuthenticatedRef.current = false;
        });
      // Note: We're not using finally here to keep loading true when navigating
    }
  }, [
    email,
    isAuthenticated,
    navigate,
    replace,
    createUserProfile,
    completeDailyChallenge,
    applyReferral,
    dismissAll,
  ]);

  const handleChangeText: ComponentProps<typeof EditText>['onChangeText'] = (
    text,
  ) => {
    setError('');
    setCode(text.replace(/[^0-9]/g, ''));
  };

  const handleSubmit = async () => {
    if (loading || isSubmittingRef.current || code.length !== MAX_CODE_LENGTH)
      return;

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const {signingIn} = await signIn(
        getLocale() === 'ko'
          ? 'resend-otp-ko'
          : getLocale() === 'ja'
            ? 'resend-otp-ja'
            : 'resend-otp',
        {email, code},
      );

      if (!signingIn) {
        setError(t('signInCode.error'));
        isSubmittingRef.current = false;
        setLoading(false);
      }
      // Don't set loading to false on success, let the useEffect handle it
    } catch (error: unknown) {
      logError(error, 'sign-in-code');

      if (
        error instanceof Error &&
        error.message.includes('Could not verify code')
      ) {
        setError(t('signInCode.error'));
      } else {
        setError(t('error.message'));
      }
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const renderLocalizedTexts = (localizedText: string): JSX.Element => {
    const parts = localizedText.split('{email}');

    return (
      <Typography.Body2>
        {parts.map((part, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <Typography.Body2
                style={css`
                  font-weight: bold;
                  color: ${theme.role.success};
                `}
              >
                {email}
              </Typography.Body2>
            )}
            {part}
          </Fragment>
        ))}
      </Typography.Body2>
    );
  };

  return (
    <Container>
      {/* Configure current screen options only; name prop must be set in a layout route */}
      <Stack.Screen options={{headerShown: false}} />
      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
        accessible={false}
        style={css`
          flex: 1;
        `}
      >
        <KeyboardAvoidingContainer behavior="padding" automaticOffset>
          <Header>
            <CustomPressable
              onPress={back}
              accessibilityLabel={t('common.back')}
              accessibilityRole="button"
              style={css`
                border-radius: 24px;
                padding: 8px;
              `}
            >
              <Icon name="CaretLeftBold" size={24} />
            </CustomPressable>
          </Header>
          <Content>
            <View
              style={css`
                gap: 34px;
              `}
            >
              <Typography.Heading2>{t('signInCode.title')}</Typography.Heading2>
              <Typography.Body2>
                {renderLocalizedTexts(t('signInCode.content'))}
              </Typography.Body2>

              <InputContainer>
                <EditText
                  placeholder="00000000"
                  autoCapitalize="none"
                  decoration="boxed"
                  maxLength={MAX_CODE_LENGTH}
                  error={error}
                  textInputProps={{
                    keyboardType: 'number-pad',
                    autoFocus: true,
                    autoCorrect: false,
                  }}
                  onChangeText={handleChangeText}
                  onSubmitEditing={handleSubmit}
                  styles={{
                    container: css`
                      margin-top: -2px;
                      border-radius: 12px;
                    `,
                    error: css`
                      margin-top: 8px;
                    `,
                  }}
                  value={code}
                />
              </InputContainer>
            </View>

            <Footer>
              <Button
                hapticFeedback={ImpactFeedbackStyle.Soft}
                styles={{
                  container: css`
                    height: 56px;
                    border-width: 0;
                  `,
                }}
                loading={loading}
                borderRadius={16}
                text={t('common.complete')}
                onPress={handleSubmit}
                disabled={loading || code.length !== MAX_CODE_LENGTH}
              />
            </Footer>
          </Content>
        </KeyboardAvoidingContainer>
      </TouchableWithoutFeedback>
    </Container>
  );
}

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const KeyboardAvoidingContainer = styled(KeyboardAvoidingView)`
  flex: 1;
`;

const Content = styled.View`
  flex: 1;
  padding: 18px 28px 0 28px;

  justify-content: space-between;
`;

const Header = styled.View`
  height: 68px;
  padding: 0 22px;

  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const InputContainer = styled.View`
  gap: 16px;
`;

const Footer = styled.View`
  padding: 16px 0;
`;
