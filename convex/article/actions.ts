import {internalAction} from '../_generated/server';
import {api, internal} from '../_generated/api';

export const uploadThumbnails = internalAction({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.runQuery(api.article.queries.list, {limit: 100});
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const article of articles) {
      if (article.thumbnailStorageId) {
        skipped++;
        continue;
      }

      try {
        const response = await fetch(article.thumbnailUrl);
        if (!response.ok) {
          console.log(
            `❌ Failed to fetch: ${article.key} (${response.status})`,
          );
          failed++;
          continue;
        }

        const blob = await response.blob();
        const storageId = await ctx.storage.store(blob);

        await ctx.runMutation(
          internal.article.mutations.updateThumbnailStorageId,
          {
            key: article.key,
            storageId,
          },
        );

        uploaded++;
        console.log(`✅ Uploaded: ${article.key}`);
      } catch (error) {
        console.log(`❌ Error: ${article.key}`, error);
        failed++;
      }
    }

    console.log(
      `\n📊 결과: ${uploaded}개 업로드, ${skipped}개 스킵, ${failed}개 실패`,
    );
  },
});
