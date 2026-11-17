/**
 * @name ButtonMartie
 *
 * See the style guide: https://github.com/hyochan/style-guide/blob/main/docs/REACT.md
 */
import type {
  AccessibilityRole,
  AccessibilityState,
  TouchableHighlightProps,
} from 'react-native';
import {Button} from 'cpk-ui';
import {useAudioPlayer} from 'expo-audio'; // 가정
import {AUDIO_PRESS} from '../sounds';
import {
  safePlayAudioPlayer,
  safeSeekAudioPlayerToStart,
} from '../utils/audioPlayer';

type Props = {
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  disabled?: boolean;
  onPress: () => void;
  text: string;
  touchableHighlightProps?: Omit<
    TouchableHighlightProps,
    'onPress' | 'activeOpacity' | 'style'
  >;
  [key: string]: any;
};

export default function ButtonMartie({
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  disabled,
  onPress,
  text,
  touchableHighlightProps,
  ...rest
}: Props): JSX.Element {
  const audioPressPlayer = useAudioPlayer(AUDIO_PRESS);

  const handlePress = () => {
    if (disabled) return;

    safeSeekAudioPlayerToStart(audioPressPlayer);
    safePlayAudioPlayer(audioPressPlayer);
    onPress();
  };

  const mergedAccessibilityState = {
    ...touchableHighlightProps?.accessibilityState,
    ...accessibilityState,
    ...(disabled !== undefined ? {disabled} : {}),
  };
  const hasAccessibilityState = Object.keys(mergedAccessibilityState).length > 0;

  return (
    <Button
      borderRadius={12}
      disabled={disabled}
      onPress={handlePress}
      text={text}
      touchableHighlightProps={{
        ...touchableHighlightProps,
        accessibilityLabel:
          accessibilityLabel ?? touchableHighlightProps?.accessibilityLabel ?? text,
        accessibilityRole,
        ...(hasAccessibilityState
          ? {accessibilityState: mergedAccessibilityState}
          : {}),
      }}
      {...rest}
    />
  );
}
