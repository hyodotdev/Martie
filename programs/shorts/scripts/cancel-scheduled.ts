/**
 * 예약된 YouTube Shorts 일괄 취소 스크립트
 *
 * 사용법:
 *   bun run scripts/cancel-scheduled.ts 20260421              # dry-run (삭제 안함, 목록만)
 *   bun run scripts/cancel-scheduled.ts 20260421 --confirm    # 실제 삭제
 *   bun run scripts/cancel-scheduled.ts 20260421 --channels ko,ja --confirm
 *
 * 주의: 토큰에 youtube.force-ssl 스코프가 필요합니다.
 *       없으면 `bun run scripts/youtube-auth.ts <ch>` 로 재인증하세요.
 */

import {google} from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SECRETS_DIR = path.join(__dirname, '..', 'secrets');
const CLIENT_SECRET_PATH = path.join(SECRETS_DIR, 'client_secret.json');

function getAuthClient(channel: string): InstanceType<typeof google.auth.OAuth2> {
  const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf-8'));
  const {client_id, client_secret} = credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3333/callback',
  );

  const tokenPath = path.join(SECRETS_DIR, `token-${channel}.json`);
  if (!fs.existsSync(tokenPath)) {
    throw new Error(`토큰 없음: ${tokenPath}`);
  }

  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  const {channelId: _cid, channelTitle: _ct, ...oauthTokens} = tokens;
  oauth2Client.setCredentials(oauthTokens);

  oauth2Client.on('tokens', (newTokens) => {
    const merged = {...tokens, ...newTokens};
    fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
  });

  return oauth2Client;
}

type ScheduledVideo = {
  id: string;
  title: string;
  publishAt: string;
};

async function listScheduledForDate(
  channel: string,
  dateYYYYMMDD: string,
): Promise<ScheduledVideo[]> {
  const auth = getAuthClient(channel);
  const youtube = google.youtube({version: 'v3', auth});

  const searchRes = await youtube.search.list({
    part: ['id'],
    forMine: true,
    type: ['video'],
    order: 'date',
    maxResults: 50,
  });

  const ids =
    searchRes.data.items
      ?.map((i) => i.id?.videoId)
      .filter((v): v is string => !!v) ?? [];

  if (ids.length === 0) return [];

  const videosRes = await youtube.videos.list({
    part: ['snippet', 'status'],
    id: ids,
  });

  const isoDate = `${dateYYYYMMDD.slice(0, 4)}-${dateYYYYMMDD.slice(4, 6)}-${dateYYYYMMDD.slice(6, 8)}`;

  const scheduled: ScheduledVideo[] = [];
  for (const v of videosRes.data.items ?? []) {
    const publishAt = v.status?.publishAt;
    if (!publishAt) continue;
    if (!publishAt.startsWith(isoDate)) continue;
    if (v.status?.privacyStatus !== 'private') continue;
    scheduled.push({
      id: v.id ?? '',
      title: v.snippet?.title ?? '(제목 없음)',
      publishAt,
    });
  }
  return scheduled;
}

async function deleteVideo(channel: string, videoId: string): Promise<void> {
  const auth = getAuthClient(channel);
  const youtube = google.youtube({version: 'v3', auth});
  await youtube.videos.delete({id: videoId});
}

async function main(): Promise<void> {
  const date = process.argv[2];
  if (!date || !/^\d{8}$/.test(date)) {
    console.error('사용법: bun run scripts/cancel-scheduled.ts <YYYYMMDD> [--channels ko,en,ja] [--confirm]');
    process.exit(1);
  }

  const confirm = process.argv.includes('--confirm');
  const chIdx = process.argv.indexOf('--channels');
  const channels =
    chIdx !== -1 && process.argv[chIdx + 1]
      ? process.argv[chIdx + 1].split(',')
      : ['ko', 'en', 'ja'];

  console.log(`\n🔍 ${date} 예약 영상 조회 [${channels.join(', ')}]`);
  console.log(`   모드: ${confirm ? '🔥 실제 삭제' : '🧪 dry-run (조회만)'}\n`);

  let totalFound = 0;
  let totalDeleted = 0;

  for (const ch of channels) {
    let scheduled: ScheduledVideo[];
    try {
      scheduled = await listScheduledForDate(ch, date);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ [${ch}] 조회 실패: ${msg}`);
      continue;
    }

    console.log(`[${ch}] ${scheduled.length}개 예약됨`);
    for (const v of scheduled) {
      console.log(`   - ${v.id}: ${v.title} @ ${v.publishAt}`);
      totalFound++;
    }

    if (!confirm || scheduled.length === 0) continue;

    for (const v of scheduled) {
      try {
        await deleteVideo(ch, v.id);
        console.log(`   ✅ 삭제: ${v.id}`);
        totalDeleted++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`   ❌ 삭제 실패 ${v.id}: ${msg}`);
      }
    }
    console.log('');
  }

  console.log(`\n📊 총 ${totalFound}개 발견${confirm ? `, ${totalDeleted}개 삭제 완료` : ' (dry-run, 삭제 안됨)'}`);
  if (!confirm && totalFound > 0) {
    console.log(`   실제 삭제하려면: --confirm 플래그 추가`);
  }
}

main().catch((err) => {
  console.error('❌ 실행 실패:', err);
  process.exit(1);
});
