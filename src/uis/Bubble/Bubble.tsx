/**
 * @name Bubble
 */
import {StyleProp, TextStyle, ViewStyle} from 'react-native';
import BaseBubble from './BubbleBase';

type Props = {
  text: string | JSX.Element;
  style?: StyleProp<ViewStyle>;
  styles?: {
    container?: ViewStyle;
    text?: TextStyle;
    triangle?: ViewStyle;
  };
  tailDirection?: 'bottom' | 'left';
};

function Bubble({text, style, styles, tailDirection}: Props): JSX.Element {
  return (
    <BaseBubble
      text={text}
      style={style}
      styles={styles}
      tailDirection={tailDirection}
    />
  );
}

export default Bubble;
