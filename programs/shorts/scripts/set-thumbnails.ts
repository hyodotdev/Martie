/**
 * 이미 업로드된 영상에 커스텀 썸네일 적용
 *
 * 사용법:
 *   bun run scripts/set-thumbnails.ts <YYYYMMDD> <ko|en|ja> <videoId>
 *   bun run scripts/set-thumbnails.ts 20260421 ko y5yZ2b3lFqI
 *
 * 또는 배치 (같은 날짜 3개 채널 한 번에):
 *   bun run scripts/set-thumbnails.ts --batch 20260421 <ko-id>,<en-id>,<ja-id>
 *   bun run scripts/set-thumbnails.ts --batch 20260421 y5yZ2b3lFqI,Nxd_qeewXkI,O0U-MH5Hqsc
 *
 * 전제: 채널 전화 인증 완료 + out/quiz-{ch}-{date}.png 파일 존재
 */

import {google} from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SECRETS_DIR = path.join(__dirname, '..', 'secrets');
const CLIENT_SECRET_PATH = path.join(SECRETS_DIR, 'client_secret.json');
const OUT_DIR = path.join(__dirname, '..', 'out');

function getAuthClient(channel: string): InstanceType<typeof google.auth.OAuth2> {
  const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf-8'));
  const {client_id, client_secret} = credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3333/callback',
  );

  const tokenPath = path.join(SECRETS_DIR, `token-${channel}.json`);
  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  const {channelId: _c, channelTitle: _t, ...oauthTokens} = tokens;
  oauth2Client.setCredentials(oauthTokens);

  oauth2Client.on('tokens', (newTokens) => {
    const merged = {...tokens, ...newTokens};
    fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
  });

  return oauth2Client;
}

async function setOne(channel: string, date: string, videoId: string): Promise<void> {
  const thumbPath = path.join(OUT_DIR, `quiz-${channel}-${date}.png`);
  if (!fs.existsSync(thumbPath)) {
    console.error(`❌ 썸네일 없음: ${thumbPath}`);
    return;
  }

  const auth = getAuthClient(channel);
  const youtube = google.youtube({version: 'v3', auth});

  try {
    await youtube.thumbnails.set({
      videoId,
      media: {body: fs.createReadStream(thumbPath)},
    });
    console.log(`✅ [${channel}] ${videoId} ← ${thumbPath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [${channel}] ${videoId}: ${msg}`);
  }
}

async function main(): Promise<void> {
  const batchIdx = process.argv.indexOf('--batch');
  if (batchIdx !== -1) {
    const date = process.argv[batchIdx + 1];
    const idsStr = process.argv[batchIdx + 2];
    if (!date || !/^\d{8}$/.test(date) || !idsStr) {
      console.error('사용법: --batch <YYYYMMDD> <ko-id>,<en-id>,<ja-id>');
      process.exit(1);
    }
    const ids = idsStr.split(',');
    if (ids.length !== 3) {
      console.error('❌ 3개 영상 ID가 필요합니다 (ko,en,ja)');
      process.exit(1);
    }
    const channels = ['ko', 'en', 'ja'];
    for (let i = 0; i < 3; i++) {
      await setOne(channels[i], date, ids[i]);
    }
    return;
  }

  const date = process.argv[2];
  const channel = process.argv[3];
  const videoId = process.argv[4];
  if (!date || !channel || !videoId || !/^\d{8}$/.test(date) || !['ko', 'en', 'ja'].includes(channel)) {
    console.error('사용법: bun run scripts/set-thumbnails.ts <YYYYMMDD> <ko|en|ja> <videoId>');
    console.error('       bun run scripts/set-thumbnails.ts --batch <YYYYMMDD> <ko-id,en-id,ja-id>');
    process.exit(1);
  }
  await setOne(channel, date, videoId);
}

main().catch((err) => {
  console.error('❌ 실행 실패:', err);
  process.exit(1);
});
