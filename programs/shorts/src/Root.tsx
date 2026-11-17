import type {FC} from 'react';
import {Composition} from 'remotion';
import {QuizShort} from './QuizShort';
import {Thumbnail} from './Thumbnail';
import {ExperimentShort, ExperimentThumbnail} from './ExperimentShort';
import {SAMPLE_QUIZZES} from './data/quizData';
import {DEFAULT_EXPERIMENT} from './data/experimentData';
import {WIDTH, HEIGHT, FPS, TOTAL_FRAMES} from './styles';

export const RemotionRoot: FC = () => {
  return (
    <>
      <Composition
        id="QuizShort"
        component={QuizShort}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={SAMPLE_QUIZZES}
      />
      <Composition
        id="Thumbnail"
        component={Thumbnail}
        durationInFrames={1}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          variant: 1,
          category: '세계사',
          hookText: '너 이거 아냐?',
          topEmoji: '🔥',
        }}
      />
      <Composition
        id="ExperimentShort"
        component={ExperimentShort}
        durationInFrames={FPS * 12}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={DEFAULT_EXPERIMENT}
      />
      <Composition
        id="ExperimentThumbnail"
        component={ExperimentThumbnail}
        durationInFrames={1}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={DEFAULT_EXPERIMENT}
      />
    </>
  );
};
