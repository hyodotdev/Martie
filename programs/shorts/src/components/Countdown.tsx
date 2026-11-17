import type {FC} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, baseText, FPS} from '../styles';

type Props = {
  countdownText?: string;
};

export const Countdown: FC<Props> = ({countdownText}) => {
  const frame = useCurrentFrame();
  const numbers = [3, 2, 1];
  const perNumber = FPS;

  return (
    <div
      style={{
        ...baseText,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
      }}
    >
      <div style={{fontSize: 68, fontWeight: 700, color: COLORS.textSub}}>
        {countdownText || '정답은...? 🤔'}
      </div>
      <div style={{position: 'relative', width: 280, height: 280}}>
        {numbers.map((num, i) => {
          const start = i * perNumber;
          const end = start + perNumber;
          const opacity = interpolate(
            frame,
            [start, start + 5, end - 5, end],
            [0, 1, 1, 0],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          );
          const scale = interpolate(frame, [start, start + 10], [1.5, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={num}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity,
                transform: `scale(${scale})`,
              }}
            >
              <div
                style={{
                  fontSize: 180,
                  fontWeight: 900,
                  color: COLORS.primary,
                }}
              >
                {num}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
