import {useCallback} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {Stack} from 'expo-router';
import {Typography, useCPK} from 'cpk-ui';
import {css} from 'kstyled';
import {
  PaginatedQueryReference,
  usePaginatedQuery,
} from 'convex/react';

import {api} from '../convex/_generated/api';
import type {Doc} from '../convex/_generated/dataModel';
import {t} from '../src/STRINGS';

const PAGE_SIZE = 30;

type RankItem = Doc<'ranks'> & {
  user: Doc<'userProfiles'> | null;
};

export default function HallOfFame(): JSX.Element {
  const {theme} = useCPK();
  const {results, status, loadMore} = usePaginatedQuery(
    api.rank.queries
      .getPaginatedRanks as unknown as PaginatedQueryReference,
    {},
    {initialNumItems: PAGE_SIZE},
  );

  const handleLoadMore = useCallback(() => {
    if (status === 'CanLoadMore') loadMore(PAGE_SIZE);
  }, [loadMore, status]);

  const renderItem = useCallback(
    ({item, index}: {item: RankItem; index: number}) => (
      <View
        accessible
        accessibilityLabel={[
          `${index + 1}${t('common.rank')}`,
          item.user?.displayName,
          `${item.correctCount}`,
        ]
          .filter(Boolean)
          .join(', ')}
        style={css`
          flex-direction: row;
          align-items: center;
          padding: 16px 20px;
          gap: 16px;
          border-bottom-width: 1px;
          border-bottom-color: ${theme.role.border};
          background-color: ${theme.bg.basic};
        `}
      >
        <Typography.Heading3
          style={css`
            width: 44px;
            text-align: center;
            color: ${index < 3 ? theme.role.primary : theme.text.label};
          `}
        >
          {index + 1}
        </Typography.Heading3>
        <Typography.Body1
          numberOfLines={1}
          style={css`
            flex: 1;
            font-weight: bold;
          `}
        >
          {item.user?.displayName ?? '-'}
        </Typography.Body1>
        <Typography.Body2
          style={css`
            color: ${theme.text.label};
          `}
        >
          {item.correctCount}
        </Typography.Body2>
      </View>
    ),
    [theme],
  );

  if (status === 'LoadingFirstPage' && results.length === 0) {
    return (
      <View
        style={css`
          flex: 1;
          align-items: center;
          justify-content: center;
          background-color: ${theme.bg.basic};
        `}
      >
        <Stack.Screen options={{title: t('my.hallOfFame')}} />
        <ActivityIndicator color={theme.role.primary} />
      </View>
    );
  }

  return (
    <View
      style={css`
        flex: 1;
        background-color: ${theme.bg.basic};
      `}
    >
      <Stack.Screen options={{title: t('my.hallOfFame')}} />
      <FlashList
        data={results as RankItem[]}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View
            style={css`
              padding: 20px;
              background-color: ${theme.bg.paper};
            `}
          >
            <Typography.Heading2>{t('my.hallOfFame')}</Typography.Heading2>
            <Typography.Body2
              style={css`
                margin-top: 6px;
                color: ${theme.text.label};
              `}
            >
              {t('my.hallOfFameDescription')}
            </Typography.Body2>
          </View>
        }
        ListFooterComponent={
          status === 'LoadingMore' ? (
            <ActivityIndicator
              color={theme.role.primary}
              style={css`
                padding: 20px;
              `}
            />
          ) : null
        }
      />
    </View>
  );
}
