#!/usr/bin/env node
// Localized store release notes from release-notes/<version>.json, which maps
// the app's language codes (assets/langs: en, ko, ja, de, es, fr, th, tw, vi)
// to the text for that version. Store locales map onto them: `ko-KR` -> ko,
// `zh-TW` / `zh-Hant` -> tw. A locale with no text falls back to en, then to
// the fallback text (the tag message).
//
//   node scripts/stores/release-notes.mjs text <locale> [--fallback-file f]
//   node scripts/stores/release-notes.mjs asc-changes
//
// `text` prints the notes for one store locale. `asc-changes` prints a change
// file for the maintenance kit's `asc prepare` that sets What's New on every
// App Store locale of this version.
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const APP_LANGUAGES = [
  'en',
  'ko',
  'ja',
  'de',
  'es',
  'fr',
  'th',
  'tw',
  'vi',
];
// App Store Connect caps What's New at 4000 characters, Google Play at 500.
export const MAX_LENGTH = 500;

export function appLanguage(locale) {
  const normalized = locale.replace('_', '-').toLowerCase();
  if (/^zh-(tw|hk|mo|hant)/.test(normalized)) {
    return 'tw';
  }
  return normalized.split('-')[0];
}

export function validateNotes(notes) {
  const problems = [];
  if (typeof notes?.en !== 'string' || !notes.en.trim()) {
    problems.push('en is required');
  }
  for (const [language, text] of Object.entries(notes ?? {})) {
    if (!APP_LANGUAGES.includes(language)) {
      problems.push(`unknown language ${language}`);
    } else if (typeof text !== 'string' || !text.trim()) {
      problems.push(`${language} is empty`);
    } else if (text.trim().length > MAX_LENGTH) {
      problems.push(`${language} is over ${MAX_LENGTH} characters`);
    }
  }
  return problems;
}

export function notesFor(locale, notes, fallback = '') {
  const text = notes?.[appLanguage(locale)] ?? notes?.en ?? fallback;
  return text.trim();
}

export function loadNotes(version, root = ROOT) {
  const file = join(root, 'release-notes', `${version}.json`);
  if (!existsSync(file)) {
    return null;
  }
  const notes = JSON.parse(readFileSync(file, 'utf8'));
  const problems = validateNotes(notes);
  if (problems.length > 0) {
    throw new Error(`${file}: ${problems.join('; ')}`);
  }
  return notes;
}

const APP_STORE_LOCALES = ['en-US', 'ko', 'ja'];

export function ascChanges(version, notes) {
  return {
    schema: 1,
    app: {id: '6740057833', bundleId: 'dev.hyo.martie'},
    operations: APP_STORE_LOCALES.map((locale) => ({
      key: `whats-new-${locale.toLowerCase()}`,
      kind: 'version-localization',
      version,
      platform: 'IOS',
      locale,
      attributes: {whatsNew: notesFor(locale, notes)},
    })),
  };
}

function appVersion() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const {positionals, values} = parseArgs({
    allowPositionals: true,
    options: {'fallback-file': {type: 'string'}},
  });
  const version = appVersion();
  const notes = loadNotes(version);
  const fallback = values['fallback-file']
    ? readFileSync(values['fallback-file'], 'utf8')
    : '';
  if (positionals[0] === 'text' && positionals[1]) {
    console.log(notesFor(positionals[1], notes, fallback));
  } else if (positionals[0] === 'asc-changes') {
    if (!notes) {
      console.error(`release-notes/${version}.json is missing`);
      process.exit(1);
    }
    console.log(JSON.stringify(ascChanges(version, notes), null, 2));
  } else {
    console.error(
      'Usage: release-notes.mjs text <locale> [--fallback-file f] | asc-changes',
    );
    process.exit(1);
  }
}
