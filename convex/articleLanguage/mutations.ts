import {internalMutation} from '../_generated/server';
import {v} from 'convex/values';

export const insertArticleLanguageBatch = internalMutation({
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
  handler: async (ctx, {languages}) => {
    for (const lang of languages) {
      const existing = await ctx.db
        .query('articleLanguages')
        .withIndex('by_key_and_language', (q) =>
          q.eq('key', lang.key).eq('language', lang.language),
        )
        .first();
      if (!existing) {
        await ctx.db.insert('articleLanguages', lang);
      }
    }
  },
});
