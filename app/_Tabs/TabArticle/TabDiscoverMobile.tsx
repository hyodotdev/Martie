/**
 * @name TabDiscoverMobile
 *
 * 발견 탭 — 레이더 차트 + 오답 복습 + 추천 블로그
 */
import React, {useMemo} from 'react';
import {Typography, useCPK} from 'cpk-ui';
import {useRouter} from 'expo-router';
import {styled, css} from 'kstyled';
import {View, Pressable, ScrollView} from 'react-native';
import {Image} from 'expo-image';
import {useQuery} from 'convex/react';
import {api} from '../../../convex/_generated/api';
import {t} from '../../../src/STRINGS';
import {useLocale} from '../../../src/hooks/useLocale';
import RadarChart from '../../../src/uis/Discover/RadarChart';
import ReviewCard from '../../../src/uis/Discover/ReviewCard';
import DiscoverSkeleton from '../../../src/uis/Discover/DiscoverSkeleton';
import {createArticleAccessibilityLabel} from '../../../src/uis/Discover/accessibility';
import {categoriesMap} from '../../../src/utils/categoriesMap';

type ArticleLanguage = 'ko' | 'en' | 'ja';

export default function TabDiscoverMobile(): JSX.Element {
  const {theme} = useCPK();
  const {navigate} = useRouter();
  const {locale} = useLocale();

  // 카테고리별 통계
  const categoryStats = useQuery(
    api.quizResult.query.getResultsStatsByCategory,
  );

  // 오답 복습 대기 수
  const pendingReviewCount = useQuery(api.reviewQueue.queries.getPendingCount);

  // 블로그 목록
  const articles = useQuery(api.article.queries.list, {limit: 50});

  // 블로그 언어 데이터
  const articleLangKeys = useMemo(() => {
    if (!articles) return [];
    return articles.flatMap((a) => [`${a.key}_title`, `${a.key}_summary`]);
  }, [articles]);

  const articleLangData = useQuery(
    api.articleLanguage.queries.getByKeysAndLanguage,
    articleLangKeys.length > 0
      ? {
          keys: articleLangKeys,
          language: (['ko', 'ja'].includes(locale) ? locale : 'en') as ArticleLanguage,
        }
      : 'skip',
  );

  const langMap = useMemo(() => {
    if (!articleLangData) return new Map<string, string>();
    return new Map(articleLangData.map((d) => [d.key, d.value]));
  }, [articleLangData]);

  // 레이더 차트 데이터
  const radarData = useMemo(() => {
    if (!categoryStats || categoryStats.length === 0) return [];
    return categoryStats.map((stat: any) => ({
      categoryName: stat.categoryName,
      localizedName:
        categoriesMap.find((c) => c.name === stat.categoryName)
          ?.localizedString || stat.categoryName,
      winRate: stat.winRate,
    }));
  }, [categoryStats]);

  // 강점/약점 (상위 3개/하위 3개)
  const {strengths, weaknesses} = useMemo(() => {
    if (radarData.length === 0) return {strengths: [], weaknesses: []};
    const sorted = [...radarData].sort((a, b) => b.winRate - a.winRate);
    return {
      strengths: sorted.slice(0, 3),
      weaknesses: sorted.slice(-3).reverse(),
    };
  }, [radarData]);

  // 약한 카테고리 블로그 우선 정렬
  const sortedArticles = useMemo(() => {
    if (!articles) return [];
    if (weaknesses.length === 0) return articles;

    const weakNames = new Set(weaknesses.map((w) => w.categoryName));
    return [...articles].sort((a, b) => {
      const aWeak = weakNames.has(a.categoryName) ? 0 : 1;
      const bWeak = weakNames.has(b.categoryName) ? 0 : 1;
      return aWeak - bWeak;
    });
  }, [articles, weaknesses]);

  const handleReviewPress = () => {
    navigate('/review-quiz' as any);
  };

  const handleArticlePress = (key: string) => {
    navigate({pathname: '/article-detail', params: {key}} as any);
  };

  const hasStats = radarData.length > 0;

  const isLoading =
    categoryStats === undefined ||
    pendingReviewCount === undefined ||
    articles === undefined;

  if (isLoading) {
    return <DiscoverSkeleton />;
  }

  return (
    <ScrollView
      style={css`
        flex: 1;
      `}
      contentContainerStyle={css`
        padding: 16px 0 40px;
        gap: 16px;
      `}
    >
      {/* 레이더 차트 */}
      <RadarSection>
        <Typography.Heading5
          style={css`
            font-weight: 800;
            padding: 0 4px;
          `}
        >
          📊 {t('discover.myRadar')}
        </Typography.Heading5>

        {hasStats ? (
          <>
            <RadarChart stats={radarData} />
            <View
              style={css`
                flex-direction: row;
                gap: 16px;
                justify-content: center;
              `}
            >
              <View style={css`flex: 1; gap: 4px; align-items: center;`}>
                <Typography.Body3
                  style={css`
                    font-weight: 700;
                    color: #22c55e;
                  `}
                >
                  💪 {t('discover.strength')}
                </Typography.Body3>
                {strengths.map((s) => (
                  <Typography.Body3
                    key={s.categoryName}
                    numberOfLines={1}
                    style={css`text-align: center;`}
                  >
                    {s.localizedName} ({Math.round(s.winRate)}%)
                  </Typography.Body3>
                ))}
              </View>
              <View style={css`flex: 1; gap: 4px; align-items: center;`}>
                <Typography.Body3
                  style={css`
                    font-weight: 700;
                    color: #ef4444;
                  `}
                >
                  📚 {t('discover.weakness')}
                </Typography.Body3>
                {weaknesses.map((w) => (
                  <Typography.Body3
                    key={w.categoryName}
                    numberOfLines={1}
                    style={css`text-align: center;`}
                  >
                    {w.localizedName} ({Math.round(w.winRate)}%)
                  </Typography.Body3>
                ))}
              </View>
            </View>
          </>
        ) : (
          <Typography.Body3
            style={css`
              text-align: center;
              padding: 24px;
              opacity: 0.5;
            `}
          >
            {t('discover.noStats')}
          </Typography.Body3>
        )}
      </RadarSection>

      {/* 오답 복습 카드 */}
      <ReviewCard
        pendingCount={pendingReviewCount ?? 0}
        onPress={handleReviewPress}
      />

      {/* 추천 블로그 */}
      {sortedArticles.length > 0 && (
        <View
          style={css`
            gap: 12px;
            padding: 0 16px;
          `}
        >
          <View
            style={css`
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            `}
          >
            <Typography.Heading5
              style={css`
                font-weight: 800;
              `}
            >
              📖 {t('discover.recommendedReads')}
            </Typography.Heading5>
            <Pressable
              accessibilityLabel={t('discover.recommendedReadsSeeMore')}
              accessibilityRole="button"
              onPress={() => navigate('/article-list' as any)}
            >
              <Typography.Body3
                style={css`
                  color: ${theme.role.primary};
                  font-weight: 600;
                `}
              >
                {t('discover.seeMore')}
              </Typography.Body3>
            </Pressable>
          </View>

          {sortedArticles.slice(0, 5).map((article) => {
            const localizedTitle = langMap.get(`${article.key}_title`) || '';
            const title = localizedTitle || article.key;
            const summary = langMap.get(`${article.key}_summary`) || '';
            const thumbnailUrl =
              (article as any).storageThumbnailUrl || article.thumbnailUrl;
            const categoryLabel =
              categoriesMap.find((c) => c.name === article.categoryName)
                ?.localizedString || article.categoryName;
            const articleAccessibilityLabel = createArticleAccessibilityLabel({
              categoryLabel,
              summary,
              title: localizedTitle,
            });

            return (
              <Pressable
                accessibilityLabel={articleAccessibilityLabel}
                accessibilityRole="button"
                key={article.key}
                onPress={() => handleArticlePress(article.key)}
              >
                <ArticleCard>
                  {thumbnailUrl && (
                    <Image
                      source={{uri: thumbnailUrl}}
                      style={css`
                        width: 72px;
                        height: 72px;
                        border-radius: 10px;
                      `}
                      contentFit="cover"
                    />
                  )}
                  <View
                    style={css`
                      flex: 1;
                      gap: 4px;
                    `}
                  >
                    <CategoryChip>
                      <Typography.Body4
                        style={css`
                          font-size: 10px;
                          color: ${theme.role.primary};
                          font-weight: 700;
                        `}
                      >
                        {categoryLabel}
                      </Typography.Body4>
                    </CategoryChip>
                    <Typography.Body2
                      style={css`
                        font-weight: 700;
                      `}
                      numberOfLines={2}
                    >
                      {title}
                    </Typography.Body2>
                    {summary ? (
                      <Typography.Body3
                        style={css`
                          opacity: 0.6;
                        `}
                        numberOfLines={1}
                      >
                        {summary}
                      </Typography.Body3>
                    ) : null}
                  </View>
                </ArticleCard>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const RadarSection = styled.View`
  padding: 16px;
  margin: 0 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  gap: 12px;
`;

const ArticleCard = styled.View`
  flex-direction: row;
  gap: 12px;
  padding: 12px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 12px;
`;

const CategoryChip = styled.View`
  align-self: flex-start;
  padding: 2px 8px;
  background-color: rgba(255, 100, 100, 0.08);
  border-radius: 8px;
`;
