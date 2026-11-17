import React from 'react';
import {Pressable, View} from 'react-native';
import {Typography} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {t} from '../../STRINGS';

const TIER_EMOJIS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
  master: '👑',
};

type Props = {
  tier: string | null;
  weeklyXp: number;
  myRank: number;
  totalMembers: number;
  onPress: () => void;
  isLoading?: boolean;
};

export default function LeagueProgressCard({
  tier,
  weeklyXp,
  myRank,
  totalMembers,
  onPress,
  isLoading = false,
}: Props): JSX.Element {
  if (isLoading) {
    return (
      <Container
        accessible={true}
        accessibilityLabel={t('league.title')}
        accessibilityRole="progressbar"
        accessibilityState={{busy: true}}
      >
        <JoinRow>
          <TierIconContainer>
            <TierIcon>🏆</TierIcon>
          </TierIconContainer>
          <View
            style={css`
              flex: 1;
              gap: 8px;
            `}
          >
            <LoadingLine $width={58} />
            <LoadingLine $width={42} />
          </View>
        </JoinRow>
        <ProgressSection>
          <ProgressTrack>
            <ProgressFill $progress={36} />
          </ProgressTrack>
        </ProgressSection>
      </Container>
    );
  }

  if (!tier) {
    const joinLeagueAccessibilityLabel = [
      t('league.joinLeague'),
      t('league.notJoined'),
    ].join(', ');

    return (
      <Pressable
        accessibilityLabel={joinLeagueAccessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
      >
        <Container>
          <JoinRow>
            <TierIconContainer>
              <TierIcon>🏆</TierIcon>
            </TierIconContainer>
            <View
              style={css`
                flex: 1;
                gap: 2px;
              `}
            >
              <Typography.Body2
                style={css`
                  font-weight: 800;
                `}
              >
                {t('league.joinLeague')}
              </Typography.Body2>
              <Typography.Body3
                style={css`
                  opacity: 0.62;
                `}
              >
                {t('league.notJoined')}
              </Typography.Body3>
            </View>
            <ArrowText>→</ArrowText>
          </JoinRow>
        </Container>
      </Pressable>
    );
  }

  const tierEmoji = TIER_EMOJIS[tier] || '🏆';
  const tierName = t(`league.${tier}` as any);
  const rankLabel = t('league.rank', {rank: myRank, total: totalMembers});
  const weeklyXpLabel = t('league.weeklyXp', {xp: weeklyXp});
  const leagueAccessibilityLabel = [
    `${tierName} ${t('league.title')}`,
    rankLabel,
    weeklyXpLabel,
  ].join(', ');
  const clampedRank =
    totalMembers > 0 ? Math.min(Math.max(myRank, 1), totalMembers) : 0;
  const progressPercent =
    totalMembers > 1
      ? ((totalMembers - clampedRank) / (totalMembers - 1)) * 100
      : totalMembers === 1
        ? 100
        : 0;

  return (
    <Pressable
      accessibilityLabel={leagueAccessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
    >
      <Container>
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          `}
        >
          <View
            style={css`
              flex-direction: row;
              align-items: center;
              gap: 10px;
            `}
          >
            <TierIconContainer>
              <TierIcon>{tierEmoji}</TierIcon>
            </TierIconContainer>
            <View style={css`gap: 2px;`}>
              <Typography.Body2
                style={css`
                  font-weight: 700;
                `}
              >
                {tierName} {t('league.title')}
              </Typography.Body2>
              <Typography.Body3
                style={css`
                  opacity: 0.6;
                `}
              >
                {rankLabel}
              </Typography.Body3>
            </View>
          </View>
          <XpBadge>
            <Typography.Body3
              style={css`
                font-weight: 800;
                color: #f97316;
              `}
            >
              {weeklyXpLabel}
            </Typography.Body3>
          </XpBadge>
        </View>
        <ProgressSection>
          <ProgressHeader>
            <ProgressRank>
              {rankLabel}
            </ProgressRank>
            <ProgressPercent>{Math.round(progressPercent)}%</ProgressPercent>
          </ProgressHeader>
          <ProgressTrack>
            <ProgressFill $progress={Math.min(progressPercent, 100)} />
          </ProgressTrack>
          <ProgressScale>
            <ScaleText>#{totalMembers}</ScaleText>
            <ScaleText>#1</ScaleText>
          </ProgressScale>
        </ProgressSection>
      </Container>
    </Pressable>
  );
}

const Container = styled.View`
  padding: 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  gap: 16px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const JoinRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const TierIconContainer = styled.View`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`;

const TierIcon = styled.Text`
  font-size: 28px;
`;

const XpBadge = styled.View`
  background-color: ${({theme}) => `${theme.role.primary}14`};
  border-color: ${({theme}) => `${theme.role.primary}22`};
  border-width: 1px;
  padding: 6px 12px;
  border-radius: 999px;
`;

const ArrowText = styled.Text`
  color: ${({theme}) => theme.text.placeholder};
  font-size: 22px;
  font-weight: 800;
`;

const ProgressSection = styled.View`
  gap: 8px;
`;

const ProgressHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const ProgressRank = styled(Typography.Body4)`
  color: ${({theme}) => theme.text.basic};
  font-weight: 800;
`;

const ProgressPercent = styled(Typography.Body4)`
  color: ${({theme}) => theme.role.primary};
  font-weight: 800;
`;

const ProgressTrack = styled.View`
  width: 100%;
  height: 16px;
  background-color: ${({theme}) => theme.role.border};
  border-radius: 999px;
  overflow: hidden;
`;

const ProgressFill = styled.View<{$progress: number}>`
  height: 100%;
  width: ${({$progress}) => `${$progress}%`};
  background-color: ${({theme}) => theme.role.primary};
  border-radius: 999px;
`;

const ProgressScale = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const ScaleText = styled(Typography.Body4)`
  color: ${({theme}) => theme.text.placeholder};
  font-weight: 700;
`;

const LoadingLine = styled.View<{$width: number}>`
  width: ${({$width}) => `${$width}%`};
  height: 14px;
  border-radius: 999px;
  background-color: ${({theme}) => theme.role.border};
`;
