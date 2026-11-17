/**
 * 3개 채널 일괄 업로드
 *
 * 사용법:
 *   bun run scripts/upload-all.ts 20260415                                  # 즉시 공개
 *   bun run scripts/upload-all.ts 20260416 --schedule 2026-04-16T00:00:00Z  # 전체 동일 예약
 *   bun run scripts/upload-all.ts 20260416 --schedules 2026-04-16T00:15:00Z,2026-04-16T01:30:00Z,2026-04-16T02:45:00Z  # 채널별 예약 (ko,en,ja 순서)
 *
 * 썸네일: 같은 이름의 .png 파일 (quiz-ko-YYYYMMDD.png)이 있으면 자동 적용
 */

import {execSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const date = process.argv[2];
if (!date) {
  console.error('사용법: bun run scripts/upload-all.ts <YYYYMMDD> [--schedule <ISO>] [--schedules <ko,en,ja>]');
  process.exit(1);
}

const scheduleIdx = process.argv.indexOf('--schedule');
const scheduleAt = scheduleIdx !== -1 ? process.argv[scheduleIdx + 1] : undefined;

if (scheduleIdx !== -1 && !scheduleAt) {
  console.error('❌ --schedule 옵션에 ISO8601 타임스탬프가 필요합니다.');
  process.exit(1);
}

const schedulesIdx = process.argv.indexOf('--schedules');
const schedulesArg = schedulesIdx !== -1 ? process.argv[schedulesIdx + 1] : undefined;
const perChannelSchedules: Record<string, string> = {};
if (schedulesArg) {
  const parts = schedulesArg.split(',');
  if (parts.length !== 3) {
    console.error('❌ --schedules는 ko,en,ja 순서의 3개 ISO 타임스탬프가 필요합니다.');
    process.exit(1);
  }
  perChannelSchedules.ko = parts[0];
  perChannelSchedules.en = parts[1];
  perChannelSchedules.ja = parts[2];
}

const outDir = path.join(__dirname, '..', 'out');
const channels = ['ko', 'en', 'ja'] as const;

const mode = schedulesArg
  ? `채널별 예약`
  : scheduleAt
    ? `예약 (${scheduleAt})`
    : '즉시 공개';
console.log(`\n🚀 ${date} 영상 3개 채널 업로드 시작 [${mode}]\n`);

for (const ch of channels) {
  const videoFile = path.join(outDir, `quiz-${ch}-${date}.mp4`);
  const thumbFile = path.join(outDir, `quiz-${ch}-${date}.png`);

  if (!fs.existsSync(videoFile)) {
    console.error(`⚠️  [${ch}] 영상 없음: ${videoFile}`);
    continue;
  }

  try {
    console.log(`📤 [${ch}] 업로드 중...`);
    const args = ['run', 'scripts/youtube-upload.ts', ch, videoFile];
    const chSchedule = perChannelSchedules[ch] ?? scheduleAt;
    if (chSchedule) {
      args.push('--schedule', chSchedule);
    }
    if (fs.existsSync(thumbFile)) {
      args.push('--thumbnail', thumbFile);
    }
    execSync(
      `bun ${args.map((a) => `"${a}"`).join(' ')}`,
      {stdio: 'inherit', cwd: path.join(__dirname, '..'), shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'},
    );
    console.log('');
  } catch (err) {
    console.error(`❌ [${ch}] 업로드 실패\n`);
  }
}

console.log('🎉 완료!');
