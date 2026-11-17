import type {QueryCtx} from '../_generated/server';

type QuizLanguage = 'en' | 'ko' | 'ja';

export async function getQuizLanguageMap(
  ctx: QueryCtx,
  keys: string[],
  language: QuizLanguage,
): Promise<Map<string, string>> {
  const uniqueKeys = [
    ...new Set(keys.filter((key) => typeof key === 'string' && key.length > 0)),
  ];

  const languageEntries = await Promise.all(
    uniqueKeys.map((key) =>
      ctx.db
        .query('quizLanguages')
        .withIndex('by_key_and_language', (q) =>
          q.eq('key', key).eq('language', language),
        )
        .first(),
    ),
  );

  const langMap = new Map<string, string>();
  for (const entry of languageEntries) {
    if (entry) {
      langMap.set(entry.key, entry.value);
    }
  }

  return langMap;
}
