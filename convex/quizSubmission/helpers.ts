import type {MutationCtx, QueryCtx} from '../_generated/server';
import type {Id} from '../_generated/dataModel';
import {getAuthUserId} from '@convex-dev/auth/server';
import {isAdminEmail} from '../utils/emailList';

/**
 * 관리자 인증 — 인증된 유저의 이메일이 ADMIN_EMAILS Convex env에 포함되어야 함
 */
export async function assertAdmin(
  ctx: MutationCtx | QueryCtx,
): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');

  const user = await ctx.db.get(userId);

  if (!isAdminEmail(user?.email)) {
    throw new Error('Admin access required');
  }

  return userId;
}
