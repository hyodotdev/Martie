import {mkdirSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {EXPERIMENTS, type ExperimentShortProps} from '../src/data/experimentData';

const outDir = join(process.cwd(), 'out', 'experiments');
mkdirSync(outDir, {recursive: true});

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

function metadata(experiment: ExperimentShortProps) {
  const link = `https://hyo.dev/martie?source=${experiment.source}`;
  const android =
    `https://play.google.com/store/apps/details?id=dev.hyo.martie` +
    `&referrer=source%3D${experiment.source}`;
  const answer =
    experiment.kind === 'quiz'
      ? experiment.answer.replace(/^정답:\s*/, '')
      : '';

  return `[제목]
${experiment.title} #상식퀴즈 #shorts

[설명]

${experiment.hook}

${experiment.kind === 'quiz' ? `문제: ${experiment.question}` : '하루 2분 데일리 상식 퀴즈 앱 데모'}
${experiment.kind === 'quiz' ? `정답: ${answer}` : experiment.reveal}

앱에서 매일 5문제 풀기:
${link}

iOS: https://apps.apple.com/app/id6740057833?source=${experiment.source}
Android: ${android}

#퀴즈 #상식 #일반상식 #두뇌테스트 #뇌운동 #Martie #마티 #shorts
`;
}

for (const experiment of EXPERIMENTS) {
  const props = JSON.stringify(experiment);
  const base = join(outDir, experiment.id);

  run('bunx', [
    'remotion',
    'render',
    'ExperimentShort',
    `${base}.mp4`,
    '--props',
    props,
    '--concurrency=1',
  ]);

  run('bunx', [
    'remotion',
    'still',
    'ExperimentThumbnail',
    `${base}.png`,
    '--props',
    props,
    '--concurrency=1',
  ]);

  writeFileSync(`${base}.txt`, metadata(experiment), 'utf8');
}
