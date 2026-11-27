#!/usr/bin/env node
// Ships the Fire OS APK through the Amazon Appstore App Submission API.
// https://developer.amazon.com/docs/app-submission-api/overview.html
//
//   node scripts/stores/amazon-appstore.mjs check
//   node scripts/stores/amazon-appstore.mjs plan
//   node scripts/stores/amazon-appstore.mjs upload --file app.apk --notes-file notes.txt [--submit]
//
// `check` proves the credentials work. `plan` reads the open (or a new) edit
// and prints what `upload` would change, writing nothing. `upload` replaces
// the binary in the edit, which keeps its device targeting, re-applies the
// previous targeting if Amazon dropped any of it, sets each listing's release
// notes in its language (release-notes/<version>.json, falling back to
// --notes-file) and validates the edit. Only `--submit` commits the edit,
// which sends it to Amazon review.
//
// Reads AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET (the App Submission API
// security profile) and AMAZON_APP_ID (defaults to the package name). The API
// takes APKs only, not app bundles.
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {parseArgs} from 'node:util';

import {loadNotes, notesFor} from './release-notes.mjs';

const API = 'https://developer.amazon.com/api/appstore/v1';
const APP_ID = process.env.AMAZON_APP_ID || 'dev.hyo.martie';

const {positionals, values} = parseArgs({
  allowPositionals: true,
  options: {
    file: {type: 'string'},
    'notes-file': {type: 'string'},
    submit: {type: 'boolean', default: false},
  },
});
const command = positionals[0];

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function token() {
  const id = process.env.AMAZON_CLIENT_ID;
  const secret = process.env.AMAZON_CLIENT_SECRET;
  if (!id || !secret) {
    fail('AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET are required');
  }
  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: id,
      client_secret: secret,
      scope: 'appstore::apps:readwrite',
    }),
  });
  if (!response.ok) {
    fail(`Amazon token request failed: ${response.status}`);
  }
  return (await response.json()).access_token;
}

const auth = {Authorization: `Bearer ${await token()}`};

// Returns {body, etag}. An empty 200 (no open edit) gives a null body.
async function call(method, path, {body, headers = {}, ok = [200]} = {}) {
  const response = await fetch(`${API}/applications/${APP_ID}${path}`, {
    method,
    headers: {...auth, ...headers},
    body,
  });
  const text = await response.text();
  if (!ok.includes(response.status)) {
    const hint =
      response.status === 412
        ? ' (the app is in review or the ETag is stale; wait until it is live)'
        : '';
    fail(`${method} ${path} -> ${response.status}${hint}\n${text}`);
  }
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    etag: response.headers.get('etag'),
  };
}

const json = (value) => ({
  body: JSON.stringify(value),
  headers: {'Content-Type': 'application/json'},
});

async function openEdit({create}) {
  const active = await call('GET', '/edits');
  if (active.body?.id) {
    return {edit: active.body, created: false};
  }
  if (!create) {
    return {edit: null, created: false};
  }
  return {edit: (await call('POST', '/edits')).body, created: true};
}

const targeted = (targeting) =>
  [...(targeting.amazonDevices ?? []), ...(targeting.nonAmazonDevices ?? [])]
    .filter((device) => device.status === 'TARGETING')
    .map((device) => device.name ?? device.id);

async function describe(editId) {
  const {body: apks} = await call('GET', `/edits/${editId}/apks`);
  for (const apk of apks) {
    const {body: targeting} = await call(
      'GET',
      `/edits/${editId}/apks/${apk.id}/targeting`,
    );
    const devices = targeted(targeting);
    const statuses = {};
    for (const device of [
      ...(targeting.amazonDevices ?? []),
      ...(targeting.nonAmazonDevices ?? []),
    ]) {
      statuses[device.status] = (statuses[device.status] ?? 0) + 1;
    }
    console.log(`Device statuses: ${JSON.stringify(statuses)}`);
    console.log(
      `Binary ${apk.name ?? apk.id}: versionCode ${apk.versionCode}, ` +
        `${devices.length} targeted devices: ${devices.join(', ')}`,
    );
  }
  const {body: listings} = await call('GET', `/edits/${editId}/listings`);
  console.log(`Listings: ${Object.keys(listings?.listings ?? {}).join(', ')}`);
  return apks;
}

// Copies the status of every device the old targeting had onto the new one.
function restoreTargeting(before, after) {
  let changed = 0;
  for (const key of ['amazonDevices', 'nonAmazonDevices']) {
    const previous = new Map((before[key] ?? []).map((d) => [d.id, d.status]));
    for (const device of after[key] ?? []) {
      const status = previous.get(device.id);
      if (status && status !== device.status) {
        device.status = status;
        changed += 1;
      }
    }
  }
  return changed;
}

async function upload() {
  if (!values.file || !values['notes-file']) {
    fail('upload needs --file and --notes-file');
  }
  if (!values.file.endsWith('.apk')) {
    fail('The App Submission API accepts APKs only');
  }
  const fallback = readFileSync(values['notes-file'], 'utf8');
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
  const notes = loadNotes(version);
  const apk = readFileSync(values.file);

  const {edit, created} = await openEdit({create: true});
  console.log(`${created ? 'Created' : 'Using open'} edit ${edit.id}`);
  const apks = await describe(edit.id);
  if (apks.length !== 1) {
    fail(
      `Expected one binary in the edit, found ${apks.length}; ` +
        'fix the edit in the Developer Console first',
    );
  }

  const old = apks[0];
  const {body: before} = await call(
    'GET',
    `/edits/${edit.id}/apks/${old.id}/targeting`,
  );
  const {etag: apkEtag} = await call('GET', `/edits/${edit.id}/apks/${old.id}`);
  const {body: replaced} = await call(
    'PUT',
    `/edits/${edit.id}/apks/${old.id}/replace`,
    {
      body: apk,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'If-Match': apkEtag,
        fileName: basename(values.file),
      },
    },
  );
  console.log(
    `Replaced ${old.name ?? old.id} with ${basename(values.file)} ` +
      `(versionCode ${replaced.versionCode})`,
  );

  const target = `/edits/${edit.id}/apks/${replaced.id}/targeting`;
  const {body: after, etag: targetEtag} = await call('GET', target);
  if (restoreTargeting(before, after) > 0) {
    await call('PUT', target, {
      ...json(after),
      headers: {'Content-Type': 'application/json', 'If-Match': targetEtag},
    });
  }
  const devices = targeted((await call('GET', target)).body);
  if (devices.length === 0) {
    fail('The new binary targets no devices');
  }
  console.log(`Targets ${devices.length} devices: ${devices.join(', ')}`);

  const {body: listings} = await call('GET', `/edits/${edit.id}/listings`);
  for (const language of Object.keys(listings?.listings ?? {})) {
    const path = `/edits/${edit.id}/listings/${language}`;
    const {body: listing, etag} = await call('GET', path);
    await call('PUT', path, {
      ...json({...listing, recentChanges: notesFor(language, notes, fallback)}),
      headers: {'Content-Type': 'application/json', 'If-Match': etag},
    });
    console.log(`Release notes set for ${language}`);
  }

  const validation = await call('POST', `/edits/${edit.id}/validate`, {
    ok: [200, 403],
  });
  if (validation.status === 403) {
    fail(`The edit does not validate:\n${JSON.stringify(validation.body)}`);
  }
  console.log('The edit validates');

  if (!values.submit) {
    console.log(
      'Left the edit open. Review it in the Developer Console, then submit ' +
        'there or rerun with submit on.',
    );
    return;
  }
  const {etag: editEtag} = await call('GET', `/edits/${edit.id}`);
  await call('POST', `/edits/${edit.id}/commit`, {
    headers: {'If-Match': editEtag},
  });
  console.log('Committed the edit: it is now in Amazon review');
}

switch (command) {
  case 'check': {
    const {edit} = await openEdit({create: false});
    console.log(
      edit
        ? `Amazon API access works; open edit ${edit.id} (${edit.status})`
        : 'Amazon API access works; no open edit',
    );
    break;
  }
  case 'plan': {
    const {edit} = await openEdit({create: false});
    const source = edit ?? (await call('GET', '/edits/previous')).body;
    if (!source?.id) {
      // Edits made in the Developer Console may not show up here; `upload`
      // then creates a new edit from the live version.
      console.log(
        `No open edit and no previous API edit (${JSON.stringify(source)}); ` +
          'upload will create a new edit',
      );
      break;
    }
    console.log(`${edit ? 'Open' : 'Previous'} edit ${source.id}`);
    await describe(source.id);
    break;
  }
  case 'upload':
    await upload();
    break;
  default:
    fail(
      'Usage: amazon-appstore.mjs check | plan | upload --file x.apk --notes-file f [--submit]',
    );
}
