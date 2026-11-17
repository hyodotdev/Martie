import {ActivityIndicator, Platform, View, type ViewStyle} from 'react-native';
import {styled, css} from 'kstyled';
import {delayPressIn} from '../utils/constants';
import {CustomPressable, EditText, Icon, useCPK} from 'cpk-ui';
import {t} from '../STRINGS';

type Props = {
  style?: ViewStyle;
  loading?: boolean;
  message?: string;
  setMessage?: (msg: string) => void;
  createChatMessage: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function ChatInput({
  style,
  loading,
  message,
  setMessage,
  createChatMessage,
  disabled,
  placeholder,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const isSendDisabled = !!disabled || !!loading;

  return (
    <Container style={style}>
      <EditText
        decoration="boxed"
        editable={!loading}
        endElement={
          <ButtonsWrapper
            style={css`
              margin-left: 8px;
            `}
          >
            {loading ? (
              <ActivityIndicator
                accessibilityLabel={t('common.thinking')}
                accessibilityRole="progressbar"
                accessibilityState={{busy: true}}
                color={theme.text.basic}
                style={css`
                  padding: 8px 6px;
                  margin-right: 2px;
                `}
              />
            ) : (
              <CustomPressable
                accessibilityLabel={t('common.send')}
                accessibilityRole="button"
                accessibilityState={{disabled: isSendDisabled}}
                delayHoverIn={delayPressIn}
                onPress={!isSendDisabled ? createChatMessage : undefined}
                style={css`
                  padding: 6px;
                  border-radius: 99px;
                `}
              >
                <Icon
                  color={disabled ? theme.text.disabled : theme.text.basic}
                  name="ArrowUpBold"
                  size={22}
                />
              </CustomPressable>
            )}
          </ButtonsWrapper>
        }
        multiline
        onChangeText={setMessage}
        placeholder={placeholder || t('chat.placeholder')} // Use provided placeholder or default
        styles={{
          container: css`
            border-width: 2px;
            border-color: ${theme.role.border};
            border-radius: 20px;
          `,
          input: css`
            line-height: 18px;
          `,
        }}
        value={message}
      />
      {Platform.OS === 'android' ? <View style={{height: 14}} /> : null}
    </Container>
  );
}

const Container = styled.View`
  background-color: ${({theme}) => theme.bg.basic};
  gap: 10px;
  padding: 10px 20px;
`;

const ButtonsWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;
