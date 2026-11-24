/**
 * @name Battles
 *
 * 1:1 퀴즈 대결 허브 — 방 만들기 + 내 전적 + 최근 대결 기록
 */
import {styled, css} from 'kstyled';
import {FlashList} from '@shopify/flash-list';
import {Typography, useCPK} from 'cpk-ui';
import {Stack} from 'expo-router';
import {ActivityIndicator, Platform, View} from 'react-native';
import {useCallback, useEffect, useMemo} from 'react';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {useConvexAuth, usePaginatedQuery, useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {BattleHistoryItem} from '../convex/battle/queries';
import {BATTLE_STAKE_BULBS} from '../convex/battle/logic';
import {t} from '../src/STRINGS';
import {logScreenView} from '../src/utils/analytics';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import ButtonMartie from '../src/uis/ButtonMartie';
import {MartieHost} from '../src/uis/Battle/BattleParts';
import BattleRecordCard from '../src/uis/Battle/BattleRecordCard';
import {needsInviteAd, useBattleInvite} from '../src/hooks/useBattleInvite';
import {useUserStore} from '../src/stores/userStore';

const LIST_SIZE = 20;

function resultLabel(result: BattleHistoryItem['result']): string {
  if (result === 'win') return t('battle.win');
  if (result === 'loss') return t('battle.loss');
  if (result === 'draw') return t('battle.draw');
  // Still being played.
  return '–';
}

function BattlesPage(): JSX.Element {
  const {theme} = useCPK();
  const {isAuthenticated} = useConvexAuth();
  const isPremium = useUserStore((state) => state.isPremium);
  const {startInvite, isStarting} = useBattleInvite();
  const stats = useQuery(
    api.battle.queries.getMyBattleStats,
    isAuthenticated ? {} : 'skip',
  );
  const {results, status, loadMore, isLoading} = usePaginatedQuery(
    api.battle.queries.listMyBattles,
    isAuthenticated ? {} : 'skip',
    {initialNumItems: LIST_SIZE},
  );

  useEffect(() => {
    if (!__DEV__)
      logScreenView({screen_name: 'battles', screen_class: 'Battles'});
  }, []);

  const handleCreate = useCallback(() => {
    void startInvite();
  }, [startInvite]);

  const handleLoadMore = useCallback(() => {
    if (status === 'CanLoadMore') loadMore(LIST_SIZE);
  }, [loadMore, status]);

  const renderItem = useCallback(
    ({item}: {item: BattleHistoryItem}) => {
      const color =
        item.result === 'win'
          ? theme.role.success
          : item.result === 'loss'
            ? theme.role.danger
            : theme.text.label;
      const date = new Date(item.createdAt).toLocaleDateString();
      const label = [
        resultLabel(item.result),
        t('battle.versus', {name: item.opponentName}),
        t('battle.score', {mine: item.myScore, theirs: item.opponentScore}),
        date,
      ].join(', ');
      return (
        <HistoryRow
          accessible
          accessibilityLabel={label}
          accessibilityRole="text"
        >
          <Typography.Body2
            style={css`
              width: 64px;
              font-weight: 800;
              color: ${color};
            `}
          >
            {resultLabel(item.result)}
          </Typography.Body2>
          <View
            style={css`
              flex: 1;
              gap: 2px;
            `}
          >
            <Typography.Body2 numberOfLines={1}>
              {t('battle.versus', {name: item.opponentName})}
            </Typography.Body2>
            <Typography.Body4
              style={css`
                opacity: 0.6;
              `}
            >
              {date}
            </Typography.Body4>
          </View>
          <Typography.Heading5
            style={css`
              font-weight: 800;
            `}
          >
            {t('battle.score', {mine: item.myScore, theirs: item.opponentScore})}
          </Typography.Heading5>
        </HistoryRow>
      );
    },
    [theme.role.danger, theme.role.success, theme.text.label],
  );

  const ListHeader = useMemo(
    () => (
      <View
        style={css`
          gap: 16px;
          padding-bottom: 16px;
        `}
      >
        <MartieHost mood="smart" message={t('battle.mcHub')} size={84} />
        <HeroCard>
          <Typography.Heading4
            style={css`
              font-weight: 800;
            `}
          >
            ⚔️ {t('battle.cardTitle')}
          </Typography.Heading4>
          <Typography.Body3
            style={css`
              opacity: 0.75;
            `}
          >
            {t('battle.rules', {
              stake: BATTLE_STAKE_BULBS,
              pot: BATTLE_STAKE_BULBS * 2,
            })}
          </Typography.Body3>
          <ButtonMartie
            hapticFeedback={ImpactFeedbackStyle.Medium}
            disabled={isStarting}
            loading={isStarting}
            onPress={handleCreate}
            text={t('battle.createRoom')}
            borderRadius={14}
            styles={{
              container: css`
                height: 52px;
                border-width: 0;
              `,
              text: css`
                font-size: 16px;
                font-weight: 800;
              `,
            }}
          />
          {needsInviteAd(isPremium, Platform.OS) ? (
            <Typography.Body4
              style={css`
                text-align: center;
                opacity: 0.6;
              `}
            >
              {t('battle.adNotice')}
            </Typography.Body4>
          ) : null}
        </HeroCard>
        {stats ? <BattleRecordCard stats={stats} /> : null}
        {isAuthenticated ? (
          <Typography.Heading5
            style={css`
              font-weight: 800;
            `}
          >
            {t('battle.historyTitle')}
          </Typography.Heading5>
        ) : null}
      </View>
    ),
    [handleCreate, isAuthenticated, isPremium, isStarting, stats],
  );

  const ListEmpty = useCallback(() => {
    if (!isAuthenticated || isLoading) return null;
    return (
      <Typography.Body3
        style={css`
          text-align: center;
          padding: 24px 0;
          color: ${theme.text.placeholder};
        `}
      >
        {t('battle.noHistory')}
      </Typography.Body3>
    );
  }, [isAuthenticated, isLoading, theme.text.placeholder]);

  const ListFooter = useCallback(() => {
    if (status !== 'LoadingMore') return <FooterSpacer />;
    return (
      <FooterSpacer>
        <ActivityIndicator
          accessibilityLabel={t('common.loading')}
          size="small"
          color={theme.role.primary}
        />
      </FooterSpacer>
    );
  }, [status, theme.role.primary]);

  const keyExtractor = useCallback((item: BattleHistoryItem) => item._id, []);

  return (
    <Container>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('battle.title'),
          headerBackTitle: t('common.back'),
        }}
      />
      <FlashList
        data={results}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={css`
          padding: 16px 20px 0;
        `}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </Container>
  );
}

export default withErrorBoundary(BattlesPage);

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const HeroCard = styled.View`
  padding: 20px;
  gap: 12px;
  border-radius: 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const HistoryRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background-color: ${({theme}) => theme.bg.paper};
`;

const Separator = styled.View`
  height: 8px;
`;

const FooterSpacer = styled.View`
  height: 48px;
  align-items: center;
  justify-content: center;
`;
