import React, {useCallback, useEffect, useRef, useState} from 'react';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {styled, css} from 'kstyled';
import {Typography} from 'cpk-ui';
import {Image} from 'expo-image';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {useMutation, useQuery} from 'convex/react';
import {useRouter} from 'expo-router';
import {toast} from '@backpackapp-io/react-native-toast';
import {api} from '../../convex/_generated/api';
import {t} from '../STRINGS';
import {IC_MARTIE_SMILE} from '../icons';
import {logEvent, LOG_EVENTS} from '../utils/analytics';
import {logError} from '../utils/error';
import {storage, Storage} from '../utils/storage';
import {streakToday} from '../utils/streakDate';
import {GestureHandlerButton} from '../uis/GestureHandlerButton';

const MODAL_HEIGHT = 440;
const BACKDROP_OPACITY = 0.5;
const SHOW_DURATION = 400;
const HIDE_DURATION = 300;

type Props = {
  onVisibilityChange?: (visible: boolean) => void;
};

/**
 * Streak Recovery Modal (PMF sprint #70).
 *
 * Surfaces a one-time-per-30-days offer to keep the user's streak alive
 * after they missed yesterday and have no Streak Freeze. Server-side
 * `getStreakRecoveryState` enforces eligibility; client throttles within
 * the same calendar day via MMKV so a dismissal sticks until tomorrow.
 */
function StreakRecoveryModal({
  onVisibilityChange,
}: Props): JSX.Element | null {
  const recovery = useQuery(api.dailyChallenge.queries.getStreakRecoveryState);
  const grant = useMutation(api.dailyChallenge.mutations.grantRecoveryFreeze);
  const {navigate} = useRouter();

  const [visible, setVisible] = useState(false);
  const [isAcceptingRecovery, setIsAcceptingRecovery] = useState(false);
  const acceptingRecoveryRef = useRef(false);
  const eventLoggedRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const translateY = useSharedValue(MODAL_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Clear any pending hide timer on unmount so setVisible doesn't fire
  // against an unmounted component.
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

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

  // Eligibility check + once-per-day client throttle. Server already enforces
  // the 30-day cooldown; this just prevents the modal from re-popping every
  // app foreground after a dismissal.
  useEffect(() => {
    if (!recovery?.eligible) return;

    const today = streakToday();
    const lastSeen = storage.getString(Storage.StreakRecoveryLastSeenAt);
    if (lastSeen === today) return;

    setVisible(true);
  }, [recovery]);

  useEffect(() => {
    if (!visible) {
      acceptingRecoveryRef.current = false;
      setIsAcceptingRecovery(false);
      return;
    }

    if (!eventLoggedRef.current) {
      eventLoggedRef.current = true;
      logEvent(LOG_EVENTS.STREAK_RECOVERY_SHOWN, {
        streak: recovery?.eligible ? recovery.currentStreak : undefined,
      });
    }
    translateY.value = withTiming(0, {
      duration: SHOW_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(1, {
      duration: SHOW_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, recovery, translateY, backdropOpacity]);

  useEffect(() => {
    const isVisible = visible && Boolean(recovery?.eligible);
    onVisibilityChange?.(isVisible);
    return () => onVisibilityChange?.(false);
  }, [onVisibilityChange, recovery?.eligible, visible]);

  const hide = useCallback(() => {
    translateY.value = withTiming(MODAL_HEIGHT, {
      duration: HIDE_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    backdropOpacity.value = withTiming(0, {
      duration: HIDE_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setVisible(false);
    }, HIDE_DURATION);
    // Stamp today so we don't re-show until tomorrow even if the query
    // re-evaluates eligibility.
    storage.set(Storage.StreakRecoveryLastSeenAt, streakToday());
  }, [translateY, backdropOpacity]);

  const handleDismiss = useCallback(() => {
    if (acceptingRecoveryRef.current) return;

    hide();
  }, [hide]);

  const handleAccept = useCallback(async () => {
    if (acceptingRecoveryRef.current) return;

    acceptingRecoveryRef.current = true;
    setIsAcceptingRecovery(true);

    try {
      const result = await grant();
      if (!isMountedRef.current) return;

      if (result.success) {
        logEvent(LOG_EVENTS.STREAK_RECOVERY_ACCEPTED, {
          streak: result.currentStreak,
        });
        toast.success(t('daily.streakRecoveryGranted'));
        hide();
        // Push to daily quiz so the freeze gets consumed immediately.
        navigate('/daily-quiz');
      } else {
        // Server rejected — likely a race with another device. Just close.
        hide();
      }
    } catch (error) {
      if (!isMountedRef.current) return;

      logError(error, 'streak-recovery-grant');
      hide();
    }
  }, [grant, hide, navigate]);

  if (!visible || !recovery?.eligible) return null;

  return (
    <Container>
      <Backdrop
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[backdropStyle]}
        onTouchStart={handleDismiss}
      />
      <Animated.View style={[modalStyle]}>
        <Content
          accessibilityViewIsModal
          importantForAccessibility="yes"
          testID="streak-recovery-modal"
        >
          <Image
            accessibilityElementsHidden
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            source={IC_MARTIE_SMILE}
            style={css`
              width: 130px;
              height: 130px;
            `}
          />
          <TextContainer>
            <Typography.Heading4
              accessibilityRole="header"
              numberOfLines={2}
              style={css`
                text-align: center;
                font-weight: 800;
              `}
            >
              {t('daily.streakRecoveryTitle')}
            </Typography.Heading4>
            <Typography.Body2
              style={css`
                text-align: center;
                opacity: 0.7;
              `}
            >
              {t('daily.streakRecoveryBody', {count: recovery.currentStreak})}
            </Typography.Body2>
          </TextContainer>
          <ButtonContainer>
            <GestureHandlerButton
              hapticFeedback={ImpactFeedbackStyle.Soft}
              text={t('daily.streakRecoveryDismiss')}
              accessibilityLabel={t('daily.streakRecoveryDismiss')}
              accessibilityRole="button"
              accessibilityState={{disabled: isAcceptingRecovery}}
              disabled={isAcceptingRecovery}
              onPress={handleDismiss}
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
              text={t('daily.streakRecoveryAccept')}
              accessibilityLabel={t('daily.streakRecoveryAccept')}
              accessibilityRole="button"
              accessibilityState={{
                busy: isAcceptingRecovery,
                disabled: isAcceptingRecovery,
              }}
              disabled={isAcceptingRecovery}
              hapticFeedback={ImpactFeedbackStyle.Soft}
              loading={isAcceptingRecovery}
              onPress={handleAccept}
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

export default StreakRecoveryModal;

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
  height: ${MODAL_HEIGHT + 'px'};
  background-color: ${({theme}) => theme.bg.basic};
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  padding: 32px 32px 44px 32px;
  align-items: center;
  justify-content: space-between;
`;

const TextContainer = styled.View`
  align-items: center;
  gap: 12px;
  margin: 16px 0;
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  width: 100%;
`;
