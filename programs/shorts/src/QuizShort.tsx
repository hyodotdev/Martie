import type {FC} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Hook} from './components/Hook';
import {Question} from './components/Question';
import {Countdown} from './components/Countdown';
import {Answer} from './components/Answer';
import {CTA} from './components/CTA';
import {
  COLORS,
  QUIZ_SCENES,
  QUIZ_FRAMES,
  FPS,
  CTA_DURATION_SEC,
  TOTAL_FRAMES,
  container,
  containerFull,
} from './styles';
import type {QuizItem} from './data/quizData';

export type MultiQuizProps = {
  quizzes: QuizItem[];
  ctaText: string;
  bgmNumber?: number;
  correctText?: string;
  countdownText?: string;
  downloadText?: string;
};

export const QuizShort: FC<MultiQuizProps> = ({
  quizzes,
  ctaText,
  bgmNumber,
  correctText,
  countdownText,
  downloadText,
}) => {
  const ctaStart = QUIZ_FRAMES * quizzes.length;
  const bgmFile = bgmNumber
    ? `bgm-${String(bgmNumber).padStart(2, '0')}.mp3`
    : 'bgm.mp3';

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      {/* BGM - plays throughout */}
      <Audio src={staticFile(bgmFile)} volume={0.3} />

      {quizzes.map((quiz, i) => {
        const offset = QUIZ_FRAMES * i;

        return (
          <div key={i}>
            {/* Swoosh on quiz start */}
            <Sequence from={offset} durationInFrames={FPS}>
              <Audio src={staticFile('swoosh.mp3')} volume={0.5} />
            </Sequence>

            {/* Hook: 0-2s */}
            <Sequence
              from={offset + QUIZ_SCENES.hook.start}
              durationInFrames={QUIZ_SCENES.hook.duration}
            >
              <AbsoluteFill style={container}>
                <Hook
                  hookText={quiz.hookText}
                  category={quiz.category}
                  quizNumber={i + 1}
                  totalQuizzes={quizzes.length}
                />
              </AbsoluteFill>
            </Sequence>

            {/* Question: 2-10s */}
            <Sequence
              from={offset + QUIZ_SCENES.question.start}
              durationInFrames={QUIZ_SCENES.question.duration}
            >
              <AbsoluteFill style={containerFull}>
                <Question question={quiz.question} options={quiz.options} />
              </AbsoluteFill>
            </Sequence>

            {/* Countdown overlay: 7-10s (3 ticks) */}
            <Sequence
              from={offset + QUIZ_SCENES.countdown.start}
              durationInFrames={QUIZ_SCENES.countdown.duration}
            >
              <AbsoluteFill
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 253, 246, 0.85)',
                }}
              >
                <Countdown countdownText={countdownText} />
              </AbsoluteFill>
            </Sequence>

            {/* Countdown tick sounds */}
            {[0, 1, 2].map((tick) => (
              <Sequence
                key={`tick-${tick}`}
                from={offset + QUIZ_SCENES.countdown.start + FPS * tick}
                durationInFrames={FPS}
              >
                <Audio src={staticFile('tick.mp3')} volume={0.7} />
              </Sequence>
            ))}

            {/* Correct answer sound */}
            <Sequence
              from={offset + QUIZ_SCENES.answer.start}
              durationInFrames={FPS}
            >
              <Audio src={staticFile('correct.mp3')} volume={0.6} />
            </Sequence>

            {/* Answer: 10-15s */}
            <Sequence
              from={offset + QUIZ_SCENES.answer.start}
              durationInFrames={QUIZ_SCENES.answer.duration}
            >
              <AbsoluteFill style={containerFull}>
                <Answer options={quiz.options} explanation={quiz.explanation} correctText={correctText} />
              </AbsoluteFill>
            </Sequence>
          </div>
        );
      })}

      {/* CTA swoosh + scene */}
      <Sequence from={ctaStart} durationInFrames={FPS}>
        <Audio src={staticFile('swoosh.mp3')} volume={0.5} />
      </Sequence>
      <Sequence from={ctaStart} durationInFrames={FPS * CTA_DURATION_SEC}>
        <AbsoluteFill style={container}>
          <CTA ctaText={ctaText} downloadText={downloadText} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
