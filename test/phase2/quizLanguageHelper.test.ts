import {getQuizLanguageMap} from '../../convex/quizLanguage/helpers';

function createMockCtx(
  rows: Record<string, {key: string; language: 'en' | 'ko' | 'ja'; value: string}>,
) {
  const requested: {key?: string; language?: string}[] = [];

  const ctx = {
    db: {
      query: jest.fn(() => ({
        withIndex: jest.fn((_indexName, buildQuery) => {
          const queryState: {key?: string; language?: string} = {};
          const queryBuilder = {
            eq: jest.fn((field: 'key' | 'language', value: string) => {
              queryState[field] = value;
              return queryBuilder;
            }),
          };

          buildQuery(queryBuilder);

          return {
            first: jest.fn(async () => {
              requested.push(queryState);
              return rows[`${queryState.key}:${queryState.language}`] ?? null;
            }),
          };
        }),
      })),
    },
  };

  return {ctx, requested};
}

describe('getQuizLanguageMap', () => {
  it('queries only the requested keys with the exact language index', async () => {
    const {ctx, requested} = createMockCtx({
      'quiz_key:ko': {key: 'quiz_key', language: 'ko', value: '문제'},
      'answer_key:ko': {key: 'answer_key', language: 'ko', value: '정답'},
    });

    const langMap = await getQuizLanguageMap(
      ctx as any,
      ['quiz_key', 'answer_key', 'quiz_key', ''],
      'ko',
    );

    expect(langMap).toEqual(
      new Map([
        ['quiz_key', '문제'],
        ['answer_key', '정답'],
      ]),
    );
    expect(requested).toEqual([
      {key: 'quiz_key', language: 'ko'},
      {key: 'answer_key', language: 'ko'},
    ]);
    expect(ctx.db.query).toHaveBeenCalledTimes(2);
  });
});
