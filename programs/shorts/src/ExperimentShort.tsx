import type {CSSProperties, FC} from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {COLORS, FPS, HEIGHT, WIDTH} from './styles';
import type {
  DemoExperimentShortProps,
  ExperimentShortProps,
  QuizExperimentShortProps,
} from './data/experimentData';

const text: CSSProperties = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: COLORS.text,
  textAlign: 'center',
};

const fillCenter: CSSProperties = {
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: COLORS.bg,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 72,
};

const DEFAULT_UI = {
  timerPrompt: '3초 안에 골라봐',
  demoTitle: '오늘의 상식 퀴즈',
  demoRevealTitle: '앱에서 바로 풀기',
};

function pop(frame: number, start = 0) {
  return interpolate(frame, [start, start + 8, start + 16], [0.82, 1.08, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

const Pill: FC<{children: string; tone?: 'dark' | 'primary'}> = ({
  children,
  tone = 'primary',
}) => (
  <div
    style={{
      ...text,
      fontSize: 46,
      fontWeight: 900,
      color: tone === 'primary' ? '#FFFDF6' : COLORS.text,
      backgroundColor: tone === 'primary' ? COLORS.primary : '#FFE7A3',
      padding: '18px 44px',
      borderRadius: 999,
      letterSpacing: 0,
    }}
  >
    {children}
  </div>
);

const HookScene: FC<ExperimentShortProps> = ({hook, badge}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{...fillCenter, gap: 48}}>
      <Pill tone="dark">{badge}</Pill>
      <div
        style={{
          ...text,
          fontSize: 112,
          fontWeight: 950,
          lineHeight: 1.14,
          transform: `scale(${pop(frame)})`,
          maxWidth: 960,
        }}
      >
        {hook}
      </div>
      <div style={{fontSize: 160, lineHeight: 1}}>🧠</div>
    </AbsoluteFill>
  );
};

const QuizScene: FC<QuizExperimentShortProps> = ({question, options, ui}) => {
  const frame = useCurrentFrame();
  const timerPrompt = ui?.timerPrompt ?? DEFAULT_UI.timerPrompt;
  return (
    <AbsoluteFill style={{...fillCenter, justifyContent: 'flex-start', paddingTop: 220, gap: 58}}>
      <div
        style={{
          ...text,
          fontSize: 68,
          fontWeight: 900,
          lineHeight: 1.25,
          maxWidth: 950,
        }}
      >
        {question}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: 20,
        }}
      >
        {options.map((option, index) => {
          const opacity = interpolate(
            frame,
            [index * 7, index * 7 + 7],
            [0, 1],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            },
          );
          const translateY = interpolate(
            frame,
            [index * 7, index * 7 + 7],
            [32, 0],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            },
          );
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                width: '100%',
                backgroundColor: COLORS.card,
                border: `4px solid ${COLORS.cardBorder}`,
                borderRadius: 26,
                padding: '28px 34px',
                opacity,
                transform: `translateY(${translateY}px)`,
                boxShadow: '0 8px 22px rgba(55, 20, 11, 0.08)',
              }}
            >
              <div
                style={{
                  ...text,
                  color: '#FFFDF6',
                  fontSize: 44,
                  fontWeight: 950,
                  backgroundColor: COLORS.primary,
                  width: 74,
                  height: 74,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <div
                style={{
                  ...text,
                  textAlign: 'left',
                  fontSize: 50,
                  fontWeight: 850,
                  lineHeight: 1.18,
                }}
              >
                {option.text}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          ...text,
          fontSize: 52,
          fontWeight: 950,
          color: COLORS.primary,
          marginTop: 10,
        }}
      >
        {timerPrompt}
      </div>
    </AbsoluteFill>
  );
};

const DemoScene: FC<DemoExperimentShortProps> = ({steps, ui}) => {
  const frame = useCurrentFrame();
  const demoTitle = ui?.demoTitle ?? DEFAULT_UI.demoTitle;
  return (
    <AbsoluteFill style={{...fillCenter, gap: 46}}>
      <div
        style={{
          width: 520,
          height: 930,
          borderRadius: 72,
          backgroundColor: '#181818',
          padding: 22,
          boxShadow: '0 28px 70px rgba(55, 20, 11, 0.28)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 54,
            backgroundColor: COLORS.bg,
            padding: 34,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <Img
            src={staticFile('martie-logo.png')}
            style={{width: 142, height: 142}}
          />
          <div
            style={{
              ...text,
              fontSize: 45,
              fontWeight: 950,
              lineHeight: 1.16,
            }}
          >
            {demoTitle}
          </div>
          {steps.map((step, index) => {
            const opacity = interpolate(
              frame,
              [index * 9, index * 9 + 7],
              [0, 1],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              },
            );
            return (
              <div
                key={index}
                style={{
                  ...text,
                  width: '100%',
                  fontSize: 38,
                  fontWeight: 850,
                  backgroundColor: index % 2 === 0 ? '#FFE7A3' : '#FFFFFF',
                  border: `3px solid ${COLORS.cardBorder}`,
                  borderRadius: 24,
                  padding: '26px 24px',
                  opacity,
                }}
              >
                {step}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const RevealScene: FC<ExperimentShortProps> = (props) => {
  const {kind, reveal, cta, ui} = props;
  const frame = useCurrentFrame();
  const demoRevealTitle = ui?.demoRevealTitle ?? DEFAULT_UI.demoRevealTitle;
  return (
    <AbsoluteFill style={{...fillCenter, gap: 46}}>
      <div
        style={{
          ...text,
          fontSize: kind === 'quiz' ? 82 : 92,
          fontWeight: 950,
          color: COLORS.correct,
          lineHeight: 1.15,
          transform: `scale(${pop(frame)})`,
          maxWidth: 940,
        }}
      >
        {kind === 'quiz' ? props.answer : demoRevealTitle}
      </div>
      <div
        style={{
          ...text,
          fontSize: 52,
          fontWeight: 750,
          lineHeight: 1.35,
          color: COLORS.textSub,
          maxWidth: 940,
        }}
      >
        {reveal}
      </div>
      <div
        style={{
          ...text,
          fontSize: 58,
          fontWeight: 950,
          color: '#FFFDF6',
          backgroundColor: COLORS.primary,
          padding: '28px 58px',
          borderRadius: 999,
          marginTop: 18,
        }}
      >
        {cta}
      </div>
    </AbsoluteFill>
  );
};

export const ExperimentShort: FC<ExperimentShortProps> = (props) => {
  const bgmFile = props.bgmNumber
    ? `bgm-${String(props.bgmNumber).padStart(2, '0')}.mp3`
    : 'bgm.mp3';

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <Audio src={staticFile(bgmFile)} volume={0.34} />
      <Sequence from={0} durationInFrames={FPS}>
        <Audio src={staticFile('swoosh.mp3')} volume={0.5} />
      </Sequence>
      <Sequence from={0} durationInFrames={FPS * 2}>
        <HookScene {...props} />
      </Sequence>

      <Sequence from={FPS * 2} durationInFrames={FPS * 5}>
        {props.kind === 'quiz' ? <QuizScene {...props} /> : <DemoScene {...props} />}
      </Sequence>

      {props.kind === 'quiz' ? (
        <>
          {[0, 1, 2].map((tick) => (
            <Sequence
              key={tick}
              from={FPS * 4 + tick * FPS}
              durationInFrames={FPS}
            >
              <Audio src={staticFile('tick.mp3')} volume={0.7} />
            </Sequence>
          ))}
          <Sequence from={FPS * 7} durationInFrames={FPS}>
            <Audio src={staticFile('correct.mp3')} volume={0.6} />
          </Sequence>
        </>
      ) : null}

      <Sequence from={FPS * 7} durationInFrames={FPS * 5}>
        <RevealScene {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const ExperimentThumbnail: FC<ExperimentShortProps> = ({
  hook,
  badge,
  kind,
}) => (
  <AbsoluteFill
    style={{
      ...fillCenter,
      background:
        kind === 'quiz'
          ? 'linear-gradient(135deg, #FF5B50 0%, #FF9F79 100%)'
          : 'linear-gradient(135deg, #1A2B4B 0%, #5B8DEF 100%)',
      gap: 48,
    }}
  >
    <Pill tone="dark">{badge}</Pill>
    <div
      style={{
        ...text,
        fontSize: 120,
        fontWeight: 950,
        lineHeight: 1.1,
        color: '#FFFDF6',
        textShadow: '0 10px 0 rgba(0,0,0,0.22)',
      }}
    >
      {hook}
    </div>
    <div style={{fontSize: 190, lineHeight: 1}}>{kind === 'quiz' ? '🧠' : '📱'}</div>
  </AbsoluteFill>
);
