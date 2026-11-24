/**
 * @name Battles
 *
 * 1:1 퀴즈 대결 허브 — 내 현황 + 방 만들기 + 최근 대결 / 라이벌 (페이지 단위)
 */
import {styled, css} from 'kstyled';
import {FlashList} from '@shopify/flash-list';
import {Typography, useCPK} from 'cpk-ui';
import {Stack} from 'expo-router';
import {ActivityIndicator, Platform, Pressable, View} from 'react-native';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useConvexAuth, usePaginatedQuery, useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {BattleHistoryItem, BattleRivalItem} from '../convex/battle/queries';
import {BATTLE_STAKE_BULBS} from '../convex/battle/logic';
import {t} from '../src/STRINGS';
import {logScreenView} from '../src/utils/analytics';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import {MartieHost, PlayerAvatar, RIVAL_COLOR} from '../src/uis/Battle/BattleParts';
import BattleRecordCard, {recordText} from '../src/uis/Battle/BattleRecordCard';
import {CREAM, INK, Sticker, StickerButton} from '../src/uis/Battle/Sticker';
import {needsInviteAd, useBattleInvite} from '../src/hooks/useBattleInvite';
import {useUserStore} from '../src/stores/userStore';

// Small pages: the list grows as you scroll instead of arriving all at once.
const PAGE_SIZE = 10;

type Tab = 'history' | 'rivals';
type Row =
  | {kind: 'history'; item: BattleHistoryItem}
  | {kind: 'rival'; item: BattleRivalItem};

function resultLabel(result: BattleHistoryItem['result']): string {
  if (result === 'win') return t('battle.win');
  if (result === 'loss') return t('battle.loss');
  if (result === 'draw') return t('battle.draw');
  // Still being played.
  return '–';
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): JSX.Element {
  const {theme} = useCPK();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{selected: active}}
      onPress={onPress}
      style={{flex: 1}}
    >
      {/* The open tab stands up off the page; the other lies flat. */}
      <Sticker
        offset={active ? 3 : 0}
        radius={14}
        style={{transform: [{translateY: active ? 0 : 3}]}}
        faceStyle={{
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? theme.role.primary : CREAM,
        }}
      >
        <Typography.Body2
          style={css`
            color: ${active ? '#FFFFFF' : INK};
            font-weight: 900;
          `}
        >
          {label}
        </Typography.Body2>
      </Sticker>
    </Pressable>
  );
}

function HistoryRow({item}: {item: BattleHistoryItem}): JSX.Element {
  const {theme} = useCPK();
  const color =
    item.result === 'win'
      ? theme.role.success
      : item.result === 'loss'
        ? theme.role.danger
        : '#9A9484';
  const date = new Date(item.createdAt).toLocaleDateString();
  return (
    <Sticker offset={2} radius={16}>
      <RowBody
        accessible
        accessibilityRole="text"
        accessibilityLabel={[
          resultLabel(item.result),
          t('battle.versus', {name: item.opponentName}),
          t('battle.score', {mine: item.myScore, theirs: item.opponentScore}),
          date,
        ].join(', ')}
      >
        <ResultStamp style={{backgroundColor: color, transform: [{rotate: '-5deg'}]}}>
          <Typography.Body3
            numberOfLines={1}
            style={css`
              color: #ffffff;
              font-weight: 900;
            `}
          >
            {resultLabel(item.result)}
          </Typography.Body3>
        </ResultStamp>
        <View
          style={css`
            flex: 1;
            gap: 2px;
          `}
        >
          <Typography.Body2
            numberOfLines={1}
            style={css`
              color: ${INK};
              font-weight: 800;
            `}
          >
            {t('battle.versus', {name: item.opponentName})}
          </Typography.Body2>
          <Typography.Body4
            style={css`
              color: ${INK};
              opacity: 0.55;
            `}
          >
            {date}
          </Typography.Body4>
        </View>
        <Typography.Heading5
          style={css`
            color: ${INK};
            font-weight: 900;
          `}
        >
          {t('battle.score', {mine: item.myScore, theirs: item.opponentScore})}
        </Typography.Heading5>
      </RowBody>
    </Sticker>
  );
}

function RivalRow({item}: {item: BattleRivalItem}): JSX.Element {
  const {theme} = useCPK();
  const date = new Date(item.lastPlayedAt).toLocaleDateString();
  return (
    <Sticker offset={2} radius={16}>
      <RowBody
        accessible
        accessibilityRole="text"
        accessibilityLabel={[
          item.opponentName,
          recordText(item),
          t('battle.lastPlayed', {date}),
        ].join(', ')}
      >
        <PlayerAvatar
          player={{displayName: item.opponentName, avatarUrl: item.avatarUrl}}
          size={38}
          ringColor={RIVAL_COLOR}
        />
        <View
          style={css`
            flex: 1;
            gap: 2px;
          `}
        >
          <Typography.Body2
            numberOfLines={1}
            style={css`
              color: ${INK};
              font-weight: 800;
            `}
          >
            {item.opponentName}
          </Typography.Body2>
          <Typography.Body4
            numberOfLines={1}
            style={css`
              color: ${INK};
              opacity: 0.55;
            `}
          >
            {recordText(item)} · {t('battle.lastPlayed', {date})}
          </Typography.Body4>
        </View>
        {/* My wins against their wins, each in its side's color. */}
        <Typography.Heading5
          style={css`
            font-weight: 900;
            color: ${INK};
          `}
        >
          <Typography.Heading5
            style={css`
              font-weight: 900;
              color: ${theme.role.primary};
            `}
          >
            {item.wins}
          </Typography.Heading5>
          {' : '}
          <Typography.Heading5
            style={css`
              font-weight: 900;
              color: ${RIVAL_COLOR};
            `}
          >
            {item.losses}
          </Typography.Heading5>
        </Typography.Heading5>
      </RowBody>
    </Sticker>
  );
}

function BattlesPage(): JSX.Element {
  const {theme} = useCPK();
  const {isAuthenticated} = useConvexAuth();
  const isPremium = useUserStore((state) => state.isPremium);
  const {startInvite, isStarting} = useBattleInvite();
  const [tab, setTab] = useState<Tab>('history');
  const stats = useQuery(
    api.battle.queries.getMyBattleStats,
    isAuthenticated ? {} : 'skip',
  );
  const history = usePaginatedQuery(
    api.battle.queries.listMyBattles,
    isAuthenticated ? {} : 'skip',
    {initialNumItems: PAGE_SIZE},
  );
  // Rivals load only once their tab is opened.
  const rivals = usePaginatedQuery(
    api.battle.queries.listMyRivals,
    isAuthenticated && tab === 'rivals' ? {} : 'skip',
    {initialNumItems: PAGE_SIZE},
  );
  const active = tab === 'history' ? history : rivals;

  useEffect(() => {
    if (!__DEV__)
      logScreenView({screen_name: 'battles', screen_class: 'Battles'});
  }, []);

  const rows = useMemo<Row[]>(
    () =>
      tab === 'history'
        ? history.results.map((item) => ({kind: 'history', item}))
        : rivals.results.map((item) => ({kind: 'rival', item})),
    [history.results, rivals.results, tab],
  );

  const handleCreate = useCallback(() => {
    void startInvite();
  }, [startInvite]);

  const {status: activeStatus, loadMore: activeLoadMore} = active;
  const handleLoadMore = useCallback(() => {
    if (activeStatus === 'CanLoadMore') activeLoadMore(PAGE_SIZE);
  }, [activeLoadMore, activeStatus]);

  const renderItem = useCallback(
    ({item}: {item: Row}) =>
      item.kind === 'history' ? (
        <HistoryRow item={item.item} />
      ) : (
        <RivalRow item={item.item} />
      ),
    [],
  );

  const ListHeader = useMemo(
    () => (
      <View
        style={css`
          gap: 18px;
          padding-bottom: 18px;
        `}
      >
        <MartieHost mood="smart" message={t('battle.mcHub')} size={84} />
        {stats ? <BattleRecordCard stats={stats} /> : null}
        <View
          style={css`
            gap: 8px;
          `}
        >
          <StickerButton
            text={t('battle.createRoom')}
            onPress={handleCreate}
            disabled={isStarting}
            color={theme.role.primary}
          />
          <Typography.Body4
            style={css`
              text-align: center;
              opacity: 0.6;
            `}
          >
            {t('battle.rules', {
              stake: BATTLE_STAKE_BULBS,
              pot: BATTLE_STAKE_BULBS * 2,
            })}
            {needsInviteAd(isPremium, Platform.OS) ? ` ${t('battle.adNotice')}` : ''}
          </Typography.Body4>
        </View>
        {isAuthenticated ? (
          <TabRow accessibilityRole="tablist">
            <TabButton
              label={t('battle.historyTitle')}
              active={tab === 'history'}
              onPress={() => setTab('history')}
            />
            <TabButton
              label={t('battle.tabRivals')}
              active={tab === 'rivals'}
              onPress={() => setTab('rivals')}
            />
          </TabRow>
        ) : null}
      </View>
    ),
    [handleCreate, isAuthenticated, isPremium, isStarting, stats, tab, theme.role.primary],
  );

  const ListEmpty = useCallback(() => {
    if (!isAuthenticated || active.isLoading) return null;
    return (
      <Typography.Body3
        style={css`
          text-align: center;
          padding: 24px 0;
          color: ${theme.text.placeholder};
        `}
      >
        {tab === 'history' ? t('battle.noHistory') : t('battle.noRivals')}
      </Typography.Body3>
    );
  }, [active.isLoading, isAuthenticated, tab, theme.text.placeholder]);

  const ListFooter = useCallback(() => {
    if (activeStatus !== 'LoadingMore') return <FooterSpacer />;
    return (
      <FooterSpacer>
        <ActivityIndicator
          accessibilityLabel={t('common.loading')}
          size="small"
          color={theme.role.primary}
        />
      </FooterSpacer>
    );
  }, [activeStatus, theme.role.primary]);

  const keyExtractor = useCallback((row: Row) => row.item._id, []);
  const getItemType = useCallback((row: Row) => row.kind, []);

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
        data={rows}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
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

const TabRow = styled.View`
  flex-direction: row;
  gap: 10px;
`;

const RowBody = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
`;

const ResultStamp = styled.View`
  min-width: 56px;
  align-items: center;
  padding: 3px 8px;
  border-radius: 9px;
  border-width: 1.5px;
  border-color: ${INK};
`;

const Separator = styled.View`
  height: 10px;
`;

const FooterSpacer = styled.View`
  height: 48px;
  align-items: center;
  justify-content: center;
`;
