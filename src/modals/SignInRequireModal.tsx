import React, {useCallback, useEffect} from 'react';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {styled, css} from 'kstyled';
import {Typography} from 'cpk-ui';
import {t} from '../STRINGS';
import {Image} from 'expo-image';
import {IC_MARTIE_SMILE} from '../icons';
import {useSignInRequireModalStore} from '../stores/signInRequireModalStore'; // store import
import {useRouter} from 'expo-router';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {GestureHandlerButton} from '../uis/GestureHandlerButton';
import {logEvent, LOG_EVENTS} from '../utils/analytics';

const BASE_MODAL_HEIGHT = 452;
const BACKDROP_OPACITY = 0.5;

function SignInRequireModal(): JSX.Element | null {
  const {visible, setVisible} = useSignInRequireModalStore();
  const MODAL_HEIGHT = BASE_MODAL_HEIGHT;
  const translateY = useSharedValue(MODAL_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const {navigate} = useRouter();

  // 모달 애니메이션 스타일
  const modalStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  // 백드롭 애니메이션 스타일
  const backdropStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 0, 0, ${interpolate(
      backdropOpacity.value,
      [0, 1],
      [0, BACKDROP_OPACITY],
    )})`,
  }));

  // 모달 표시 애니메이션 트리거
  const showModal = useCallback(() => {
    translateY.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    backdropOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [translateY, backdropOpacity]);

  // 모달 숨김 애니메이션 트리거
  const hideModal = useCallback(() => {
    translateY.value = withTiming(MODAL_HEIGHT, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    });

    backdropOpacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    });

    setTimeout(() => {
      setVisible(false);
    }, 300);
  }, [translateY, MODAL_HEIGHT, backdropOpacity, setVisible]);

  // visible 상태가 변경될 때 모달 표시/숨김 처리
  useEffect(() => {
    if (visible) {
      showModal();
    } else {
      hideModal();
    }
  }, [visible, showModal, hideModal]);

  if (!visible) return null;

  return (
    <Container>
      <Backdrop
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[backdropStyle]}
        onTouchStart={() => {
          logEvent(LOG_EVENTS.LOGIN_PROMPT_DISMISSED, {reason: 'backdrop'});
          hideModal();
        }}
      />
      <Animated.View style={[modalStyle]}>
        <Content
          accessibilityViewIsModal
          importantForAccessibility="yes"
          testID="sign-in-require-modal"
        >
          <Image
            accessibilityElementsHidden
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            source={IC_MARTIE_SMILE}
            style={css`
              width: 150px;
              height: 150px;
            `}
          />
          <TextContainer>
            <Typography.Heading5
              accessibilityRole="header"
              numberOfLines={2}
              style={css`
                text-align: center;
              `}
            >
              {t('signIn.title')}
            </Typography.Heading5>
            <Typography.Body2
              numberOfLines={2}
              style={css`
                text-align: center;
              `}
            >
              {t('signIn.message')}
            </Typography.Body2>
          </TextContainer>
          <ButtonContainer>
            <GestureHandlerButton
              hapticFeedback={ImpactFeedbackStyle.Soft}
              text={t('signIn.doLater')}
              accessibilityLabel={t('signIn.doLater')}
              accessibilityRole="button"
              onPress={() => {
                logEvent(LOG_EVENTS.LOGIN_PROMPT_DISMISSED, {reason: 'later'});
                hideModal();
              }}
              color="light"
              borderRadius={12}
              style={css`
                flex: 1;
                margin-right: 8px;
              `}
              styles={{
                container: css`
                  height: 56px;
                `,
              }}
            />
            <GestureHandlerButton
              text={t('signIn.doLogin')}
              accessibilityLabel={t('signIn.doLogin')}
              accessibilityRole="button"
              hapticFeedback={ImpactFeedbackStyle.Soft}
              onPress={() => {
                logEvent(LOG_EVENTS.LOGIN_PROMPT_ACCEPTED);
                hideModal();
                navigate('/sign-in');
              }}
              borderRadius={12}
              style={css`
                flex: 1;
              `}
              styles={{
                container: css`
                  height: 56px;
                `,
              }}
            />
          </ButtonContainer>
        </Content>
      </Animated.View>
    </Container>
  );
}

export default SignInRequireModal;

const Container = styled.View`
  position: absolute;
  width: 100%;
  height: 100%;
  justify-content: flex-end;
`;

const Backdrop = styled(Animated.View)`
  width: 100%;
  height: 100%;
  position: absolute;
`;

const Content = styled.View`
  width: 100%;
  max-width: 520px;
  align-self: center;
  height: ${BASE_MODAL_HEIGHT + 'px'};
  background-color: ${({theme}) => theme.bg.basic};
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  padding: 40px 40px 52px 40px;

  align-items: center;
  justify-content: center;
`;

const TextContainer = styled.View`
  margin: 36px 0 24px;
  align-items: center;
  gap: 16px;
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  width: 100%;
`;
