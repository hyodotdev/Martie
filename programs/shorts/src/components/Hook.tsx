import type {FC} from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {COLORS, baseText} from '../styles';

type Props = {
  hookText: string;
  category: string;
  quizNumber: number;
  totalQuizzes: number;
};

export const Hook: FC<Props> = ({hookText, category, quizNumber, totalQuizzes}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [0, 15], [0.8, 1], {
    extrapolateRight: 'clamp',
  });
  const logoScale = interpolate(frame, [0, 20], [0.5, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        ...baseText,
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 36,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Img
          src={staticFile('martie-logo.png')}
          style={{
            width: 150,
            height: 150,
            transform: `scale(${logoScale})`,
          }}
        />
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.textSub,
            backgroundColor: COLORS.cardBorder,
            padding: '12px 30px',
            borderRadius: 40,
          }}
        >
          Q{quizNumber}/{totalQuizzes}
        </div>
      </div>
      <div
        style={{
          fontSize: 108,
          fontWeight: 800,
          lineHeight: 1.3,
          color: COLORS.text,
        }}
      >
        {hookText}
      </div>
      <div
        style={{
          fontSize: 54,
          fontWeight: 700,
          color: COLORS.primary,
          backgroundColor: `${COLORS.primary}15`,
          padding: '20px 54px',
          borderRadius: 50,
          border: `4px solid ${COLORS.primary}`,
        }}
      >
        #{category}
      </div>
    </div>
  );
};
