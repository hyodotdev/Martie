import {useState} from 'react';
import {styled, css} from 'kstyled';
import {Button, EditText, Icon, Typography, useCPK} from 'cpk-ui';
import {Stack, useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {Keyboard, TouchableWithoutFeedback} from 'react-native';
import {useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import {toast} from '@backpackapp-io/react-native-toast';
import {t} from '../src/STRINGS';
import {logEvent} from '../src/utils/analytics';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {useAsync} from '../src/hooks/useAsync';

export default function EnterReferralCode(): JSX.Element {
  const {theme} = useCPK();
  const {back} = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const applyReferral = useMutation(api.referral.mutations.applyReferral);

  const {execute: applyEnteredReferral, loading} = useAsync(async () => {
    const normalizedCode = code.trim();
    if (!normalizedCode) return;

    setError('');

    try {
      const result = await applyReferral({referralCode: normalizedCode});

      if (result.success) {
        toast.success(t('referral.reward', {count: 5}));
        logEvent('referral_applied');
        back();
      } else if (result.error === 'already_referred') {
        setError(t('referral.alreadyReferred'));
      } else if (result.error === 'self_referral') {
        setError(t('referral.selfReferral'));
      } else {
        setError(t('referral.invalidCode'));
      }
    } catch {
      setError(t('referral.invalidCode'));
    }
  });

  const handleSubmit = () => {
    if (!code.trim() || loading) return;
    void applyEnteredReferral();
  };

  return (
    <Container edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('my.enterReferralCode'),
        }}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoiding behavior="padding" automaticOffset>
          <Content>
            <FormCard>
              <RewardBadge>
                <Icon
                  name="LightbulbFill"
                  size={28}
                  color={theme.role.primary}
                />
              </RewardBadge>
              <Typography.Body1
                style={css`
                  color: ${theme.text.basic};
                  text-align: center;
                  font-weight: bold;
                  line-height: 28px;
                `}
              >
                {t('referral.enterCodeDescription')}
              </Typography.Body1>

              <EditText
                decoration="boxed"
                placeholder={t('referral.codePlaceholder')}
                autoCapitalize="none"
                maxLength={8}
                value={code}
                error={error}
                onChangeText={(text) => {
                  setError('');
                  setCode(text.replace(/[^0-9a-zA-Z]/g, '').toLowerCase());
                }}
                onSubmitEditing={handleSubmit}
                style={css`
                  margin-top: 8px;
                `}
                styles={{
                  container: css`
                    min-height: 64px;
                    border-radius: 18px;
                    border-width: 2px;
                    border-color: ${error
                      ? theme.role.danger
                      : theme.role.border};
                    background-color: ${theme.bg.paper};
                    padding-left: 18px;
                    padding-right: 18px;
                  `,
                  inputContainer: css`
                    min-height: 60px;
                  `,
                  input: css`
                    color: ${theme.text.basic};
                    text-align: center;
                    font-size: 22px;
                    font-weight: bold;
                    letter-spacing: 1px;
                    padding-top: 0;
                    padding-bottom: 0;
                  `,
                  error: css`
                    margin-top: 8px;
                    text-align: center;
                    color: ${theme.role.danger};
                  `,
                  counter: css`
                    color: ${theme.text.placeholder};
                  `,
                }}
              />
            </FormCard>

            <Button
              hapticFeedback={ImpactFeedbackStyle.Soft}
              styles={{
                container: css`
                  height: 56px;
                  border-width: 0;
                `,
                text: css`
                  font-size: 17px;
                  font-weight: bold;
                `,
              }}
              loading={loading}
              borderRadius={18}
              text={t('common.complete')}
              onPress={handleSubmit}
              disabled={loading || code.trim().length === 0}
            />
          </Content>
        </KeyboardAvoiding>
      </TouchableWithoutFeedback>
    </Container>
  );
}

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const KeyboardAvoiding = styled(KeyboardAvoidingView)`
  flex: 1;
`;

const Content = styled.View`
  flex: 1;
  justify-content: space-between;
  padding: 24px 32px 20px 32px;
`;

const FormCard = styled.View`
  align-items: stretch;
  gap: 20px;
  padding-top: 12px;
`;

const RewardBadge = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  align-self: center;
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => theme.role.selectedBg};
  border-width: 1px;
  border-color: ${({theme}) => theme.role.selectedBorder};
`;
