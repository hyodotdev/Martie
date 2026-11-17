import {v} from 'convex/values';
import {internalQuery} from '../_generated/server';

export const findChatMessage = internalQuery({
  args: v.object({
    message: v.string(),
    isInitialQuestion: v.optional(v.boolean()),
  }),
  handler: async (ctx, {message, isInitialQuestion}) => {
    if (isInitialQuestion !== undefined) {
      return await ctx.db
        .query('chats')
        .withIndex('by_message_and_initial', (q) =>
          q.eq('message', message).eq('isInitialQuestion', isInitialQuestion),
        )
        .first();
    }

    return await ctx.db
      .query('chats')
      .withIndex('by_message_and_initial', (q) => q.eq('message', message))
      .first();
  },
});
