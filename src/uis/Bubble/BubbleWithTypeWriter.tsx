/**
 * @name BubbleWithTypeWriter
 */
import {useEffect, useState, useRef} from 'react';
import {StyleProp, ViewStyle, TextStyle} from 'react-native';
import {useTypewriter} from '../../hooks/useTypewriter';
import {getRandomWelcome} from '../../utils/welcome';
import BaseBubble from './BubbleBase';

type Props = {
  text: string | JSX.Element;
  style?: StyleProp<ViewStyle>;
  styles?: {
    container?: ViewStyle;
    text?: TextStyle;
    triangle?: ViewStyle;
  };
  typewriterSpeed?: number;
  typewriterDelay?: number;
  randomWelcome?: boolean;
  cycleInterval?: number;
  tailDirection?: 'bottom' | 'left';
};

function BubbleWithTypeWriter({
  text,
  style,
  styles,
  typewriterSpeed = 50,
  typewriterDelay = 0,
  randomWelcome = false,
  cycleInterval = 5000,
  tailDirection,
}: Props): JSX.Element {
  const [welcomeText, setWelcomeText] = useState<string | JSX.Element>(text);
  const changeTextTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const isTypingComplete = useRef(false);

  useEffect(() => {
    setWelcomeText(text);

    if (!randomWelcome || typeof text !== 'string') {
      return;
    }

    const cycleText = () => {
      if (isTypingComplete.current) {
        changeTextTimeoutRef.current = setTimeout(() => {
          setWelcomeText(getRandomWelcome());
          isTypingComplete.current = false;
        }, cycleInterval);
      }
    };

    cycleText();

    return () => {
      if (changeTextTimeoutRef.current) {
        clearTimeout(changeTextTimeoutRef.current);
      }
    };
  }, [cycleInterval, randomWelcome, text]);

  const displayText = useTypewriter(
    typeof welcomeText === 'string' ? welcomeText : '',
    typewriterSpeed,
    typewriterDelay,
    () => {
      isTypingComplete.current = true;
      if (!randomWelcome) return;

      if (changeTextTimeoutRef.current) {
        clearTimeout(changeTextTimeoutRef.current);
      }
      changeTextTimeoutRef.current = setTimeout(() => {
        setWelcomeText(getRandomWelcome());
        isTypingComplete.current = false;
      }, cycleInterval);
    },
  );

  const finalText = typeof welcomeText === 'string' ? displayText : welcomeText;

  return (
    <BaseBubble
      text={finalText}
      style={style}
      styles={styles}
      tailDirection={tailDirection}
    />
  );
}

export default BubbleWithTypeWriter;
