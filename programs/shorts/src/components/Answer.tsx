import type {FC} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, baseText} from '../styles';
import type {QuizOption} from '../data/quizData';

type Props = {
  options: QuizOption[];
  explanation: string;
  correctText?: string;
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export const Answer: FC<Props> = ({options, explanation, correctText}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const explainOpacity = interpolate(frame, [20, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        ...baseText,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 48,
        width: '100%',
      }}
    >
      <div style={{fontSize: 68, fontWeight: 800, color: COLORS.correct}}>
        {correctText || '정답! ✅'}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          width: '100%',
          maxWidth: 960,
        }}
      >
        {options.map((opt, i) => {
          const isCorrect = opt.isAnswer;
          const scale = isCorrect
            ? interpolate(frame, [5, 15], [1, 1.03], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : 1;

          return (
            <div
              key={i}
              style={{
                backgroundColor: isCorrect
                  ? `${COLORS.correct}18`
                  : `${COLORS.wrong}66`,
                borderRadius: 24,
                padding: '28px 36px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                border: isCorrect
                  ? `3px solid ${COLORS.correct}`
                  : '2px solid transparent',
                transform: `scale(${scale})`,
                opacity: isCorrect ? 1 : 0.45,
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  color: isCorrect ? COLORS.correct : COLORS.textSub,
                  minWidth: 56,
                }}
              >
                {OPTION_LABELS[i]}
              </div>
              <div
                style={{
                  fontSize: 46,
                  fontWeight: isCorrect ? 700 : 500,
                  color: isCorrect ? COLORS.text : COLORS.textSub,
                  textAlign: 'left',
                }}
              >
                {opt.text}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          opacity: explainOpacity,
          fontSize: 48,
          fontWeight: 600,
          lineHeight: 1.5,
          color: COLORS.textSub,
          maxWidth: 920,
          marginTop: 10,
          backgroundColor: `${COLORS.accent}20`,
          padding: '20px 28px',
          borderRadius: 16,
        }}
      >
        {explanation}
      </div>
    </div>
  );
};
