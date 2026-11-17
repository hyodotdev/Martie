import {query} from '../_generated/server';

export const getForceUpdateVersion = query({
  args: {},
  handler: async (ctx) => {
    const versions = await ctx.db
      .query('appVersions')
      .withIndex('by_shouldUpdate', (q) => q.eq('shouldUpdate', true))
      .collect();

    if (versions.length === 0) return null;

    // Return the highest version among active force-update entries
    return versions.sort((a, b) => {
      const pa = a.version.split('.').map(Number);
      const pb = b.version.split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    })[0];
  },
});
