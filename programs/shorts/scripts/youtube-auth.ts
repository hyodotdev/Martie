/**
 * YouTube OAuth 인증 스크립트 (브랜드 계정 지원)
 *
 * 사용법:
 *   bun run scripts/youtube-auth.ts ko   # 한국어 채널 (마티) 로 로그인
 *   bun run scripts/youtube-auth.ts en   # 영어 채널 (Martie) 로 로그인
 *   bun run scripts/youtube-auth.ts ja   # 일본어 채널 (マティ) 로 로그인
 *
 * 브라우저에서 Google 계정 선택 후, 해당 언어의 브랜드 계정을 선택하세요.
 *
 * 사전 준비:
 *   1. Google Cloud Console → API & Services → Credentials
 *   2. OAuth 2.0 Client ID 생성 (Desktop app)
 *   3. client_secret.json 다운로드 → programs/shorts/secrets/ 에 저장
 */

import {google} from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';

const SECRETS_DIR = path.join(__dirname, '..', 'secrets');
const CLIENT_SECRET_PATH = path.join(SECRETS_DIR, 'client_secret.json');
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const CHANNEL_NAMES: Record<string, string> = {
  ko: '마티',
  en: 'Martie',
  ja: 'マティ',
};

async function authenticate(channel: string): Promise<void> {
  if (!fs.existsSync(CLIENT_SECRET_PATH)) {
    console.error('❌ client_secret.json이 없습니다.');
    console.error(`   ${CLIENT_SECRET_PATH} 에 파일을 넣어주세요.`);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf-8'));
  const {client_id, client_secret} =
    credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3333/callback',
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  const channelName = CHANNEL_NAMES[channel] || channel;
  console.log(`\n🔐 [${channel}] ${channelName} 채널 인증을 시작합니다.`);
  console.log(`   브라우저에서 로그인 후 "${channelName}" 브랜드 계정을 선택하세요:\n`);
  console.log(`   ${authUrl}\n`);

  // Local server to catch the redirect
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const queryParams = url.parse(req.url || '', true).query;
      if (queryParams.code) {
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(
          '<h1>✅ 인증 완료!</h1><p>이 창을 닫아도 됩니다.</p>',
        );
        server.close();
        resolve(queryParams.code as string);
      } else {
        res.writeHead(400);
        res.end('No code found');
        server.close();
        reject(new Error('No authorization code'));
      }
    });
    server.listen(3333, () => {
      console.log('   로컬 서버 대기 중 (port 3333)...');
    });
  });

  const {tokens} = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Verify which channel this token belongs to
  const youtube = google.youtube({version: 'v3', auth: oauth2Client});
  const channelRes = await youtube.channels.list({
    part: ['snippet', 'id'],
    mine: true,
  });

  const myChannel = channelRes.data.items?.[0];
  const channelId = myChannel?.id;
  const channelTitle = myChannel?.snippet?.title;

  // Save token with channel info
  const tokenData = {
    ...tokens,
    channelId,
    channelTitle,
  };

  const tokenPath = path.join(SECRETS_DIR, `token-${channel}.json`);
  fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));
  console.log(`\n✅ [${channel}] 인증 완료!`);
  console.log(`   채널: ${channelTitle} (${channelId})`);
  console.log(`   토큰: ${tokenPath}`);
}

// Main
const channel = process.argv[2];
if (!channel || !['ko', 'en', 'ja'].includes(channel)) {
  console.error('사용법: bun run scripts/youtube-auth.ts <ko|en|ja>');
  console.error('');
  console.error('  ko → 마티 (한국어 채널)');
  console.error('  en → Martie (영어 채널)');
  console.error('  ja → マティ (일본어 채널)');
  process.exit(1);
}

authenticate(channel).catch(console.error);
