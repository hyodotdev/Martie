/**
 * @name SendLetter
 * 마티에게 편지쓰기
 *
 * See the style guide: https://github.com/hyochan/style-guide/blob/main/docs/REACT.md
 */
import {styled, css} from 'kstyled';
import {Button, EditText, Typography, useCPK} from 'cpk-ui';
import {Stack, useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../src/STRINGS';
import {Keyboard, TouchableWithoutFeedback} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useState, useEffect} from 'react';
import {api} from '../convex/_generated/api';
import {useMutation} from 'convex/react';
import {toast} from '@backpackapp-io/react-native-toast';
import {useAsync} from '../src/hooks/useAsync';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {logScreenView} from '../src/utils/analytics';

export default function SendLetter(): JSX.Element {
  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'send-letter',
        screen_class: 'SendLetter',
      });
  }, []);

  const [letter, setLetter] = useState('');
  const normalizedLetter = letter.trim();
  const {theme} = useCPK();
  const {back} = useRouter();
  const sendInquiry = useMutation(api.actions.sendInquiry);
  const {execute, loading} = useAsync(async () => {
    try {
      await sendInquiry({message: normalizedLetter});
      toast.success(t('inquiry.successMessage'));
      setLetter('');
      back();
    } catch {
      toast.error(t('inquiry.failedMessage'));
    }
  });

  return (
    <Container edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('my.sendLetterToMartie'),
          headerShadowVisible: false,
        }}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoiding behavior="padding" automaticOffset>
          <Content>
            <FormCard>
              <EditText
                placeholder={t('inquiry.placeholder')}
                value={letter}
                onChangeText={setLetter}
                decoration="boxed"
                maxLength={300}
                hideCounter
                multiline
                textInputProps={{
                  textAlignVertical: 'top',
                }}
                styles={{
                  container: css`
                    border-radius: 20px;
                    border-width: 2px;
                    border-color: ${theme.role.border};
                    background-color: ${theme.bg.paper};
                    height: 280px;
                    padding-left: 18px;
                    padding-right: 18px;
                  `,
                  inputContainer: css`
                    align-items: flex-start;
                    min-height: 260px;
                  `,
                  input: css`
                    color: ${theme.text.basic};
                    font-size: 17px;
                    line-height: 24px;
                    padding-top: 4px;
                  `,
                }}
              />
              <Counter
                style={css`
                  color: ${theme.text.placeholder};
                `}
              >
                {letter.length}/300
              </Counter>
            </FormCard>
            <Button
              hapticFeedback={ImpactFeedbackStyle.Soft}
              disabled={!normalizedLetter}
              text={t('common.send')}
              styles={{
                container: css`
                  border-width: 0;
                  height: 56px;
                `,
                text: css`
                  font-size: 17px;
                  font-weight: bold;
                `,
              }}
              onPress={execute}
              loading={loading}
              borderRadius={18}
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
  gap: 8px;
`;

const Counter = styled(Typography.Body4)`
  align-self: flex-end;
  padding-right: 4px;
  font-weight: bold;
`;
