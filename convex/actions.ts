import {mutation} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';

export const sendInquiry = mutation({
  args: v.object({
    message: v.string(),
  }),
  handler: async (ctx, {message}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Authentication is required to send an inquiry.');
    }

    if (!message.trim() || message.length > 2000) {
      throw new Error('Inquiry message must be 1-2000 characters.');
    }

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('_id'), userId))
      .first();

    if (!user?.email) {
      throw new Error('Failed to retrieve user email.');
    }

    await ctx.scheduler.runAfter(0, internal.internals.sendEmailAction, {
      fromEmail: user.email,
      subject: '[Martie] 편지쓰기',
      message,
    });

    return {success: true};
  },
});
