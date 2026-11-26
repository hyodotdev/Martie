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
import {
  Stack,
  useIsFocused,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {getLocale, t} from '../src/STRINGS';
import {normalizeEmail} from '../src/utils/common';
import {logError} from '../src/utils/error';
import {useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {logScreenView} from '../src/utils/analytics';
import {SafeAreaView} from 'react-native-safe-area-context';
import {toast} from '@backpackapp-io/react-native-toast';
import {useAfterSignIn} from '../src/hooks/useAfterSignIn';
import {savePendingSignInLink} from '../src/utils/signInLink';

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

  const {setSession} = useAuthActions();
  const {theme} = useCPK();
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const {back, navigate, replace, dismissAll} = useRouter();
  const params = useLocalSearchParams<{email: string}>();
  const email = normalizeEmail(decodeURIComponent(params.email || ''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const sendSignInLink = useMutation(api.emailAuth.sendSignInLink);
  const signInWithReviewCode = useMutation(
    api.emailAuth.signInWithReviewCode,
  );
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (email) return;
    try {
      replace(HOME_ROUTE);
      dismissAll();
    } catch (err) {
      logError(err, 'sign-in-code-no-email');
      navigate(HOME_ROUTE);
    }
  }, [email, replace, dismissAll, navigate]);

  // The emailed link opens `sign-in-link` on top of this screen, and that
  // screen finishes the sign-in; this one finishes a review code sign-in.
  const isFocused = useIsFocused();
  useAfterSignIn({
    method: showCode ? 'email_otp' : 'email_link',
    enabled: isFocused,
    onFailed: () => {
      setError(t('signInCode.error'));
      isSubmittingRef.current = false;
      setLoading(false);
    },
  });

  const handleChangeText: ComponentProps<typeof EditText>['onChangeText'] = (
    text,
  ) => {
    setError('');
    setCode(text.replace(/[^0-9]/g, ''));
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      const locale = getLocale();
      const result = await sendSignInLink({
        email,
        locale: locale === 'ko' || locale === 'ja' ? locale : 'en',
      });
      if (!result.success) {
        toast.error(t('signIn.emailSentFailed'));
        return;
      }
      savePendingSignInLink({email, browserSecret: result.browserSecret});
      toast.success(t('signInLink.resent'));
    } catch (err) {
      logError(err, 'sign-in-link-resend');
      toast.error(t('signIn.emailSentFailed'));
    } finally {
      setResending(false);
    }
  };

  // App Review cannot open an emailed link, so its allow-listed emails sign
  // in with a fixed code instead.
  const handleSubmit = async () => {
    if (loading || isSubmittingRef.current || code.length !== MAX_CODE_LENGTH)
      return;

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const result = await signInWithReviewCode({email, code});
      if (result.status !== 'complete') {
        setError(t('signInCode.error'));
        isSubmittingRef.current = false;
        setLoading(false);
        return;
      }
      // Keep loading on success: `useAfterSignIn` leaves the screen.
      await setSession(result.tokens);
    } catch (error: unknown) {
      logError(error, 'sign-in-code');
      setError(t('error.message'));
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
              onPress={() => back()}
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
              <Typography.Heading2>
                {showCode ? t('signInCode.title') : t('signInLink.title')}
              </Typography.Heading2>
              <Typography.Body2>
                {renderLocalizedTexts(
                  showCode ? t('signInLink.codeContent') : t('signInLink.content'),
                )}
              </Typography.Body2>

              {showCode ? (
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
              ) : null}
            </View>

            <Footer>
              {showCode ? (
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
              ) : (
                <>
                  <Button
                    hapticFeedback={ImpactFeedbackStyle.Soft}
                    styles={{
                      container: css`
                        height: 56px;
                        border-width: 0;
                      `,
                    }}
                    loading={resending}
                    borderRadius={16}
                    text={t('signInLink.resend')}
                    onPress={handleResend}
                  />
                  <CustomPressable
                    onPress={() => setShowCode(true)}
                    accessibilityLabel={t('signInLink.useCode')}
                    accessibilityRole="button"
                    style={css`
                      align-self: center;
                      margin-top: 16px;
                      padding: 8px;
                    `}
                  >
                    <Typography.Body3
                      style={css`
                        color: ${theme.text.label};
                        text-decoration-line: underline;
                      `}
                    >
                      {t('signInLink.useCode')}
                    </Typography.Body3>
                  </CustomPressable>
                </>
              )}
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
