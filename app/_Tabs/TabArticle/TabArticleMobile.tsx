import React, {useMemo, useState, useCallback} from 'react';
import {ActivityIndicator, Pressable, ScrollView, View} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {Typography, useCPK} from 'cpk-ui';
import {useRouter} from 'expo-router';
import {css} from 'kstyled';
import {Image} from 'expo-image';
import {
  PaginatedQueryReference,
  usePaginatedQuery,
  useQuery,
} from 'convex/react';

import {api} from '../../../convex/_generated/api';
import {t} from '../../../src/STRINGS';
import {useLocale} from '../../../src/hooks/useLocale';
import {createArticleAccessibilityLabel} from '../../../src/uis/Discover/accessibility';
import ArticleListSkeleton from '../../../src/uis/Discover/ArticleListSkeleton';
import {categoriesMap} from '../../../src/utils/categoriesMap';

type ArticleLanguage = 'ko' | 'en' | 'ja';

type ArticleListItem = {
  _id: string;
  key: string;
  categoryName: string;
  thumbnailUrl: string;
  storageThumbnailUrl?: string | null;
  publishedAt: string;
};

const LIST_SIZE = 20;

export default function TabArticleMobile(): JSX.Element {
  const {theme} = useCPK();
  const {navigate} = useRouter();
  const {locale} = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const articleLang: ArticleLanguage = useMemo(() => {
    if (locale === 'ko') return 'ko';
    if (locale === 'ja') return 'ja';
    return 'en';
  }, [locale]);

  const {
    results: articles,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.article.queries.listPaginated as unknown as PaginatedQueryReference,
    {
      categoryName: selectedCategory ?? undefined,
    },
    {
      initialNumItems: LIST_SIZE,
    },
  );

  const articleKeys = useMemo(() => {
    return (articles as ArticleListItem[]).flatMap((a) => [
      `${a.key}_title`,
      `${a.key}_summary`,
    ]);
  }, [articles]);

  const langData = useQuery(
    api.articleLanguage.queries.getByKeysAndLanguage,
    articleKeys.length > 0
      ? {keys: articleKeys, language: articleLang}
      : 'skip',
  );

  const langMap = useMemo(() => {
    if (!langData) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const item of langData) {
      map.set(item.key, item.value);
    }
    return map;
  }, [langData]);

  const getCategoryLabel = useCallback((categoryName: string): string => {
    const category = categoriesMap.find((c) => c.name === categoryName);
    return category?.localizedString || categoryName;
  }, []);

  const handleLoadMore = useCallback(() => {
    if (status === 'CanLoadMore') {
      loadMore(LIST_SIZE);
    }
  }, [loadMore, status]);

  const renderHeader = useCallback(
    () => (
      <View
        style={css`
          background-color: ${theme.bg.basic};
          padding-bottom: 8px;
        `}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={css`
            padding: 8px 16px;
            gap: 8px;
          `}
        >
          <Pressable
            accessibilityLabel={t('common.all')}
            accessibilityRole="button"
            accessibilityState={{selected: !selectedCategory}}
            onPress={() => setSelectedCategory(null)}
          >
            <View
              style={css`
                padding: 6px 14px;
                border-radius: 20px;
                background-color: ${!selectedCategory
                  ? theme.role.primary
                  : theme.bg.paper};
              `}
            >
              <Typography.Body3
                style={css`
                  color: ${!selectedCategory ? '#fff' : theme.text.label};
                  font-size: 13px;
                  font-weight: 700;
                `}
              >
                {t('common.all')}
              </Typography.Body3>
            </View>
          </Pressable>
          {categoriesMap.map((category) => (
            <Pressable
              accessibilityLabel={category.localizedString}
              accessibilityRole="button"
              accessibilityState={{
                selected: selectedCategory === category.name,
              }}
              key={category.name}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === category.name ? null : category.name,
                )
              }
            >
              <View
                style={css`
                  padding: 6px 14px;
                  border-radius: 20px;
                  background-color: ${selectedCategory === category.name
                    ? theme.role.primary
                    : theme.bg.paper};
                `}
              >
                <Typography.Body3
                  style={css`
                    color: ${selectedCategory === category.name
                      ? '#fff'
                      : theme.text.label};
                    font-size: 13px;
                    font-weight: 700;
                  `}
                >
                  {category.localizedString}
                </Typography.Body3>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    ),
    [
      selectedCategory,
      theme.bg.basic,
      theme.bg.paper,
      theme.role.primary,
      theme.text.label,
    ],
  );

  const renderItem = useCallback(
    ({item}: {item: ArticleListItem}) => {
      const title = langMap.get(`${item.key}_title`) || '';
      const summary = langMap.get(`${item.key}_summary`) || '';
      const categoryLabel = getCategoryLabel(item.categoryName);
      const articleAccessibilityLabel = createArticleAccessibilityLabel({
        categoryLabel,
        publishedAt: item.publishedAt,
        summary,
        title,
      });

      return (
        <Pressable
          accessibilityLabel={articleAccessibilityLabel}
          accessibilityRole="button"
          onPress={() =>
            navigate({
              pathname: '/article-detail',
              params: {key: item.key},
            })
          }
        >
          <View
            style={css`
              margin: 8px 16px;
              border-radius: 16px;
              background-color: ${theme.bg.paper};
              overflow: hidden;
            `}
          >
            <Image
              source={{uri: item.storageThumbnailUrl || item.thumbnailUrl}}
              style={css`
                width: 100%;
                height: 180px;
              `}
              contentFit="cover"
            />
            <View
              style={css`
                padding: 14px 16px;
                gap: 6px;
              `}
            >
              <View
                style={css`
                  flex-direction: row;
                  align-items: center;
                  gap: 8px;
                `}
              >
                <View
                  style={css`
                    background-color: ${theme.role.primary};
                    padding: 2px 8px;
                    border-radius: 8px;
                  `}
                >
                  <Typography.Body4
                    style={css`
                      color: #fff;
                      font-size: 11px;
                    `}
                  >
                    {categoryLabel}
                  </Typography.Body4>
                </View>
              </View>
              <Typography.Heading5
                style={css`
                  color: ${theme.text.basic};
                `}
                numberOfLines={2}
              >
                {title}
              </Typography.Heading5>
              <Typography.Body3
                style={css`
                  color: ${theme.text.label};
                `}
                numberOfLines={2}
              >
                {summary}
              </Typography.Body3>
              <Typography.Body4
                style={css`
                  color: ${theme.text.placeholder};
                  margin-top: 4px;
                `}
              >
                {item.publishedAt}
              </Typography.Body4>
            </View>
          </View>
        </Pressable>
      );
    },
    [
      getCategoryLabel,
      langMap,
      navigate,
      theme.bg.paper,
      theme.role.primary,
      theme.text.basic,
      theme.text.label,
      theme.text.placeholder,
    ],
  );

  const renderEmpty = useCallback(() => {
    if (status === 'LoadingFirstPage' || isLoading) return null;

    return (
      <View
        style={css`
          align-items: center;
          justify-content: center;
          padding: 40px;
        `}
      >
        <Typography.Body2
          style={css`
            color: ${theme.text.placeholder};
          `}
        >
          {t('article.empty')}
        </Typography.Body2>
      </View>
    );
  }, [isLoading, status, theme.text.placeholder]);

  const renderFooter = useCallback(() => {
    if (isLoading && status === 'LoadingMore') {
      return (
        <View
          style={css`
            padding: 20px;
            align-items: center;
          `}
        >
          <ActivityIndicator size="small" color={theme.role.primary} />
        </View>
      );
    }

    return (
      <View
        style={css`
          height: 20px;
        `}
      />
    );
  }, [isLoading, status, theme.role.primary]);

  const keyExtractor = useCallback((item: ArticleListItem) => item._id, []);

  if (status === 'LoadingFirstPage' && articles.length === 0) {
    return <ArticleListSkeleton />;
  }

  return (
    <FlashList
      data={articles as ArticleListItem[]}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={css`
        padding-bottom: 20px;
      `}
    />
  );
}
