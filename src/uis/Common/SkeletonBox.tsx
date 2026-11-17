import React, {useEffect} from 'react';
import type {DimensionValue} from 'react-native';
import {useCPK} from 'cpk-ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Props = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
};

export default function SkeletonBox({
  width,
  height,
  borderRadius = 8,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, {duration: 1000, easing: Easing.inOut(Easing.ease)}),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({opacity: opacity.value}));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.text.placeholder,
        },
      ]}
    />
  );
}
