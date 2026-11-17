/**
 * @name InputModal
 *
 * @description
 * A custom input modal component using react-native-keyboard-controller for keyboard-aware behavior.
 * Provides a modal-like UI with absolute positioning, backdrop interaction, and smooth keyboard handling
 * to adjust content position when the keyboard appears.
 */

import type {ComponentProps} from 'react';
import {useEffect, useState} from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import {styled, css} from 'kstyled';
import {Button, EditText, Icon, Typography, useCPK} from 'cpk-ui';
import {t} from '../../STRINGS';
import {ImpactFeedbackStyle} from 'expo-haptics';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller'; // KeyboardAwareScrollView 추가
import {MIN_DISPLAY_NAME_LENGTH} from '../../utils/constants';

type AlertModalPropType = {
  visible: boolean;
  title?: string;
  loading?: boolean;
  onConfirm?: (message: string) => void;
  onModalHide?: () => void;
  defaultMessage?: string;
  maxLength?: number;
  numberOfLines?: number;
  textInputProps?: ComponentProps<typeof EditText>['textInputProps'];
  confirmText?: string;
};

export default function InputModal({
  visible,
  title,
  onConfirm,
  onModalHide,
  loading = false,
  defaultMessage = '',
  maxLength,
  numberOfLines = 1,
  textInputProps,
  confirmText,
}: AlertModalPropType): JSX.Element | null {
  const {theme, themeType} = useCPK();
  const [message, setMessage] = useState(defaultMessage);
  const normalizedMessage = message.trim();
  const normalizedDefaultMessage = defaultMessage.trim();
  const messageLength = normalizedMessage.length;
  const canConfirm =
    messageLength >= MIN_DISPLAY_NAME_LENGTH &&
    normalizedMessage !== normalizedDefaultMessage;

  // defaultMessage 변경 시 메시지 업데이트
  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  // Android Back 버튼 처리
  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          onModalHide?.();
          return true; // 기본 Back 동작 방지
        },
      );
      return () => backHandler.remove();
    }
    return () => {};
  }, [onModalHide, visible]);

  // 모달 숨김 처리
  const handleHideModal = () => {
    onModalHide?.();
  };

  if (!visible) return null;

  return (
    <ModalContainer entering={FadeIn} exiting={FadeOut}>
      <KeyboardAwareScrollView
        style={css`
          flex: 1;
        `}
        contentContainerStyle={css`
          flex-grow: 1;
          justify-content: center;
        `}
        keyboardShouldPersistTaps="handled" // 키보드와 버튼 상호작용 개선
      >
        <>
          <TouchableWithoutFeedback onPress={handleHideModal}>
            <Backdrop
              style={
                themeType === 'dark'
                  ? css`
                      background-color: rgba(0, 0, 0, 0.62);
                    `
                  : css`
                      background-color: rgba(0, 0, 0, 0.48);
                    `
              }
            />
          </TouchableWithoutFeedback>
          <Container>
            <CloseButton onPress={handleHideModal} hitSlop={12}>
              <Icon name="X" size={18} color={theme.text.placeholder} />
            </CloseButton>
            <IconBadge>
              <Icon
                name="PencilSimpleLine"
                size={28}
                color={theme.role.primary}
              />
            </IconBadge>
            <Typography.Heading4
              style={css`
                text-align: center;
                color: ${theme.text.basic};
                margin-top: 2px;
              `}
            >
              {title}
            </Typography.Heading4>
            <EditText
              decoration="boxed"
              maxLength={maxLength}
              hideCounter={true}
              multiline={numberOfLines > 1}
              numberOfLines={numberOfLines}
              onChangeText={setMessage}
              onSubmitEditing={() => {
                if (canConfirm) {
                  onConfirm?.(normalizedMessage);
                }
              }}
              placeholder={defaultMessage}
              placeholderColor={theme.text.placeholder}
              style={css`
                margin-top: 10px;
              `}
              styles={{
                container: css`
                  min-height: 64px;
                  max-height: ${Platform.OS === 'android' ? '88px' : '200px'};
                  border-radius: 18px;
                  border-width: 2px;
                  border-color: ${theme.role.border};
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
                  font-size: 20px;
                  font-weight: bold;
                  padding-top: 0;
                  padding-bottom: 0;
                `,
              }}
              textInputProps={textInputProps}
              value={message}
            />
            {maxLength ? (
              <MetaRow>
                <CounterText
                  style={css`
                    color: ${messageLength === 0 || canConfirm
                      ? theme.text.placeholder
                      : theme.role.danger};
                  `}
                >
                  {messageLength}/{maxLength}
                </CounterText>
              </MetaRow>
            ) : null}
            <ButtonRow>
              <Button
                borderRadius={16}
                color="secondary"
                hapticFeedback={ImpactFeedbackStyle.Soft}
                onPress={handleHideModal}
                style={css`
                  flex: 1;
                `}
                styles={{
                  container: css`
                    height: 56px;
                    border-width: 0;
                    background-color: ${theme.bg.paper};
                  `,
                  text: css`
                    color: ${theme.text.basic};
                    font-size: 16px;
                    font-weight: bold;
                  `,
                }}
                text={t('common.cancel')}
                touchableHighlightProps={{
                  underlayColor: theme.role.underlay,
                }}
              />
              <Button
                hapticFeedback={ImpactFeedbackStyle.Soft}
                loading={loading}
                onPress={() => {
                  onConfirm?.(normalizedMessage);
                }}
                disabled={!canConfirm}
                style={css`
                  flex: 1;
                `}
                borderRadius={16}
                styles={{
                  container: css`
                    height: 56px;
                    border-width: 0;
                  `,
                  text: css`
                    font-weight: bold;
                    font-size: 18px;
                  `,
                }}
                text={confirmText || t('common.ok')}
                touchableHighlightProps={{
                  underlayColor: theme.role.underlay,
                }}
              />
            </ButtonRow>
          </Container>
        </>
      </KeyboardAwareScrollView>
    </ModalContainer>
  );
}

// 스타일 정의
const ModalContainer = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
`;

const Container = styled.View`
  width: 86%;
  align-self: center;
  background-color: ${({theme}) => theme.bg.dialog};
  border-radius: 28px;
  margin: 16px;
  max-width: 430px;
  padding: 28px 24px 24px 24px;
  shadow-color: #000;
  shadow-offset: 0px 12px;
  shadow-opacity: 0.16;
  shadow-radius: 28px;
  elevation: 12;
`;

const CloseButton = styled(Pressable)`
  position: absolute;
  top: 18px;
  right: 18px;
  width: 36px;
  height: 36px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => theme.bg.paper};
`;

const IconBadge = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  align-self: center;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  background-color: ${({theme}) => theme.role.selectedBg};
  border-width: 1px;
  border-color: ${({theme}) => theme.role.selectedBorder};
`;

const MetaRow = styled.View`
  min-height: 20px;
  margin-top: 8px;
  align-items: flex-end;
`;

const CounterText = styled(Typography.Body4)`
  font-weight: bold;
`;

const ButtonRow = styled.View`
  margin-top: 18px;
  flex-direction: row;
  align-self: stretch;
  gap: 12px;
`;

const Backdrop = styled.View`
  position: absolute;
  width: 100%;
  height: 100%;
`;
