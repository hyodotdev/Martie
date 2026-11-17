import {internalMutation} from '../_generated/server';
import {v} from 'convex/values';

export const insertQuizLanguage = internalMutation({
  args: {
    languageData: v.object({
      key: v.string(),
      language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
      value: v.string(),
      type: v.string(),
    }),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const {key, language, value, type} = args.languageData;

    const existingEntry = await ctx.db
      .query('quizLanguages')
      .withIndex('by_key_and_language', (q) =>
        q.eq('key', key).eq('language', language),
      )
      .first();

    if (existingEntry) {
      return null;
    }

    const id = await ctx.db.insert('quizLanguages', {
      key,
      language,
      value,
      type,
    });

    return id;
  },
});

export const insertQuizLanguageBatch = internalMutation({
  args: {
    languages: v.array(
      v.object({
        key: v.string(),
        language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
        value: v.string(),
        type: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const insertions = args.languages.map((lang) =>
      ctx.db.insert('quizLanguages', lang),
    );
    await Promise.all(insertions);
    return true;
  },
});

// 퀴즈 언어 데이터 배치 업데이트
export const updateQuizLanguageBatch = internalMutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id('quizLanguages'),
        value: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const updates = args.updates.map((update) =>
      ctx.db.patch(update.id, {value: update.value}),
    );
    await Promise.all(updates);
    return true;
  },
});
