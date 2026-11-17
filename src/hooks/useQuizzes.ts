import {
  PaginatedQueryReference,
  usePaginatedQuery,
  useQuery,
} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {useCallback, useMemo} from 'react';
import {getLocale} from '../STRINGS';
import {logError} from '../utils/error';
import {QUIZ_LIMIT} from '../utils/constants';
import useQuizStore from '../stores/quizStore';

// Type for supported languages
type SupportedLanguage = 'en' | 'ko' | 'ja';

export const useQuizzes = (initialNumItems: number = QUIZ_LIMIT) => {
  // Get language preference and ensure it's a supported language
  const rawLocale = getLocale();
  const language = (
    ['en', 'ko', 'ja'].includes(rawLocale) ? rawLocale : 'en'
  ) as SupportedLanguage;

  const currentUser = useQuery(api.user.queries.currentUser);
  const {lastQuizKeyCursor: localStoreCursor} = useQuizStore();

  // Get cursor from user if logged in, otherwise from store
  const cursor = currentUser
    ? currentUser?.lastQuizCursor
    : localStoreCursor || undefined;

  const {
    results: quizItems,
    status,
    loadMore,
    isLoading: isPaginationLoading,
  } = usePaginatedQuery(
    api.quiz.queries.getQuizzesPaginated as PaginatedQueryReference,
    {
      language,
      lastKey: cursor,
      paginationOpts: {
        initialNumItems: Math.min(initialNumItems, QUIZ_LIMIT),
      },
    },
    {
      initialNumItems: Math.min(initialNumItems, QUIZ_LIMIT),
    },
  );

  // Get last quiz result for completion check
  const lastQuizResult = useQuery(api.quizResult.query.getLastUserQuizResult);

  // Memoize quizzes to prevent unnecessary re-renders
  const quizzes = useMemo(() => quizItems || [], [quizItems]);

  // Load more quizzes with optimized batch size
  const loadNextPage = useCallback(
    (additionalItems: number = QUIZ_LIMIT) => {
      try {
        if (status === 'CanLoadMore') {
          // Ensure we don't exceed the limit per request
          const itemsToLoad = Math.min(additionalItems, QUIZ_LIMIT);
          console.log('Loading more quizzes:', itemsToLoad);
          loadMore(itemsToLoad);
        } else if (status === 'Exhausted') {
          console.log('No more quizzes to load');
        } else {
          console.log('Cannot load more quizzes right now, status:', status);
        }
      } catch (error) {
        logError(error, 'useQuizzes.loadNextPage');
      }
    },
    [status, loadMore],
  );

  // Check if the user has completed the first quiz
  const hasCompletedQuizzes =
    quizzes.length > 0 && lastQuizResult?.quizId === quizzes[0]._id;

  return {
    quizzes,
    isLoading: isPaginationLoading,
    loadNextPage,
    lastQuiz: quizzes[quizzes.length - 1],
    hasNextPage: status === 'CanLoadMore',
    hasCompletedQuizzes: !!hasCompletedQuizzes,
    paginationStatus: {
      status,
      isLoading: status === 'LoadingMore' || status === 'LoadingFirstPage',
      isPaginationDone: status === 'Exhausted',
    },
    currentCursor: cursor,
  };
};
