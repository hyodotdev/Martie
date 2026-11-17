import type {CSSProperties, FC} from 'react';
import {Img, staticFile} from 'remotion';
import {COLORS, WIDTH, HEIGHT} from './styles';

export type ThumbnailProps = {
  variant: number; // 1-5
  category: string;
  hookText: string;
  topEmoji?: string;
};

const base: CSSProperties = {
  width: WIDTH,
  height: HEIGHT,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  padding: 80,
};

const V1: FC<ThumbnailProps> = ({category, hookText, topEmoji = '🔥'}) => (
  <div style={{...base, backgroundColor: COLORS.primary, gap: 60}}>
    <div style={{fontSize: 320, lineHeight: 1}}>{topEmoji}</div>
    <div
      style={{
        fontSize: 120,
        fontWeight: 900,
        color: '#FFFDF6',
        textAlign: 'center',
        lineHeight: 1.15,
        textShadow: '0 8px 0 rgba(0,0,0,0.25)',
      }}
    >
      {hookText}
    </div>
    <div
      style={{
        fontSize: 72,
        fontWeight: 800,
        color: COLORS.primary,
        backgroundColor: '#FFEB3B',
        padding: '26px 64px',
        borderRadius: 999,
        border: '8px solid #FFFDF6',
      }}
    >
      #{category}
    </div>
  </div>
);

const V2: FC<ThumbnailProps> = ({category, hookText, topEmoji = '🤔'}) => (
  <div style={{...base, backgroundColor: COLORS.bg, gap: 48}}>
    <div
      style={{
        fontSize: 80,
        fontWeight: 800,
        color: COLORS.textSub,
        backgroundColor: '#FFE7A3',
        padding: '20px 60px',
        borderRadius: 40,
      }}
    >
      {category}
    </div>
    <div style={{fontSize: 260, lineHeight: 1}}>{topEmoji}</div>
    <div
      style={{
        fontSize: 140,
        fontWeight: 900,
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 1.15,
        letterSpacing: -2,
      }}
    >
      {hookText}
    </div>
    <div
      style={{
        fontSize: 64,
        fontWeight: 800,
        color: '#FFFDF6',
        backgroundColor: COLORS.primary,
        padding: '24px 72px',
        borderRadius: 999,
        transform: 'rotate(-3deg)',
      }}
    >
      정답은?
    </div>
  </div>
);

const V3: FC<ThumbnailProps> = ({category, hookText, topEmoji = '💡'}) => (
  <div style={{...base, padding: 0, position: 'relative'}}>
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '50%',
        backgroundColor: '#1A2B4B',
      }}
    />
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '50%',
        backgroundColor: '#FFEB3B',
      }}
    />
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 40,
      }}
    >
      <div
        style={{
          fontSize: 160,
          fontWeight: 900,
          color: '#FFEB3B',
          letterSpacing: -4,
        }}
      >
        Q.
      </div>
      <div style={{fontSize: 220, lineHeight: 1}}>{topEmoji}</div>
      <div
        style={{
          fontSize: 130,
          fontWeight: 900,
          color: '#1A2B4B',
          textAlign: 'center',
          lineHeight: 1.15,
          padding: '0 60px',
        }}
      >
        {hookText}
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: '#FFFDF6',
          backgroundColor: COLORS.primary,
          padding: '18px 48px',
          borderRadius: 16,
        }}
      >
        {category}
      </div>
    </div>
  </div>
);

const V4: FC<ThumbnailProps> = ({category, hookText, topEmoji = '👑'}) => (
  <div
    style={{
      ...base,
      background: 'linear-gradient(135deg, #FF9F79 0%, #FF5B50 100%)',
      gap: 56,
    }}
  >
    <div
      style={{
        fontSize: 88,
        fontWeight: 900,
        color: '#FFFDF6',
        letterSpacing: 6,
      }}
    >
      상위 1% 만
    </div>
    <div style={{display: 'flex', gap: 40, alignItems: 'center'}}>
      <div style={{fontSize: 220, lineHeight: 1}}>{topEmoji}</div>
      <div
        style={{
          fontSize: 340,
          fontWeight: 900,
          color: '#FFEB3B',
          lineHeight: 1,
          textShadow: '0 10px 0 rgba(0,0,0,0.3)',
        }}
      >
        3
      </div>
    </div>
    <div
      style={{
        fontSize: 124,
        fontWeight: 900,
        color: '#FFFDF6',
        textAlign: 'center',
        lineHeight: 1.15,
      }}
    >
      {hookText}
    </div>
    <div
      style={{
        fontSize: 60,
        fontWeight: 800,
        color: COLORS.primary,
        backgroundColor: '#FFFDF6',
        padding: '20px 56px',
        borderRadius: 999,
      }}
    >
      #{category}
    </div>
  </div>
);

const V5: FC<ThumbnailProps> = ({category, hookText, topEmoji = '🧠'}) => (
  <div style={{...base, backgroundColor: '#FFFDF6', gap: 44}}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
      }}
    >
      <Img
        src={staticFile('martie-logo.png')}
        style={{width: 220, height: 220}}
      />
      <div style={{fontSize: 220, lineHeight: 1}}>{topEmoji}</div>
    </div>
    <div
      style={{
        fontSize: 96,
        fontWeight: 900,
        color: '#FFFDF6',
        backgroundColor: '#1FB763',
        padding: '28px 72px',
        borderRadius: 24,
        transform: 'rotate(-2deg)',
        letterSpacing: -2,
      }}
    >
      {category}
    </div>
    <div
      style={{
        fontSize: 144,
        fontWeight: 900,
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 1.12,
        letterSpacing: -3,
      }}
    >
      {hookText}
    </div>
    <div
      style={{
        display: 'flex',
        gap: 16,
      }}
    >
      {['A', 'B', 'C', 'D'].map((x) => (
        <div
          key={x}
          style={{
            fontSize: 68,
            fontWeight: 900,
            color: COLORS.textSub,
            backgroundColor: COLORS.cardBorder,
            width: 120,
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
          }}
        >
          {x}
        </div>
      ))}
    </div>
  </div>
);

export const Thumbnail: FC<ThumbnailProps> = (props) => {
  const v = ((props.variant - 1) % 5) + 1;
  if (v === 1) return <V1 {...props} />;
  if (v === 2) return <V2 {...props} />;
  if (v === 3) return <V3 {...props} />;
  if (v === 4) return <V4 {...props} />;
  return <V5 {...props} />;
};
