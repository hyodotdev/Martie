import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const chatsTable = defineTable({
  message: v.string(),
  reply: v.string(),
  author: v.id('users'),
  isInitialQuestion: v.optional(v.boolean()),
})
  // Add an index for the findChatMessage query that filters by both fields
  .index('by_message_and_initial', ['message', 'isInitialQuestion']);
