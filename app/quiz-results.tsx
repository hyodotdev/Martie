/**
 * @name ReviewKnowledge
 */
import {styled, css} from 'kstyled';
import {FlashList} from '@shopify/flash-list';
import {Typography} from 'cpk-ui';
import {Stack} from 'expo-router';
import {useMemo, useCallback} from 'react';
import {View, ActivityIndicator} from 'react-native';
import {api} from '@/convex/_generated/api';
import {PaginatedQueryReference, usePaginatedQuery} from 'convex/react';
import {getLocale, t} from '@/src/STRINGS';
import QuizResultItem from '../src/uis/QuizResultItem';

const LIST_SIZE = 20;

export default function QuizResults(): JSX.Element {
  const language = getLocale();

  const {
    results: quizResults,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.quizResult.query
      .getPaginatedResults as unknown as PaginatedQueryReference,
    {
      isCorrect: undefined,
      language,
    },
    {
      initialNumItems: LIST_SIZE,
    },
  );

  // ListHeader component memoization
  const ListHeader = useMemo(
    () => (
      <Typography.Heading1
        style={css`
          margin-bottom: 22px;
        `}
      >
        {t('quizResult.title')}
      </Typography.Heading1>
    ),
    [],
  );

  const handleLoadMore = useCallback(() => {
    if (status === 'CanLoadMore') {
      loadMore(LIST_SIZE);
    }
  }, [status, loadMore]);

  const ListFooter = () => {
    if (isLoading && status === 'LoadingMore') {
      return (
        <View
          style={css`
            padding: 20px;
            align-items: center;
          `}
        >
          <ActivityIndicator size="small" />
        </View>
      );
    }
    return (
      <View
        style={css`
          height: 96px;
        `}
      />
    );
  };

  return (
    <Container>
      <Stack.Screen options={{title: ''}} />
      <FlashList
        data={quizResults || []}
        renderItem={({item}) => (
          <QuizResultItem
            item={item}
            style={css`
              margin-bottom: 16px;
            `}
          />
        )}
        contentContainerStyle={css`
          padding: 24px;
        `}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={false}
      />
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;
