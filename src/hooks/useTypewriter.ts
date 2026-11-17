import {useEffect, useState, useRef} from 'react';

export const useTypewriter = (
  text: string,
  speed = 50,
  delay = 0,
  onComplete?: (isComplete: boolean) => void,
): string => {
  const [displayText, setDisplayText] = useState('');
  const currentIndexRef = useRef(0);
  const typingIntervalRef = useRef<NodeJS.Timeout>(undefined);
  const currentTextRef = useRef(text);
  const isCompletedRef = useRef(false);

  useEffect(() => {
    // 새로운 텍스트가 들어오면 초기화
    if (currentTextRef.current !== text) {
      currentTextRef.current = text;
      currentIndexRef.current = 0;
      isCompletedRef.current = false;
      setDisplayText('');
    }

    const startTyping = () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }

      typingIntervalRef.current = setInterval(() => {
        if (currentIndexRef.current <= text.length) {
          setDisplayText(text.slice(0, currentIndexRef.current));
          currentIndexRef.current += 1;

          // 타이핑이 완료되었을 때
          if (
            currentIndexRef.current > text.length &&
            !isCompletedRef.current
          ) {
            isCompletedRef.current = true;
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current);
            }
            onComplete?.(true);
          }
        }
      }, speed);
    };

    const delayTimeout = setTimeout(startTyping, delay);

    return () => {
      clearTimeout(delayTimeout);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, [text, speed, delay, onComplete]);

  return displayText;
};
