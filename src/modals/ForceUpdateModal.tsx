import React, {useCallback, useEffect} from 'react';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {styled, css} from 'kstyled';
import {Image} from 'expo-image';
import {IC_MARTIE_SWEAT} from '../icons';
import {Typography, useCPK} from 'cpk-ui';
import {t} from '../STRINGS';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {GestureHandlerButton} from '../uis/GestureHandlerButton';
import {openMartieStore} from '../utils/storeLinks';
import {useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {appVersion} from '../../config';
import {usePlayInAppUpdate} from '../hooks/usePlayInAppUpdate';

const MODAL_HEIGHT = 420;
const BACKDROP_OPACITY = 0.5;

type Props = {
  onVisibilityChange?: (visible: boolean) => void;
};

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }

  return 0;
}

export default function ForceUpdateModal({
  onVisibilityChange,
}: Props): JSX.Element | null {
  const {theme} = useCPK();
  const forceUpdateVersion = useQuery(
    api.appVersion.queries.getForceUpdateVersion,
  );
  const translateY = useSharedValue(MODAL_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const needsUpdate =
    forceUpdateVersion &&
    appVersion &&
    compareVersions(appVersion, forceUpdateVersion.version) < 0;

  // On Google Play the store's own update screen comes first; this modal
  // stays as the fallback if the user backs out of a forced update.
  usePlayInAppUpdate(
    forceUpdateVersion === undefined ? undefined : Boolean(needsUpdate),
  );

  const showModal = useCallback(() => {
    translateY.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [backdropOpacity, translateY]);

  useEffect(() => {
    if (needsUpdate) {
      showModal();
    }
  }, [needsUpdate, showModal]);

  useEffect(() => {
    onVisibilityChange?.(Boolean(needsUpdate));
    return () => onVisibilityChange?.(false);
  }, [needsUpdate, onVisibilityChange]);

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

  const handleGoToAppStore = useCallback(() => {
    void openMartieStore();
  }, []);

  if (!needsUpdate) {
    return null;
  }

  return (
    <Container>
      <Backdrop style={backdropStyle} />
      <Animated.View style={modalStyle} pointerEvents="box-none">
        <Content accessibilityViewIsModal importantForAccessibility="yes">
          <Image
            accessible={false}
            source={IC_MARTIE_SWEAT}
            style={css`
              width: 150px;
              height: 150px;
            `}
          />
          <TextContainer>
            <Typography.Heading5 accessibilityRole="header">
              {t('forceUpdate.title')}
            </Typography.Heading5>
            <Typography.Body2
              style={css`
                text-align: center;
                line-height: 22px;
              `}
            >
              {t('forceUpdate.message')}
            </Typography.Body2>
          </TextContainer>
          <GestureHandlerButton
            hapticFeedback={ImpactFeedbackStyle.Soft}
            onPress={handleGoToAppStore}
            accessibilityLabel={t('forceUpdate.button')}
            accessibilityRole="button"
            text={
              <Typography.Body2
                numberOfLines={1}
                ellipsizeMode="tail"
                style={css`
                  color: ${theme.button.primary.text};
                `}
              >
                {t('forceUpdate.button')}
              </Typography.Body2>
            }
            borderRadius={12}
            style={css`
              align-self: stretch;
              height: 48px;
            `}
          />
        </Content>
      </Animated.View>
    </Container>
  );
}

const Container = styled.View`
  position: absolute;
  width: 100%;
  height: 100%;
  justify-content: flex-end;
  z-index: 9999;
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
  padding: 40px 40px 60px 40px;
  align-items: center;
`;

const TextContainer = styled.View`
  margin: 36px 0 24px;
  align-items: center;
  gap: 16px;
`;
