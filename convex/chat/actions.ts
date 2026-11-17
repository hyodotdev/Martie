import {v} from 'convex/values';
import {action} from '../_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';
import {internal} from '../_generated/api';
import {Doc} from '../_generated/dataModel';

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;

export const askMartie = action({
  args: v.object({
    message: v.string(),
    isInitialQuestion: v.optional(v.boolean()),
    previousMessages: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal('user'), v.literal('assistant')),
          content: v.string(),
        }),
      ),
    ),
  }),
  handler: async (ctx, {message, isInitialQuestion, previousMessages = []}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Authentication is required to send an inquiry.');
    }

    if (
      message.length > MAX_MESSAGE_LENGTH ||
      previousMessages.length > MAX_HISTORY_MESSAGES ||
      previousMessages.some(
        (m) => m.content.length > MAX_HISTORY_MESSAGE_LENGTH,
      )
    ) {
      throw new Error('Message is too long.');
    }

    // Check if the same message exists in the database directly with a mutation
    // since we can't use queries in actions
    const existingChat = (await ctx.runMutation(
      internal.chat.mutations.findChatMessage,
      {
        message,
        isInitialQuestion,
      },
    )) as Doc<'chats'> | null;

    if (existingChat && existingChat.reply && previousMessages.length === 0) {
      // Only use cached response if there's no conversation context
      if (existingChat.author !== userId) {
        await ctx.runMutation(internal.chat.mutations.insertChatMessage, {
          message: existingChat.message,
          reply: existingChat.reply,
          author: userId,
          isInitialQuestion,
        });
      }
      return {question: message, answer: existingChat.reply};
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not set in environment variables.');
    }

    const systemPrompt =
      "You are 'Martie', a cute crow character—'마티' in Korean, 'マティ' in Japanese! Answer users' quiz questions briefly and charmingly in a bright, warm tone, full of Martie's unique charm—no greetings, just the answers!";

    try {
      // Prepare the messages array for the API call
      const messages = [
        {role: 'system', content: systemPrompt},
        // Include previous conversation history
        ...previousMessages,
        // Add the current user message
        {role: 'user', content: message},
      ];

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
          }),
        },
      );

      if (!response.ok) {
        // Handle rate limiting explicitly
        if (response.status === 429) {
          throw new Error(
            'OpenAI API rate limit exceeded. Please try again later.',
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content;

      if (!assistantMessage) {
        throw new Error('Failed to retrieve a valid response from OpenAI.');
      }

      const reply = assistantMessage;

      // Replies are cached by message text and served to other users, so only
      // cache answers that did not depend on client-supplied history.
      if (previousMessages.length === 0) {
        await ctx.runMutation(internal.chat.mutations.insertChatMessage, {
          message,
          reply,
          author: userId,
          isInitialQuestion,
        });
      }

      return {question: message, answer: assistantMessage};
    } catch (error) {
      // Add more detailed error handling
      console.error('OpenAI API Error:', error);

      // Rethrow with more context for debugging
      throw new Error(
        `Failed to process message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
