/**
 * YouTube 영상 업로드 스크립트
 *
 * 사용법:
 *   bun run scripts/youtube-upload.ts ko out/quiz-ko-20260415.mp4
 *   bun run scripts/youtube-upload.ts en out/quiz-en-20260415.mp4
 *   bun run scripts/youtube-upload.ts ja out/quiz-ja-20260415.mp4
 *   bun run scripts/youtube-upload.ts ko out/quiz.mp4 --category 27
 *
 * txt 파일이 같은 이름으로 존재하면 제목/설명을 자동으로 읽어옵니다.
 *   out/quiz-ko-20260415.txt → [제목], [설명] 파싱
 */

import {google} from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SECRETS_DIR = path.join(__dirname, '..', 'secrets');
const CLIENT_SECRET_PATH = path.join(SECRETS_DIR, 'client_secret.json');
const DEFAULT_YOUTUBE_CATEGORY_ID = '27';

function getAuthClient(channel: string): {auth: InstanceType<typeof google.auth.OAuth2>; channelId?: string} {
  const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf-8'));
  const {client_id, client_secret} =
    credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3333/callback',
  );

  const tokenPath = path.join(SECRETS_DIR, `token-${channel}.json`);
  if (!fs.existsSync(tokenPath)) {
    console.error(`❌ [${channel}] 토큰이 없습니다. 먼저 인증하세요:`);
    console.error(`   bun run scripts/youtube-auth.ts`);
    process.exit(1);
  }

  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  const {channelId, channelTitle, ...oauthTokens} = tokens;
  oauth2Client.setCredentials(oauthTokens);

  // Auto-refresh token
  oauth2Client.on('tokens', (newTokens) => {
    const merged = {...tokens, ...newTokens};
    fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
    console.log(`   🔄 [${channel}] 토큰 갱신됨`);
  });

  return {auth: oauth2Client, channelId};
}

function parseTxtFile(txtPath: string): {title: string; description: string} {
  if (!fs.existsSync(txtPath)) {
    return {title: 'Martie Quiz Challenge', description: ''};
  }

  const content = fs.readFileSync(txtPath, 'utf-8');

  // Parse [제목]/[Title]/[タイトル] section
  const titleMatch = content.match(
    /\[(?:제목|Title|タイトル)\]\s*\n(.+)/,
  );
  const title = titleMatch?.[1]?.trim() || 'Martie Quiz Challenge';

  // Parse [설명]/[Description]/[説明] section - everything after it
  const descMatch = content.match(
    /\[(?:설명|Description|説明)\]\s*\n([\s\S]+)/,
  );
  const description = descMatch?.[1]?.trim() || '';

  return {title, description};
}

async function upload(
  channel: string,
  videoPath: string,
  scheduleAt?: string,
  thumbnailPath?: string,
  categoryId = DEFAULT_YOUTUBE_CATEGORY_ID,
): Promise<void> {
  const absoluteVideoPath = path.resolve(videoPath);
  if (!fs.existsSync(absoluteVideoPath)) {
    console.error(`❌ 영상 파일이 없습니다: ${absoluteVideoPath}`);
    process.exit(1);
  }

  // Try to find matching txt file
  const txtPath = absoluteVideoPath.replace(/\.mp4$/, '.txt');
  const {title, description} = parseTxtFile(txtPath);

  // Auto-detect thumbnail if not provided
  let resolvedThumb = thumbnailPath ? path.resolve(thumbnailPath) : undefined;
  if (!resolvedThumb) {
    const autoThumb = absoluteVideoPath.replace(/\.mp4$/, '.png');
    if (fs.existsSync(autoThumb)) {
      resolvedThumb = autoThumb;
    }
  } else if (!fs.existsSync(resolvedThumb)) {
    console.error(`❌ 썸네일 파일이 없습니다: ${resolvedThumb}`);
    process.exit(1);
  }

  console.log(`\n📤 [${channel}] 업로드 시작`);
  console.log(`   영상: ${absoluteVideoPath}`);
  console.log(`   제목: ${title}`);
  console.log(`   카테고리 ID: ${categoryId}`);
  if (resolvedThumb) {
    console.log(`   썸네일: ${resolvedThumb}`);
  }

  const {auth, channelId} = getAuthClient(channel);
  const youtube = google.youtube({version: 'v3', auth});
  if (channelId) {
    console.log(`   채널 ID: ${channelId}`);
  }

  const isScheduled = !!scheduleAt;
  if (isScheduled) {
    console.log(`   예약 공개: ${scheduleAt}`);
  }

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        categoryId,
        defaultLanguage: ({ko: 'ko', ja: 'ja', en: 'en'} as Record<string, string>)[channel] || 'en',
      },
      status: {
        privacyStatus: isScheduled ? 'private' : 'public',
        selfDeclaredMadeForKids: false,
        ...(isScheduled ? {publishAt: scheduleAt} : {}),
      },
    },
    media: {
      body: fs.createReadStream(absoluteVideoPath),
    },
  });

  const videoId = res.data.id ?? undefined;
  console.log(`\n✅ [${channel}] 업로드 완료!`);
  console.log(`   영상 ID: ${videoId}`);
  console.log(`   URL: https://youtube.com/shorts/${videoId}`);
  if (isScheduled) {
    console.log(`   예약 공개 시간: ${scheduleAt}`);
  }

  if (resolvedThumb && videoId) {
    try {
      await youtube.thumbnails.set({
        videoId,
        media: {body: fs.createReadStream(resolvedThumb)},
      });
      console.log(`   🖼️  썸네일 설정 완료`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ⚠️  썸네일 설정 실패: ${msg}`);
    }
  }
}

// Main
const channel = process.argv[2];
const videoPath = process.argv[3];

if (!channel || !['ko', 'en', 'ja'].includes(channel) || !videoPath) {
  console.error(
    '사용법: bun run scripts/youtube-upload.ts <ko|en|ja> <video-path> [--schedule <ISO8601>] [--thumbnail <path>] [--category <id>]',
  );
  process.exit(1);
}

// Parse --schedule option
const scheduleIdx = process.argv.indexOf('--schedule');
const scheduleAt = scheduleIdx !== -1 ? process.argv[scheduleIdx + 1] : undefined;

if (scheduleIdx !== -1 && !scheduleAt) {
  console.error('❌ --schedule 옵션에 ISO8601 타임스탬프가 필요합니다.');
  process.exit(1);
}

const thumbIdx = process.argv.indexOf('--thumbnail');
const thumbnailPath = thumbIdx !== -1 ? process.argv[thumbIdx + 1] : undefined;

if (thumbIdx !== -1 && !thumbnailPath) {
  console.error('❌ --thumbnail 옵션에 이미지 경로가 필요합니다.');
  process.exit(1);
}

const categoryIdx = process.argv.indexOf('--category');
const categoryId =
  categoryIdx !== -1
    ? process.argv[categoryIdx + 1]
    : process.env.YOUTUBE_CATEGORY_ID ?? DEFAULT_YOUTUBE_CATEGORY_ID;

if (!categoryId) {
  console.error('❌ --category 옵션에 YouTube 카테고리 ID가 필요합니다.');
  process.exit(1);
}

upload(channel, videoPath, scheduleAt, thumbnailPath, categoryId).catch((err) => {
  console.error('❌ 업로드 실패:', err.message);
  process.exit(1);
});
