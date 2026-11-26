import {getAuthUserId} from '../utils/auth';
import {query} from '../_generated/server';

const GROUP_SIZE = 30;

const BOT_NAMES = [
  'QuizMaster_Kim', 'BrainPower_J', 'SmartOwl_99', 'TriviaKing',
  'CuriousCat_7', 'WiseFox_21', 'QuizNinja', 'BrainStorm_X',
  'ThinkFast_88', 'KnowItAll_3', 'MindBlown_42', 'QuizWhiz_5',
  'BrightStar_11', 'CleverBee_22', 'SharpMind_33', 'QuizHero_44',
  'SmartCookie', 'BrainWave_55', 'GeniusMode', 'QuizBolt_66',
  'FastThinker', 'WiseSage_77', 'TopBrain_88', 'QuizAce_99',
  'MindReader', 'BrainBox_12', 'QuizPro_34', 'SmartAlec_56',
  'ThinkBig_78', 'QuizStar_90',
];

/**
 * 봇 XP — 시드 기반 결정론적 랜덤, 자연스러운 분포
 */
function generateBotXp(groupId: string, botIndex: number): number {
  let hash = 0;
  const seed = `${groupId}_bot_${botIndex}_xp`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  // 0~200 범위에서 자연스러운 분포 (대부분 0~80, 가끔 100+)
  const raw = Math.abs(hash) % 1000;
  if (raw < 300) return Math.abs(hash >> 3) % 20; // 30%: 0~19 XP (비활성 유저)
  if (raw < 700) return 20 + (Math.abs(hash >> 5) % 60); // 40%: 20~79 XP (보통)
  if (raw < 900) return 80 + (Math.abs(hash >> 7) % 50); // 20%: 80~129 XP (열심히)
  return 130 + (Math.abs(hash >> 9) % 70); // 10%: 130~199 XP (헤비유저)
}

/**
 * 내 리그 정보 + 같은 그룹 랭킹 (봇 포함)
 */
export const getMyLeague = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const myLeague = await ctx.db
      .query('leagues')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (!myLeague) return null;

    // 같은 그룹의 실제 멤버 가져오기
    const groupMembers = await ctx.db
      .query('leagues')
      .withIndex('by_group_and_xp', (q) => q.eq('groupId', myLeague.groupId))
      .collect();

    // 실제 멤버 프로필
    const realMembers = await Promise.all(
      groupMembers.map(async (member) => {
        const profile = await ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', member.userId))
          .first();

        return {
          odI: member.userId as string,
          displayName: profile?.displayName ?? 'Unknown',
          weeklyXp: member.weeklyXp,
          tier: member.tier,
          rank: 0,
          isMe: member.userId === userId,
          isBot: false,
        };
      }),
    );

    // 봇으로 GROUP_SIZE까지 채우기
    const botCount = Math.max(0, GROUP_SIZE - realMembers.length);
    const bots = Array.from({length: botCount}, (_, i) => ({
      odI: `bot_${i}`,
      displayName: BOT_NAMES[i % BOT_NAMES.length],
      weeklyXp: generateBotXp(myLeague.groupId, i),
      tier: myLeague.tier,
      rank: 0,
      isMe: false,
      isBot: true,
    }));

    // XP 내림차순 정렬 + 순위 부여
    const allMembers = [...realMembers, ...bots].sort(
      (a, b) => b.weeklyXp - a.weeklyXp,
    );
    allMembers.forEach((m, i) => {
      m.rank = i + 1;
    });

    const myRank = allMembers.findIndex((m) => m.isMe) + 1;
    const totalMembers = allMembers.length;

    return {
      tier: myLeague.tier,
      weeklyXp: myLeague.weeklyXp,
      weekStart: myLeague.weekStart,
      myRank,
      totalMembers,
      promoteThreshold: 5,
      demoteThreshold: totalMembers - 5,
      members: allMembers,
    };
  },
});
