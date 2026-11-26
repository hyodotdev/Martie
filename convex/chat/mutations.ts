import {v} from 'convex/values';
import {internalMutation} from '../_generated/server';
import {getAuthUserId} from '../utils/auth';

export const insertChatMessage = internalMutation({
  args: v.object({
    message: v.string(),
    reply: v.string(),
    author: v.id('users'),
    isInitialQuestion: v.optional(v.boolean()),
  }),
  handler: async (ctx, {message, reply, author, isInitialQuestion}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Authentication is required to send an inquiry.');
    }

    await ctx.db.insert('chats', {
      author,
      message,
      reply,
      isInitialQuestion: isInitialQuestion || false,
    });
  },
});

export const findChatMessage = internalMutation({
  args: v.object({
    message: v.string(),
    isInitialQuestion: v.optional(v.boolean()),
  }),
  handler: async (ctx, {message, isInitialQuestion}) => {
    // Use the index directly for better performance
    if (isInitialQuestion !== undefined) {
      return await ctx.db
        .query("chats")
        .withIndex("by_message_and_initial", (q) => 
          q.eq("message", message).eq("isInitialQuestion", isInitialQuestion)
        )
        .first();
    }
    
    // Fallback if isInitialQuestion is not provided
    return await ctx.db
      .query("chats")
      .withIndex("by_message_and_initial", (q) => 
        q.eq("message", message)
      )
      .first();
  },
});
