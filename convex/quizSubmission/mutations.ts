import {v} from 'convex/values';
import {mutation} from '../_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';
import {assertAdmin} from './helpers';

/**
 * 퀴즈 제출 (유저가 직접 출제)
 */
export const submitQuiz = mutation({
  args: {
    categoryId: v.id('categories'),
    language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
    question: v.string(),
    options: v.array(
      v.object({
        text: v.string(),
        isAnswer: v.boolean(),
      }),
    ),
    answerExplanation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // Validation
    if (args.options.length !== 4) {
      throw new Error('Exactly 4 options required');
    }

    const answerCount = args.options.filter((o) => o.isAnswer).length;
    if (answerCount !== 1) {
      throw new Error('Exactly 1 correct answer required');
    }

    if (args.question.trim().length < 5) {
      throw new Error('Question must be at least 5 characters');
    }

    for (const opt of args.options) {
      if (opt.text.trim().length === 0) {
        throw new Error('All options must have text');
      }
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error('Category not found');

    return await ctx.db.insert('quizSubmissions', {
      userId,
      categoryId: args.categoryId,
      language: args.language,
      question: args.question.trim(),
      options: args.options.map((o) => ({
        text: o.text.trim(),
        isAnswer: o.isAnswer,
      })),
      answerExplanation: args.answerExplanation?.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  },
});

/**
 * 퀴즈 승인 (admin only)
 * submission → quizzes + quizLanguages 테이블에 삽입
 */
export const approveSubmission = mutation({
  args: {
    submissionId: v.id('quizSubmissions'),
  },
  handler: async (ctx, {submissionId}) => {
    const adminUserId = await assertAdmin(ctx);

    const submission = await ctx.db.get(submissionId);
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'pending') {
      throw new Error('Submission is not pending');
    }

    // 퀴즈 키 생성 (날짜 기반 — 시드 퀴즈와 자연스럽게 섞이도록)
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const shortId = submissionId.slice(-6);
    const quizKey = `${today}_ugc_${shortId}_key`;
    const answerKey = `${today}_ugc_${shortId}_answer`;

    // 옵션 키 생성 및 정답 찾기
    const quizPrefix = `${today}_ugc_${shortId}`;
    const optionKeys = submission.options.map(
      (_, i) => `${quizPrefix}_opt${i + 1}`,
    );
    const answerIndex = submission.options.findIndex((o) => o.isAnswer);
    if (answerIndex < 0) {
      throw new Error('Submission has no correct answer marked');
    }

    // quizzes 테이블에 삽입
    const quizId = await ctx.db.insert('quizzes', {
      categoryId: submission.categoryId,
      level: 1,
      key: quizKey,
      answerKey,
      indexes: [],
      options: optionKeys.map((key, i) => ({
        key,
        isAnswer: i === answerIndex ? true : undefined,
      })),
      creatorUserId: submission.userId,
    });

    // quizLanguages 테이블에 삽입 (제출 언어로)
    await ctx.db.insert('quizLanguages', {
      key: quizKey,
      language: submission.language,
      value: submission.question,
      type: 'question',
    });

    // 정답 설명 삽입
    await ctx.db.insert('quizLanguages', {
      key: answerKey,
      language: submission.language,
      value: submission.answerExplanation || '',
      type: 'answer',
    });

    // 옵션 텍스트 삽입
    for (let i = 0; i < submission.options.length; i++) {
      await ctx.db.insert('quizLanguages', {
        key: optionKeys[i],
        language: submission.language,
        value: submission.options[i].text,
        type: 'option',
      });
    }

    // submission 상태 업데이트
    await ctx.db.patch(submissionId, {
      status: 'approved',
      quizId,
      reviewedBy: adminUserId,
      reviewedAt: new Date().toISOString(),
    });

    return quizId;
  },
});

/**
 * 퀴즈 거절 (admin only)
 */
export const rejectSubmission = mutation({
  args: {
    submissionId: v.id('quizSubmissions'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, {submissionId, reason}) => {
    const adminUserId = await assertAdmin(ctx);

    const submission = await ctx.db.get(submissionId);
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'pending') {
      throw new Error('Submission is not pending');
    }

    await ctx.db.patch(submissionId, {
      status: 'rejected',
      rejectionReason: reason,
      reviewedBy: adminUserId,
      reviewedAt: new Date().toISOString(),
    });
  },
});
