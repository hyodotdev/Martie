# Release notes

One JSON file per store version, named after `package.json`'s version
(`2.9.0.json`), maps the app's language codes to that version's notes:

```json
{
  "en": "Daily quizzes now keep your streak across devices.",
  "ko": "이제 기기를 바꿔도 데일리 퀴즈 연속 기록이 이어져요.",
  "ja": "デイリークイズの連続記録が端末をまたいで続くようになりました。"
}
```

- `en` is required; the other codes are those in `assets/langs`
  (`ko`, `ja`, `de`, `es`, `fr`, `th`, `tw`, `vi`). Each text is at most 500
  characters (Google Play's limit).
- A store locale with no text gets `en`. Without a file, the stores get the
  release tag message.
- `bun run test:stores` (run in CI) checks every file here.

Where each store gets them:

| Store           | How                                                                      | When                        |
| --------------- | ------------------------------------------------------------------------ | --------------------------- |
| Amazon Appstore | `amazon-production` sets each listing's language                         | on upload                   |
| Meta Horizon    | `horizon-production` sends `en`                                          | on upload                   |
| Google Play     | `scripts/stores/google-play-notes.mjs apply`                             | before review, on the draft |
| App Store       | `scripts/stores/release-notes.mjs asc-changes` → `asc prepare` / `apply` | before review               |
