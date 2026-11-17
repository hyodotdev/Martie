import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import {Animated, Easing, View} from 'react-native';
import {css} from 'kstyled';
import {Typography, useCPK} from 'cpk-ui';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Image} from 'expo-image';
import {IC_MARTIE_EYE} from '../icons';
import {t} from '../STRINGS';

function CustomLoadingIndicator({
  style,
  text,
}: {
  style?: StyleProp<ViewStyle>;
  text?: string;
}): JSX.Element {
  const {theme} = useCPK();
  const {bottom} = useSafeAreaInsets();
  const loadingText = text || t('common.loading');

  const [scale] = React.useState(() => new Animated.Value(1));
  const [opacity] = React.useState(() => new Animated.Value(0.5));
  const [textOpacity] = React.useState(() => new Animated.Value(1));
  const [textTranslateY] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    const imageAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            toValue: 1.2,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            toValue: 1,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            toValue: 0.5,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    const textAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(textOpacity, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            toValue: 0.5,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            toValue: 1,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(textTranslateY, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            toValue: -10,
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    imageAnimation.start();
    textAnimation.start();

    return () => {
      imageAnimation.stop();
      textAnimation.stop();
    };
  }, [opacity, scale, textOpacity, textTranslateY]);

  const animatedStyle = {
    opacity,
    transform: [{scale}],
  };
  const textAnimatedStyle = {
    opacity: textOpacity,
    transform: [{translateY: textTranslateY}],
  };

  return (
    <View
      accessible={true}
      accessibilityLabel={loadingText}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityState={{busy: true}}
      style={[
        css`
          flex: 1;
          padding-bottom: ${bottom + 20 + 'px'};
          align-self: stretch;
          background-color: ${theme.bg.basic};

          justify-content: center;
          align-items: center;
        `,
        style,
      ]}
    >
      <Animated.View aria-hidden={true} style={animatedStyle}>
        <Image
          source={IC_MARTIE_EYE}
          style={css`
            height: 120px;
            width: 120px;
          `}
        />
      </Animated.View>
      <Animated.View
        aria-hidden={true}
        style={[
          textAnimatedStyle,
          css`
            position: absolute;
            bottom: ${bottom + 40 + 'px'};
            padding: 0 20px;
          `,
        ]}
      >
        <Typography.Body2
          style={css`
            text-align: center;
          `}
        >
          {loadingText}
        </Typography.Body2>
      </Animated.View>
    </View>
  );
}

export default CustomLoadingIndicator;
