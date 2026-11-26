import React, {useState, useEffect} from 'react';
import {styled, css} from 'kstyled';
import {TouchableWithoutFeedback, Keyboard, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  EditText,
  Button,
  CustomPressable,
  Icon,
  Typography,
  useCPK,
} from 'cpk-ui'; // 임의의 UI 라이브러리 사용
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {Stack, useRouter} from 'expo-router';
import {Image} from 'expo-image';
import {IC_WORDMARK} from '../src/icons';
import {getLocale, t} from '../src/STRINGS';
import {useAuthActions} from '@convex-dev/auth/react';
import {normalizeEmail, validateEmail} from '../src/utils/common';
import {logError} from '../src/utils/error';
import {useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import {toast} from '@backpackapp-io/react-native-toast';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {logScreenView} from '../src/utils/analytics';

export default function SignIn(): JSX.Element {
  const {navigate, back} = useRouter();
  const {signIn} = useAuthActions();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const {theme} = useCPK();
  const checkIsDeletedUser = useMutation(api.user.mutations.checkIsDeletedUser);

  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'sign-in',
        screen_class: 'SignIn',
      });
  }, []);

  const handleChangeEmail = (text: string) => {
    setError('');
    setEmail(text);
  };

  const handleSubmit = async () => {
    if (loading) return;
    const trimmedEmail = email.trim();
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail !== email) {
      setEmail(normalizedEmail);
    }

    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      setError(t('signIn.emailError'));
      return;
    }

    setLoading(true);

    try {
      // ✅ 1. `checkIsDeletedUser` 호출하여 탈퇴한 유저인지 확인
      const {isDeleted} = await checkIsDeletedUser({email: trimmedEmail});

      if (isDeleted) {
        toast.error(t('signIn.isCanceledAccount'));
        return;
      }

      // ✅ 2. 로그인 시도
      await signIn(
        getLocale() === 'ko'
          ? 'resend-otp-ko'
          : getLocale() === 'ja'
            ? 'resend-otp-ja'
            : 'resend-otp',
        {email: normalizedEmail},
      );

      // ✅ 3. 로그인 성공 시 코드 입력 페이지로 이동
      navigate({
        pathname: '/sign-in-code',
        params: {email: normalizedEmail},
      });
    } catch (error) {
      logError(error, 'signin-submit-error');
      setError(`${t('signIn.emailSentFailed')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      {/* Configure current screen options only; name prop must be set in a layout route */}
      <Stack.Screen options={{headerShown: false}} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingContainer behavior="padding" automaticOffset>
          <Header>
            <CustomPressable
              onPress={() => back()}
              accessibilityLabel={t('common.cancel')}
              accessibilityRole="button"
              style={css`
                border-radius: 24px;
                padding: 8px;
              `}
            >
              <Icon name="XBold" size={24} />
            </CustomPressable>
          </Header>

          <Content>
            <View
              style={css`
                gap: 54px;
              `}
            >
              <Image
                source={IC_WORDMARK}
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={css`
                  align-self: center;
                  width: 114px;
                  height: 46px;
                `}
              />
              <InputContent>
                <EditText
                  placeholder="Email"
                  autoCapitalize="none"
                  decoration="boxed"
                  label={t('signIn.emailAddress')}
                  textInputProps={{
                    keyboardType: 'email-address',
                    autoCorrect: false,
                  }}
                  styles={{
                    container: css`
                      margin-top: -2px;
                      border-radius: 12px;
                    `,
                    error: css`
                      margin-top: 8px;
                    `,
                  }}
                  error={error}
                  value={email}
                  onChangeText={handleChangeEmail}
                />
              </InputContent>
              <View
                style={css`
                  margin-top: -36px;
                  flex-direction: row;
                  flex-wrap: wrap;
                  justify-content: center;
                `}
              >
                {t('common.policyAgreement', {
                  termsOfService: `**${t('common.termsOfService')}**`,
                  privacyPolicy: `**${t('common.privacyPolicy')}**`,
                })
                  .split('**')
                  .map((str, i) =>
                    i % 2 === 0 ? (
                      <Typography.Body4
                        key={`${i}-${str}`}
                        style={css`
                          line-height: 20px;
                          color: ${theme.text.label};
                        `}
                      >
                        {str}
                      </Typography.Body4>
                    ) : (
                      <Typography.Body4
                        onPress={() => {
                          if (str === t('common.privacyPolicy')) {
                            if (getLocale() === 'ko') {
                              return navigate('/privacyandpolicy-ko');
                            }
                            return navigate('/privacyandpolicy');
                          }
                          if (str === t('common.termsOfService')) {
                            if (getLocale() === 'ko') {
                              return navigate('/termsofservice-ko');
                            }
                            return navigate('/termsofservice');
                          }
                        }}
                        accessibilityLabel={str}
                        accessibilityRole="link"
                        key={str}
                        style={css`
                          text-decoration-line: underline;
                          line-height: 20px;
                          color: ${theme.text.basic};
                        `}
                      >
                        {str}
                      </Typography.Body4>
                    ),
                  )}
              </View>
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
                text={t('signIn.doLogin')}
                onPress={handleSubmit}
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
  padding: 0 12px;
`;

const KeyboardAvoidingContainer = styled(KeyboardAvoidingView)`
  flex: 1;
`;

const Header = styled.View`
  height: 68px;

  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
`;

const Content = styled.View`
  flex: 1;
  padding: 18px 18px 0 18px;
  justify-content: space-between;
`;

const InputContent = styled.View`
  gap: 16px;
`;

const Footer = styled.View`
  padding: 16px 0;
`;
