import React, {useCallback, useEffect, useRef, useState} from 'react';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {styled, css} from 'kstyled';
import {Typography} from 'cpk-ui';
import {t} from '../STRINGS';
import {Image} from 'expo-image';
import {IC_MARTIE_IMPRESSED} from '../icons';
import {useFirstQuizModalStore} from '../stores/firstQuizModalStore';
import {usePathname, useRouter} from 'expo-router';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {useWindowDimensions} from 'react-native';
import ButtonMartie from '../uis/ButtonMartie';
import {canShowFirstQuizModalOnPath} from '../utils/firstQuizModal';

// Cap modal height at ~58% of the viewport so the layout still works on
// short devices and with large accessibility text scaling.
const MAX_MODAL_HEIGHT = 480;
const MIN_MODAL_HEIGHT = 360;
const VIEWPORT_RATIO = 0.58;
const BACKDROP_OPACITY = 0.5;
const SHOW_DURATION = 400;
const HIDE_DURATION = 250;

function FirstQuizModal(): JSX.Element | null {
  const {visible, setVisible} = useFirstQuizModalStore();
  const {height: viewportHeight} = useWindowDimensions();
  const modalHeight = Math.min(
    MAX_MODAL_HEIGHT,
    Math.max(MIN_MODAL_HEIGHT, viewportHeight * VIEWPORT_RATIO),
  );
  const translateY = useSharedValue(modalHeight);
  const backdropOpacity = useSharedValue(0);
  const {push} = useRouter();
  const pathname = usePathname();
  const canShowOnPath = canShowFirstQuizModalOnPath(pathname);
  const [slideIndex, setSlideIndex] = useState(0);
  const modalHeightRef = useRef(modalHeight);

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 0, 0, ${interpolate(
      backdropOpacity.value,
      [0, 1],
      [0, BACKDROP_OPACITY],
    )})`,
  }));

  useEffect(() => {
    if (!visible) {
      setSlideIndex(0);
    }
  }, [visible]);

  useEffect(() => {
    modalHeightRef.current = modalHeight;
  }, [modalHeight]);

  const resetAnimationValues = useCallback(() => {
    translateY.value = modalHeightRef.current;
    backdropOpacity.value = 0;
  }, [backdropOpacity, translateY]);

  useEffect(() => {
    if (visible && !canShowOnPath) {
      resetAnimationValues();
      setVisible(false);
    }
  }, [canShowOnPath, resetAnimationValues, setVisible, visible]);

  useEffect(() => {
    return () => {
      resetAnimationValues();
      setVisible(false);
    };
  }, [resetAnimationValues, setVisible]);

  useEffect(() => {
    if (!visible) return;
    translateY.value = withTiming(0, {
      duration: SHOW_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(1, {
      duration: SHOW_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, translateY, backdropOpacity]);

  // Animate close & optionally navigate, all driven by withTiming completion
  // callbacks on the UI thread — no setTimeout race conditions.
  const hideAndAfter = useCallback(
    (after?: () => void) => {
      backdropOpacity.value = withTiming(0, {
        duration: HIDE_DURATION,
        easing: Easing.in(Easing.cubic),
      });
      translateY.value = withTiming(
        modalHeight,
        {
          duration: HIDE_DURATION,
          easing: Easing.in(Easing.cubic),
        },
        () => {
          // Always release the modal so an interrupted animation can't
          // leave the backdrop blocking taps on the home screen.
          runOnJS(setVisible)(false);
          if (after) runOnJS(after)();
        },
      );
    },
    [translateY, backdropOpacity, modalHeight, setVisible],
  );

  if (!visible || !canShowOnPath) return null;

  const slides = [
    {
      title: t('onboarding.dailyLoopTitle'),
      body: t('onboarding.dailyLoopBody'),
    },
    {
      title: t('onboarding.streakTitle'),
      body: t('onboarding.streakBody'),
    },
    {
      title: t('onboarding.reviewTitle'),
      body: t('onboarding.reviewBody'),
    },
  ];

  const slide = slides[slideIndex] ?? slides[0];
  const isLastSlide = slideIndex === slides.length - 1;

  const handleTryNow = () => {
    hideAndAfter(() => push('/daily-quiz'));
  };

  const handlePrimary = () => {
    if (!isLastSlide) {
      setSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
      return;
    }
    handleTryNow();
  };

  const handleSkip = () => {
    hideAndAfter();
  };

  return (
    <Container>
      <Backdrop
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[backdropStyle]}
      />
      <Animated.View style={[modalStyle]}>
        <Content
          accessibilityViewIsModal
          importantForAccessibility="yes"
          style={{height: modalHeight}}
          testID="first-quiz-modal"
        >
          <Image
            accessibilityElementsHidden
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            source={IC_MARTIE_IMPRESSED}
            style={css`
              width: 130px;
              height: 130px;
            `}
            testID="first-quiz-illustration"
          />
          <TextContainer>
            <Typography.Heading3
              accessibilityRole="header"
              numberOfLines={2}
              style={css`
                text-align: center;
                font-weight: 800;
              `}
            >
              {slide.title}
            </Typography.Heading3>
            <Typography.Body2
              numberOfLines={3}
              style={css`
                text-align: center;
                opacity: 0.6;
              `}
            >
              {slide.body}
            </Typography.Body2>
            <DotsRow
              accessibilityLabel={t('onboarding.progress')}
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 1,
                max: slides.length,
                now: slideIndex + 1,
              }}
              accessible
              testID="first-quiz-progress"
            >
              {slides.map((_, index) => (
                <Dot
                  key={index}
                  $active={index === slideIndex}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                />
              ))}
            </DotsRow>
          </TextContainer>
          <ButtonMartie
            accessibilityLabel={
              isLastSlide ? t('daily.tryNow') : t('common.next')
            }
            accessibilityRole="button"
            hapticFeedback={ImpactFeedbackStyle.Soft}
            text={isLastSlide ? t('daily.tryNow') : t('common.next')}
            onPress={handlePrimary}
            borderRadius={16}
            style={css`
              align-self: stretch;
              margin-bottom: ${(isLastSlide ? 18 : 0) + 'px'};
            `}
            styles={{
              container: css`
                height: 56px;
                border-width: 0;
              `,
              text: css`
                font-size: 18px;
                font-weight: 800;
              `,
            }}
          />
          {!isLastSlide && (
            <SkipButton
              accessibilityLabel={t('common.skip')}
              accessibilityRole="button"
              onPress={handleSkip}
            >
              <Typography.Body3
                style={css`
                  opacity: 0.55;
                  font-weight: 700;
                `}
              >
                {t('common.skip')}
              </Typography.Body3>
            </SkipButton>
          )}
        </Content>
      </Animated.View>
    </Container>
  );
}

export default FirstQuizModal;

const Container = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  background-color: ${({theme}) => theme.bg.basic};
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 28px 24px 32px 24px;

  align-items: center;
  justify-content: space-between;
`;

const TextContainer = styled.View`
  align-items: center;
  gap: 10px;
`;

const DotsRow = styled.View`
  flex-direction: row;
  gap: 6px;
  padding-top: 4px;
`;

const Dot = styled.View<{$active: boolean}>`
  width: ${({$active}) => ($active ? '18px' : '7px')};
  height: 7px;
  border-radius: 4px;
  background-color: ${({$active, theme}) =>
    $active ? theme.role.primary : theme.role.border};
`;

const SkipButton = styled.Pressable`
  min-height: 32px;
  align-items: center;
  justify-content: center;
`;
