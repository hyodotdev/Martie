import {internalMutation} from '../_generated/server';
import {v} from 'convex/values';

export const setForceUpdate = internalMutation({
  args: {
    version: v.string(),
    shouldUpdate: v.boolean(),
  },
  handler: async (ctx, {version, shouldUpdate}) => {
    const existing = await ctx.db
      .query('appVersions')
      .filter((q) => q.eq(q.field('version'), version))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {shouldUpdate});
    } else {
      await ctx.db.insert('appVersions', {
        version,
        shouldUpdate,
        createdAt: Date.now(),
      });
    }
  },
});
