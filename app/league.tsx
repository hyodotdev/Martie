/**
 * @name League
 *
 * 리그 랭킹 화면 - 같은 그룹 30명의 주간 랭킹
 */
import {useEffect} from 'react';
import {View} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {Stack} from 'expo-router';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import {t} from '../src/STRINGS';
import {useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';
import {logScreenView} from '../src/utils/analytics';
import {TIER_EMOJIS, TIER_COLORS} from '../src/utils/leagueTiers';
import LeagueShareCard from '../src/uis/ShareCard/LeagueShareCard';

type LeagueMember = {
  odI: string;
  displayName: string;
  weeklyXp: number;
  tier: string;
  rank: number;
  isMe: boolean;
  isBot: boolean;
};

const buildMemberAccessibilityLabel = ({
  isDemoteZone,
  isPromoteZone,
  item,
  rankLabel,
  weeklyXpLabel,
}: {
  isDemoteZone: boolean;
  isPromoteZone: boolean;
  item: LeagueMember;
  rankLabel: string;
  weeklyXpLabel: string;
}): string =>
  [
    rankLabel,
    item.displayName,
    weeklyXpLabel,
    item.isMe ? t('league.currentUser') : null,
    isPromoteZone ? t('league.promoteZone') : null,
    isDemoteZone ? t('league.demoteZone') : null,
  ]
    .filter(Boolean)
    .join(', ');

function LeaguePage(): JSX.Element {
  const {theme} = useCPK();
  const myLeague = useQuery(api.league.queries.getMyLeague);

  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'league',
        screen_class: 'League',
      });
  }, []);

  // undefined = 로딩 중, null = 리그 미가입
  if (myLeague === undefined) {
    return (
      <>
        <Stack.Screen options={{headerShown: true, title: t('league.title')}} />
        <CustomLoadingIndicator />
      </>
    );
  }

  if (myLeague === null) {
    return (
      <>
        <Stack.Screen options={{headerShown: true, title: t('league.title')}} />
        <EmptyContainer>
          <Typography.Heading5>{t('league.notJoined')}</Typography.Heading5>
        </EmptyContainer>
      </>
    );
  }

  const tierEmoji = TIER_EMOJIS[myLeague.tier] || '🏆';
  const tierName = t(`league.${myLeague.tier}` as any);
  const rankAccessibilityLabel = t('league.rankAccessibility', {
    rank: myLeague.myRank,
    total: myLeague.totalMembers,
  });
  const promoteZoneCount = Math.min(
    myLeague.promoteThreshold,
    myLeague.totalMembers,
  );
  const promoteZoneLabel = t('league.promoteZoneWithThreshold', {
    count: promoteZoneCount,
  });
  const demoteZoneStartRank = Math.max(
    myLeague.promoteThreshold,
    myLeague.demoteThreshold,
  );
  const demoteZoneCount = Math.max(
    0,
    myLeague.totalMembers - demoteZoneStartRank,
  );
  const hasDemoteZone = demoteZoneCount > 0;
  const demoteZoneLabel = hasDemoteZone
    ? t('league.demoteZoneWithThreshold', {
        count: demoteZoneCount,
      })
    : '';

  const renderItem = ({item}: {item: LeagueMember}) => {
    const isPromoteZone = item.rank <= myLeague.promoteThreshold;
    const isDemoteZone = hasDemoteZone && item.rank > demoteZoneStartRank;
    const memberRankAccessibilityLabel = t('league.rankAccessibility', {
      rank: item.rank,
      total: myLeague.totalMembers,
    });
    const weeklyXpLabel = t('league.weeklyXp', {xp: item.weeklyXp});
    const memberAccessibilityLabel = buildMemberAccessibilityLabel({
      isDemoteZone,
      isPromoteZone,
      item,
      rankLabel: memberRankAccessibilityLabel,
      weeklyXpLabel,
    });

    return (
      <MemberRow
        accessible
        accessibilityLabel={memberAccessibilityLabel}
        accessibilityRole="text"
        accessibilityState={item.isMe ? {selected: true} : undefined}
        isMe={item.isMe}
      >
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            gap: 12px;
            flex: 1;
          `}
        >
          <RankBadge isPromote={isPromoteZone} isDemote={isDemoteZone}>
            <Typography.Body2
              style={css`
                font-weight: bold;
                color: ${isPromoteZone
                  ? '#22C55E'
                  : isDemoteZone
                    ? '#EF4444'
                    : theme.text.basic};
              `}
            >
              {item.rank}
            </Typography.Body2>
          </RankBadge>
          <Typography.Body2
            style={css`
              font-weight: ${item.isMe ? 'bold' : 'normal'};
              flex: 1;
            `}
            numberOfLines={1}
          >
            {item.displayName}{' '}
            {item.isMe ? `(${t('league.currentUser')})` : ''}
          </Typography.Body2>
        </View>
        <Typography.Body2
          style={css`
            font-weight: bold;
          `}
        >
          {weeklyXpLabel}
        </Typography.Body2>
      </MemberRow>
    );
  };

  return (
    <Container>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('league.title'),
        }}
      />

      {/* 리그 헤더 */}
      <LeagueHeader
        accessible
        accessibilityLabel={`${tierName} ${t('league.title')}, ${rankAccessibilityLabel}`}
        accessibilityRole="header"
        tierColor={TIER_COLORS[myLeague.tier] || '#888'}
      >
        <Typography.Heading2
          style={css`
            text-align: center;
          `}
        >
          {tierEmoji}
        </Typography.Heading2>
        <Typography.Heading4
          style={css`
            text-align: center;
            font-weight: bold;
          `}
        >
          {tierName} {t('league.title')}
        </Typography.Heading4>
        <Typography.Body2
          style={css`
            text-align: center;
          `}
        >
          {t('league.rank', {
            rank: myLeague.myRank,
            total: myLeague.totalMembers,
          })}
        </Typography.Body2>
      </LeagueHeader>

      {/* 승격/강등 안내 */}
      <View
        accessible
        accessibilityLabel={[promoteZoneLabel, demoteZoneLabel]
          .filter(Boolean)
          .join(', ')}
        accessibilityRole="text"
        style={css`
          flex-direction: row;
          justify-content: space-between;
          padding: 8px 16px;
        `}
      >
        <Typography.Body3
          style={css`
            color: #22c55e;
          `}
        >
          ↑ {promoteZoneLabel}
        </Typography.Body3>
        {hasDemoteZone ? (
          <Typography.Body3
            style={css`
              color: #ef4444;
            `}
          >
            ↓ {demoteZoneLabel}
          </Typography.Body3>
        ) : null}
      </View>

      {/* 멤버 리스트 */}
      <FlashList
        data={myLeague.members as LeagueMember[]}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.rank}_${item.odI}`}
        ListFooterComponent={
          <LeagueShareCard
            tier={myLeague.tier}
            rank={myLeague.myRank}
            totalMembers={myLeague.totalMembers}
            weeklyXp={myLeague.weeklyXp}
            displayName={
              (myLeague.members as LeagueMember[]).find((m) => m.isMe)
                ?.displayName ?? ''
            }
          />
        }
      />
    </Container>
  );
}

const Container = styled.View`
  background-color: ${({theme}) => theme.bg.basic};
  flex: 1;
`;

const LeagueHeader = styled.View<{tierColor: string}>`
  padding: 24px 16px;
  gap: 8px;
  border-bottom-width: 2px;
  border-bottom-color: ${({tierColor}) => tierColor};
`;

const MemberRow = styled.View<{isMe: boolean}>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: ${({isMe, theme}) =>
    isMe ? theme.bg.paper : 'transparent'};
`;

const RankBadge = styled.View<{isPromote: boolean; isDemote: boolean}>`
  width: 32px;
  align-items: center;
`;

const EmptyContainer = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

export default withErrorBoundary(LeaguePage);
