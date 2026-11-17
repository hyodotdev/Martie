import {query} from '../_generated/server';
import {v} from 'convex/values';

export const getByKeysAndLanguage = query({
  args: {
    keys: v.array(v.string()),
    language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
  },
  handler: async (ctx, {keys, language}) => {
    const results = await Promise.all(
      keys.map((key) =>
        ctx.db
          .query('articleLanguages')
          .withIndex('by_key_and_language', (q) =>
            q.eq('key', key).eq('language', language),
          )
          .collect(),
      ),
    );
    return results.flat();
  },
});

export const getByLanguage = query({
  args: {
    language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
  },
  handler: async (ctx, {language}) => {
    return await ctx.db
      .query('articleLanguages')
      .withIndex('by_language', (q) => q.eq('language', language))
      .collect();
  },
});
