import type {FC} from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {COLORS, FPS, baseText} from '../styles';

type Props = {
  ctaText: string;
  downloadText?: string;
};

export const CTA: FC<Props> = ({ctaText, downloadText}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [0, 15], [0.9, 1], {
    extrapolateRight: 'clamp',
  });
  const buttonPulse = 1 + 0.03 * Math.sin((frame / FPS) * Math.PI * 4);

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
      <Img
        src={staticFile('martie-logo.png')}
        style={{width: 180, height: 180}}
      />
      <Img
        src={staticFile('wordmark.png')}
        style={{width: 360, height: 'auto'}}
      />
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.3,
          color: COLORS.text,
        }}
      >
        {ctaText}
      </div>
      <div
        style={{
          transform: `scale(${buttonPulse})`,
          backgroundColor: COLORS.primary,
          borderRadius: 60,
          padding: '32px 80px',
          fontSize: 56,
          fontWeight: 700,
          color: '#FFFFFF',
        }}
      >
        {downloadText || '지금 다운로드 →'}
      </div>
      <div
        style={{
          fontSize: 42,
          color: COLORS.textSub,
          marginTop: 8,
        }}
      >
        App Store & Google Play
      </div>
    </div>
  );
};
