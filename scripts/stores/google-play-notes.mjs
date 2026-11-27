#!/usr/bin/env node
// Adds the localized release notes from release-notes/<version>.json to the
// Google Play release that holds a versionCode (the draft that
// android-production uploaded). It changes only the release notes: the
// release keeps its status, so a draft stays a draft. A release users can
// already see is left alone unless --allow-live is given.
//
//   node scripts/stores/google-play-notes.mjs languages
//   node scripts/stores/google-play-notes.mjs apply --version-code 119 [--track internal] [--dry-run]
//
// Reads the service account key file from GOOGLE_PLAY_SERVICE_ACCOUNT_FILE.
// Every run opens a Play edit; `languages` and `--dry-run` delete it again.
import {Buffer} from 'node:buffer';
import {createSign} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseArgs} from 'node:util';

import {loadNotes, notesFor} from './release-notes.mjs';

const PACKAGE = 'dev.hyo.martie';
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;

const {positionals, values} = parseArgs({
  allowPositionals: true,
  options: {
    'version-code': {type: 'string'},
    track: {type: 'string', default: 'internal'},
    'dry-run': {type: 'boolean', default: false},
    'allow-live': {type: 'boolean', default: false},
  },
});

// Throws so that `finally` blocks still delete the open edit.
function fail(message) {
  throw new Error(message);
}

const base64url = (value) => Buffer.from(value).toString('base64url');

async function token() {
  const file = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE;
  if (!file) {
    fail('GOOGLE_PLAY_SERVICE_ACCOUNT_FILE is required');
  }
  const key = JSON.parse(readFileSync(file, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64url(JSON.stringify({alg: 'RS256', typ: 'JWT'})),
    base64url(
      JSON.stringify({
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ),
  ].join('.');
  const signature = createSign('RSA-SHA256')
    .update(unsigned)
    .sign(key.private_key, 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!response.ok) {
    fail(`Google token request failed: ${response.status}`);
  }
  return (await response.json()).access_token;
}

let auth;

async function call(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {...auth, 'Content-Type': 'application/json'},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    fail(`${method} ${path} -> ${response.status}\n${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function listingLanguages(editId) {
  const {listings = []} = await call('GET', `/edits/${editId}/listings`);
  return listings.map((listing) => listing.language);
}

async function apply() {
  const versionCode = values['version-code'];
  if (!/^\d+$/.test(versionCode ?? '')) {
    fail('apply needs --version-code');
  }
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
  const notes = loadNotes(version);
  if (!notes) {
    fail(`release-notes/${version}.json is missing`);
  }

  const edit = await call('POST', '/edits');
  try {
    const languages = await listingLanguages(edit.id);
    const track = await call('GET', `/edits/${edit.id}/tracks/${values.track}`);
    const release = track.releases?.find((candidate) =>
      candidate.versionCodes?.includes(versionCode),
    );
    if (!release) {
      fail(`No ${values.track} release holds versionCode ${versionCode}`);
    }
    // A completed or rolling-out release already shows its notes to users.
    if (release.status !== 'draft' && !values['allow-live']) {
      fail(
        `The ${values.track} release is ${release.status}, not a draft; ` +
          'rerun with --allow-live to change notes users already see',
      );
    }
    release.releaseNotes = languages.map((language) => ({
      language,
      text: notesFor(language, notes),
    }));
    for (const note of release.releaseNotes) {
      console.log(`${note.language}: ${note.text.split('\n')[0]}`);
    }
    if (values['dry-run']) {
      console.log(
        `Dry run: would set notes on the ${release.status} ${values.track} release`,
      );
      return;
    }
    await call('PUT', `/edits/${edit.id}/tracks/${values.track}`, track);
    await call('POST', `/edits/${edit.id}:commit`);
    console.log(
      `Set ${release.releaseNotes.length} release notes on the ${release.status} ` +
        `${values.track} release (versionCode ${versionCode})`,
    );
    edit.id = null;
  } finally {
    if (edit.id) {
      await call('DELETE', `/edits/${edit.id}`);
    }
  }
}

async function main() {
  auth = {Authorization: `Bearer ${await token()}`};
  switch (positionals[0]) {
    case 'languages': {
      const edit = await call('POST', '/edits');
      try {
        console.log((await listingLanguages(edit.id)).join(', '));
      } finally {
        await call('DELETE', `/edits/${edit.id}`);
      }
      break;
    }
    case 'apply':
      await apply();
      break;
    default:
      fail(
        'Usage: google-play-notes.mjs languages | apply --version-code N [--track internal] [--dry-run]',
      );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
