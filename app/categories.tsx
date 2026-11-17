import {useCallback, useMemo, useState, useEffect} from 'react';
import {styled, css} from 'kstyled';
import {Button, Typography} from 'cpk-ui';
import {Stack, useRouter} from 'expo-router';
import {t} from '../src/STRINGS';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {
  categoriesMap as categoriesMap,
  Category,
} from '../src/utils/categoriesMap';
import ButtonSelectable from '../src/uis/ButtonSelectable';
import {Platform, Dimensions, View} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useQuery, useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import {Id} from '../convex/_generated/dataModel';
import {logError} from '../src/utils/error';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import {logEvent, LOG_EVENTS, logScreenView} from '../src/utils/analytics';

function Categories(): JSX.Element {
  const insets = useSafeAreaInsets();
  const categories = useQuery(api.category.queries.list);
  const userCategories = useQuery(api.user.queries.getUserCategories);
  const {back} = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCategories = useMutation(
    api.userCategory.mutation.updateUserCategories,
  );

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
    Id<'categories'>[]
  >([]);

  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'categories',
        screen_class: 'Categories',
      });
  }, []);

  // Initialize selected categories when user data loads
  useEffect(() => {
    if (userCategories) {
      setSelectedCategoryIds(userCategories);
    }
  }, [userCategories]);

  const categoryMap = useMemo(() => {
    if (!categories) return new Map();
    return new Map(categories.map((cat) => [cat.name, cat._id]));
  }, [categories]);

  const toggleCategory = useCallback(
    (categoryId: Id<'categories'>, categoryName: string) => {
      // Compute outcome before the setter so logEvent (a side-effect) does
      // not run inside React's state updater function — Strict Mode and
      // batching can call updaters more than once.
      const isSelecting = !selectedCategoryIds.includes(categoryId);
      logEvent(
        isSelecting
          ? LOG_EVENTS.CATEGORY_SELECTED
          : LOG_EVENTS.CATEGORY_ABANDONED,
        {category: categoryName, surface: 'preferences'},
      );
      setSelectedCategoryIds((prev) => {
        const index = prev.indexOf(categoryId);
        return index < 0
          ? [...prev, categoryId]
          : [...prev.slice(0, index), ...prev.slice(index + 1)];
      });
    },
    [selectedCategoryIds],
  );

  const handleSelectCategories = useCallback(async () => {
    try {
      setIsUpdating(true);
      await updateCategories({categoryIds: selectedCategoryIds});

      back();
    } catch (error) {
      logError(error);
    } finally {
      setIsUpdating(false);
    }
  }, [back, selectedCategoryIds, updateCategories]);

  const keyExtractor = useCallback((item: Category) => item.name, []);

  const renderItem = useCallback(
    ({item: category}: {item: Category}) => {
      const categoryId = categoryMap.get(category.name);
      if (!categoryId) return null;

      return (
        <ButtonSelectable
          style={css`
            margin-bottom: 8px;
            height: 64px;
          `}
          text={category.localizedString}
          selected={selectedCategoryIds.includes(categoryId)}
          onSelect={() => toggleCategory(categoryId, category.name)}
        />
      );
    },
    [selectedCategoryIds, toggleCategory, categoryMap],
  );

  const ListHeader = useMemo(
    () => (
      <Typography.Heading1
        style={css`
          margin-bottom: 22px;
        `}
      >
        {t('categories.selectInterests')}
      </Typography.Heading1>
    ),
    [],
  );

  return (
    <Container>
      <Stack.Screen options={{title: ''}} />
      <SafeContainer insets={insets}>
        {!categories ? (
          <CustomLoadingIndicator />
        ) : (
          <>
            <FlashList
              data={categoriesMap}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              extraData={selectedCategoryIds}
              ListHeaderComponent={ListHeader}
              contentContainerStyle={css`
                padding: 24px;
              `}
              ListFooterComponent={
                <View
                  style={css`
                    height: 96px;
                  `}
                />
              }
              removeClippedSubviews={false}
            />
            <FixedBottomContainer
              style={css`
                bottom: 0;
                padding-bottom: 0;
              `}
            >
              <Button
                loading={isUpdating}
                onPress={handleSelectCategories}
                hapticFeedback={ImpactFeedbackStyle.Soft}
                disabled={selectedCategoryIds.length === 0}
                text={t('common.selectionComplete')}
                styles={{
                  container: css`
                    border-width: 0px;
                    height: 56px;
                  `,
                }}
                borderRadius={16}
              />
            </FixedBottomContainer>
          </>
        )}
      </SafeContainer>
    </Container>
  );
}

export default withErrorBoundary(Categories);

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const SafeContainer = styled.View<{insets: {top: number; bottom: number}}>`
  /* 이상하게 flex: 1이나 height: 100%를 주면 state가 변경되면서 화면이 깜빡여서 아래와 같이 임시로 수정.. */
  height: ${({insets}) => {
    const headerHeight = Platform.OS === 'ios' ? 44 : 56; // 기본 헤더 높이
    const statusBarHeight = Platform.OS === 'ios' ? 20 : 0; // iOS의 경우 상태바 높이
    const bottomInset = Platform.OS === 'ios' ? insets.bottom : 0; // iOS의 경우 하단 인셋

    const calculatedHeight =
      Dimensions.get('window').height -
      headerHeight -
      statusBarHeight -
      bottomInset;
    return `${calculatedHeight}`;
  }};
`;

const FixedBottomContainer = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  padding: 12px 24px;
  background-color: ${({theme}) => theme.bg.basic};
`;
