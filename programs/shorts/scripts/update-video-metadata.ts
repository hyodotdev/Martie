/**
 * YouTube 영상 제목/설명 수정 스크립트
 *
 * 사용법:
 *   bun run scripts/update-video-metadata.ts ko VIDEO_ID out/video.txt
 *   bun run scripts/update-video-metadata.ts ko VIDEO_ID out/video.txt --category 27
 */

import {google} from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SECRETS_DIR = path.join(__dirname, '..', 'secrets');
const CLIENT_SECRET_PATH = path.join(SECRETS_DIR, 'client_secret.json');
const DEFAULT_YOUTUBE_CATEGORY_ID = '27';
const DEFAULT_LANGUAGE_BY_CHANNEL: Record<string, string> = {
  ko: 'ko',
  en: 'en',
  ja: 'ja',
};

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
    console.error(`❌ [${channel}] 토큰이 없습니다. 먼저 인증하세요:`);
    console.error(`   bun run scripts/youtube-auth.ts ${channel}`);
    process.exit(1);
  }

  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  const {channelId, channelTitle, ...oauthTokens} = tokens;
  oauth2Client.setCredentials(oauthTokens);

  oauth2Client.on('tokens', (newTokens) => {
    const merged = {...tokens, ...newTokens};
    fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
    console.log(`   🔄 [${channel}] 토큰 갱신됨`);
  });

  return oauth2Client;
}

function parseTxtFile(txtPath: string): {title: string; description: string} {
  const content = fs.readFileSync(txtPath, 'utf-8');

  const titleMatch = content.match(/\[(?:제목|Title|タイトル)\]\s*\n(.+)/);
  const descMatch = content.match(/\[(?:설명|Description|説明)\]\s*\n([\s\S]+)/);

  const title = titleMatch?.[1]?.trim();
  if (!title) {
    throw new Error(`[제목] 섹션을 찾을 수 없습니다: ${txtPath}`);
  }

  return {
    title,
    description: descMatch?.[1]?.trim() || '',
  };
}

async function updateMetadata(
  channel: string,
  videoId: string,
  txtPath: string,
  categoryId = DEFAULT_YOUTUBE_CATEGORY_ID,
): Promise<void> {
  const absoluteTxtPath = path.resolve(txtPath);
  if (!fs.existsSync(absoluteTxtPath)) {
    console.error(`❌ txt 파일이 없습니다: ${absoluteTxtPath}`);
    process.exit(1);
  }

  const {title, description} = parseTxtFile(absoluteTxtPath);
  const auth = getAuthClient(channel);
  const youtube = google.youtube({version: 'v3', auth});
  const currentVideoRes = await youtube.videos.list({
    part: ['snippet'],
    id: [videoId],
  });
  const currentSnippet = currentVideoRes.data.items?.[0]?.snippet;
  if (!currentSnippet) {
    throw new Error(`영상 snippet을 찾을 수 없습니다: ${videoId}`);
  }

  const mergedSnippet = {
    title,
    description,
    categoryId,
    defaultLanguage:
      currentSnippet.defaultLanguage ??
      DEFAULT_LANGUAGE_BY_CHANNEL[channel] ??
      'en',
    ...(currentSnippet.tags ? {tags: currentSnippet.tags} : {}),
    ...(currentSnippet.defaultAudioLanguage
      ? {defaultAudioLanguage: currentSnippet.defaultAudioLanguage}
      : {}),
  };

  console.log(`\n✏️  [${channel}] 영상 메타데이터 수정`);
  console.log(`   영상 ID: ${videoId}`);
  console.log(`   제목: ${title}`);
  console.log(`   카테고리 ID: ${categoryId}`);

  await youtube.videos.update({
    part: ['snippet'],
    requestBody: {
      id: videoId,
      snippet: mergedSnippet,
    },
  });

  console.log(`✅ 수정 완료: https://youtube.com/shorts/${videoId}`);
}

const channel = process.argv[2];
const videoId = process.argv[3];
const txtPath = process.argv[4];

if (!channel || !['ko', 'en', 'ja'].includes(channel) || !videoId || !txtPath) {
  console.error(
    '사용법: bun run scripts/update-video-metadata.ts <ko|en|ja> <video-id> <txt-path> [--category <id>]',
  );
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

updateMetadata(channel, videoId, txtPath, categoryId).catch((err) => {
  console.error('❌ 수정 실패:', err.message);
  process.exit(1);
});
