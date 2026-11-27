// bun run test:stores
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';

import {
  appLanguage,
  ascChanges,
  notesFor,
  validateNotes,
} from './release-notes.mjs';

const notes = {
  en: 'New quiz streaks',
  ko: '새 퀴즈 연속 기록',
  tw: '新的連續紀錄',
};

test('maps store locales onto app languages', () => {
  assert.equal(appLanguage('ko-KR'), 'ko');
  assert.equal(appLanguage('en_US'), 'en');
  assert.equal(appLanguage('ja'), 'ja');
  assert.equal(appLanguage('zh-TW'), 'tw');
  assert.equal(appLanguage('zh-Hant'), 'tw');
});

test('falls back to English, then to the tag message', () => {
  assert.equal(notesFor('ko-KR', notes), '새 퀴즈 연속 기록');
  assert.equal(notesFor('zh-Hant', notes), '新的連續紀錄');
  assert.equal(notesFor('de-DE', notes), 'New quiz streaks');
  assert.equal(notesFor('ja-JP', null, 'Tag message\n'), 'Tag message');
});

test('rejects files the stores would refuse', () => {
  assert.deepEqual(validateNotes(notes), []);
  assert.deepEqual(validateNotes({ko: '한국어만'}), ['en is required']);
  assert.deepEqual(validateNotes({en: 'x', kr: 'y'}), ['unknown language kr']);
  assert.deepEqual(validateNotes({en: 'x'.repeat(501)}), [
    'en is over 500 characters',
  ]);
});

test('builds What is New changes for every App Store locale', () => {
  const changes = ascChanges('2.9.0', notes);
  assert.deepEqual(
    changes.operations.map((op) => [op.locale, op.attributes.whatsNew]),
    [
      ['en-US', 'New quiz streaks'],
      ['ko', '새 퀴즈 연속 기록'],
      ['ja', 'New quiz streaks'],
    ],
  );
});

test('every committed release-notes file is valid', () => {
  const dir = join(import.meta.dirname, '../../release-notes');
  for (const file of readdirSync(dir).filter((name) =>
    name.endsWith('.json'),
  )) {
    const problems = validateNotes(
      JSON.parse(readFileSync(join(dir, file), 'utf8')),
    );
    assert.deepEqual(problems, [], file);
  }
});
