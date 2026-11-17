import type {FC} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, baseText} from '../styles';
import type {QuizOption} from '../data/quizData';

type Props = {
  question: string;
  options: QuizOption[];
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = ['#FF5B50', '#FF9F79', '#1FB763', '#5B8DEF'];

export const Question: FC<Props> = ({question, options}) => {
  const frame = useCurrentFrame();
  const questionOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        ...baseText,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 80,
        width: '100%',
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1.5,
          opacity: questionOpacity,
          maxWidth: 960,
          color: COLORS.text,
        }}
      >
        {question}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          width: '100%',
          maxWidth: 960,
        }}
      >
        {options.map((opt, i) => {
          const delay = 15 + i * 8;
          const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const translateX = interpolate(frame, [delay, delay + 8], [60, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateX(${translateX}px)`,
                backgroundColor: COLORS.card,
                borderRadius: 24,
                padding: '30px 36px',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                border: `3px solid ${COLORS.cardBorder}`,
                boxShadow: '0 3px 12px rgba(55, 20, 11, 0.06)',
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  backgroundColor: OPTION_COLORS[i],
                  width: 68,
                  height: 68,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {OPTION_LABELS[i]}
              </div>
              <div style={{fontSize: 48, fontWeight: 600, color: COLORS.text, textAlign: 'left'}}>
                {opt.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
