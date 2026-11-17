import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const imagesTable = defineTable({
  author: v.id('users'),
  body: v.id('_storage'),
  format: v.string(),
});
