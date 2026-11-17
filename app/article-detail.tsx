import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {Stack, useLocalSearchParams} from 'expo-router';
import {styled, css} from 'kstyled';
import {Image} from 'expo-image';
import {useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import {useLocale} from '../src/hooks/useLocale';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';
import {categoriesMap} from '../src/utils/categoriesMap';
import {logEvent, LOG_EVENTS} from '../src/utils/analytics';

type ArticleLanguage = 'ko' | 'en' | 'ja';

export default function ArticleDetail(): JSX.Element {
  const {key} = useLocalSearchParams<{key: string}>();
  const {theme} = useCPK();
  const {locale} = useLocale();

  const articleLang: ArticleLanguage = useMemo(() => {
    if (locale === 'ko') return 'ko';
    if (locale === 'ja') return 'ja';
    return 'en';
  }, [locale]);

  const article = useQuery(api.article.queries.getByKey, key ? {key} : 'skip');
  const openedAtRef = useRef<number>(Date.now());
  const didFireCompleteRef = useRef(false);
  const viewportHeightRef = useRef(0);
  const shortArticleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const MIN_READ_MS = 2000;

  const clearShortArticleTimer = useCallback(() => {
    if (shortArticleTimerRef.current) {
      clearTimeout(shortArticleTimerRef.current);
      shortArticleTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!article || !key) return;
    openedAtRef.current = Date.now();
    didFireCompleteRef.current = false;
    // Reset any pending dwell timer from a previously-viewed article
    clearShortArticleTimer();
    logEvent(LOG_EVENTS.ARTICLE_OPENED, {
      articleKey: key,
      category: article.categoryName,
    });
  }, [article, key, clearShortArticleTimer]);

  useEffect(() => {
    return () => {
      clearShortArticleTimer();
    };
  }, [clearShortArticleTimer]);

  const fireComplete = useCallback(
    (reason: 'scroll' | 'dwell') => {
      if (didFireCompleteRef.current) return;
      didFireCompleteRef.current = true;
      clearShortArticleTimer();
      logEvent(LOG_EVENTS.ARTICLE_READ_COMPLETE, {
        articleKey: key,
        category: article?.categoryName,
        readTimeMs: Date.now() - openedAtRef.current,
        reason,
      });
    },
    [key, article?.categoryName, clearShortArticleTimer],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (didFireCompleteRef.current) return;
      const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
      const scrolledTo = contentOffset.y + layoutMeasurement.height;
      if (scrolledTo < contentSize.height - 40) return;
      if (Date.now() - openedAtRef.current < MIN_READ_MS) return;
      fireComplete('scroll');
    },
    [fireComplete],
  );

  // Short-article case: onScroll never fires when content fits in viewport.
  // Fire once min read time has elapsed. If content later grows past the
  // viewport (e.g., images loading in), cancel the dwell timer — the user
  // will now need to scroll, and firing 'dwell' would be misleading.
  const handleContentSizeChange = useCallback(
    (_w: number, contentHeight: number) => {
      if (didFireCompleteRef.current) return;
      if (viewportHeightRef.current === 0) return;
      if (contentHeight > viewportHeightRef.current + 40) {
        clearShortArticleTimer();
        return;
      }
      const elapsed = Date.now() - openedAtRef.current;
      const remaining = Math.max(0, MIN_READ_MS - elapsed);
      clearShortArticleTimer();
      shortArticleTimerRef.current = setTimeout(
        () => fireComplete('dwell'),
        remaining,
      );
    },
    [fireComplete, clearShortArticleTimer],
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    viewportHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  const langKeys = useMemo(() => {
    if (!key) return [];
    return [`${key}_title`, `${key}_summary`, `${key}_content`];
  }, [key]);

  const langData = useQuery(
    api.articleLanguage.queries.getByKeysAndLanguage,
    langKeys.length > 0
      ? {keys: langKeys, language: articleLang}
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

  if (!article || !langData) {
    return (
      <>
        <Stack.Screen options={{title: ''}} />
        <CustomLoadingIndicator />
      </>
    );
  }

  const title = langMap.get(`${key}_title`) || '';
  const content = langMap.get(`${key}_content`) || '';

  return (
    <Container>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: {backgroundColor: theme.bg.basic},
          headerTintColor: theme.text.basic,
        }}
      />
      <ScrollView
        contentContainerStyle={css`
          padding-bottom: 40px;
        `}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        scrollEventThrottle={250}
      >
        <Image
          source={{uri: article.storageThumbnailUrl || article.thumbnailUrl}}
          style={css`
            width: 100%;
            height: 220px;
          `}
          contentFit="cover"
        />
        <View
          style={css`
            padding: 20px 20px;
            gap: 12px;
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
                {categoriesMap.find((c) => c.name === article.categoryName)?.localizedString || article.categoryName}
              </Typography.Body4>
            </View>
            <Typography.Body4
              style={css`
                color: ${theme.text.placeholder};
              `}
            >
              {article.publishedAt}
            </Typography.Body4>
          </View>
          <Typography.Heading3
            style={css`
              color: ${theme.text.basic};
              line-height: 30px;
            `}
          >
            {title}
          </Typography.Heading3>
          <Typography.Body2
            style={css`
              color: ${theme.text.basic};
              line-height: 26px;
              margin-top: 8px;
            `}
          >
            {content}
          </Typography.Body2>
        </View>
      </ScrollView>
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;
