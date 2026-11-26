import React, {useRef, useCallback} from 'react';
import {View, type ViewInstance} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {captureRef} from 'react-native-view-shot';
import {shareAsync} from 'expo-sharing';
import {Share} from 'react-native';
import {t} from '../../STRINGS';
import ButtonMartie from '../ButtonMartie';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {TIER_EMOJIS, TIER_COLORS} from '../../utils/leagueTiers';
import {logEvent, LOG_EVENTS} from '../../utils/analytics';
import SocialShareRow from './SocialShareRow';
import {MARTIE_SHARE_URL} from '../../utils/constants';

type Props = {
  tier: string;
  rank: number;
  totalMembers: number;
  weeklyXp: number;
  displayName: string;
  appUrl?: string;
};

export default function LeagueShareCard({
  tier,
  rank,
  totalMembers,
  weeklyXp,
  displayName,
  appUrl = MARTIE_SHARE_URL,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const cardRef = useRef<ViewInstance>(null);

  const tierEmoji = TIER_EMOJIS[tier] || '🏆';
  const tierColor = TIER_COLORS[tier] || '#888';
  const tierName = t(`league.${tier}` as any);
  const leagueTitle = `${tierName} ${t('league.title')}`;
  const rankLabel = t('league.rankAccessibility', {
    rank,
    total: totalMembers,
  });
  const weeklyXpLabel = t('league.weeklyXp', {xp: weeklyXp});
  const displayNameLabel = `@${displayName}`;
  const cardAccessibilityLabel = [
    leagueTitle,
    rankLabel,
    weeklyXpLabel,
    displayNameLabel,
  ].join(', ');

  const shareText = [
    `${tierEmoji} ${leagueTitle}`,
    '',
    `#${rank} / ${totalMembers}  +${weeklyXp} XP`,
    displayNameLabel,
    '',
    appUrl,
  ].join('\n');

  const handleShareText = useCallback(async () => {
    logEvent(LOG_EVENTS.SHARE_INITIATED, {
      source: 'league',
      variant: 'text',
      tier,
      rank,
      weeklyXp,
    });
    const result = await Share.share({message: shareText});
    if (result.action === Share.sharedAction) {
      logEvent(LOG_EVENTS.SHARE_COMPLETED, {
        source: 'league',
        variant: 'text',
      });
    }
  }, [shareText, tier, rank, weeklyXp]);

  const handleShareImage = useCallback(async () => {
    if (!cardRef.current) return;
    logEvent(LOG_EVENTS.SHARE_INITIATED, {
      source: 'league',
      variant: 'image',
      tier,
      rank,
      weeklyXp,
    });
    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 0.9,
    });
    await shareAsync(uri, {
      mimeType: 'image/png',
    });
    // expo-sharing returns no action; this signals sheet closure, not actual share
    logEvent(LOG_EVENTS.SHARE_SHEET_CLOSED, {
      source: 'league',
      variant: 'image',
    });
  }, [tier, rank, weeklyXp]);

  return (
    <View
      style={css`
        gap: 12px;
        padding: 16px;
        width: 100%;
      `}
    >
      <CardContainer
        ref={cardRef}
        accessible
        accessibilityLabel={cardAccessibilityLabel}
        accessibilityRole="image"
        collapsable={false}
        testID="league-share-card-summary"
        tierColor={tierColor}
      >
        <Typography.Heading2
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={css`
            text-align: center;
          `}
        >
          {tierEmoji}
        </Typography.Heading2>

        <Typography.Body2
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={css`
            text-align: center;
            font-weight: 700;
            color: ${tierColor};
          `}
        >
          {tierName} {t('league.title')}
        </Typography.Body2>

        <RankDisplay
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Typography.Heading3
            style={css`
              font-weight: 800;
              color: ${tierColor};
            `}
          >
            #{rank}
          </Typography.Heading3>
          <Typography.Body3
            style={css`
              opacity: 0.5;
            `}
          >
            / {totalMembers}
          </Typography.Body3>
        </RankDisplay>

        <StatsRow
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <StatItem>
            <StatLabel>⚡</StatLabel>
            <StatValue>{weeklyXp} XP</StatValue>
          </StatItem>
          <StatDivider />
          <StatItem
            style={css`
              flex: 1;
              flex-shrink: 1;
            `}
          >
            <StatValue numberOfLines={1}>@{displayName}</StatValue>
          </StatItem>
        </StatsRow>
      </CardContainer>

      <SocialShareRow
        text={shareText.split('\n').slice(0, -2).join('\n')}
        url={appUrl}
        source="league"
        extras={{tier, rank, weeklyXp}}
      />

      <View
        style={css`
          flex-direction: row;
          gap: 8px;
          align-self: stretch;
        `}
      >
        <View style={css`flex: 1;`}>
          <ButtonMartie
            accessibilityLabel={`${t('shareCard.shareText')}, ${leagueTitle}`}
            hapticFeedback={ImpactFeedbackStyle.Light}
            onPress={handleShareText}
            text={t('shareCard.shareText')}
            borderRadius={12}
            color="light"
            styles={{
              container: css`
                min-height: 44px;
                border-width: 1px;
                border-color: ${theme.role.border};
                background-color: transparent;
              `,
              text: css`
                font-size: 14px;
                font-weight: 700;
              `,
            }}
          />
        </View>
        <View style={css`flex: 1;`}>
          <ButtonMartie
            accessibilityLabel={`${t('shareCard.shareImage')}, ${leagueTitle}`}
            hapticFeedback={ImpactFeedbackStyle.Soft}
            onPress={handleShareImage}
            text={t('shareCard.shareImage')}
            borderRadius={12}
            styles={{
              container: css`
                min-height: 44px;
                border-width: 0;
              `,
              text: css`
                font-size: 14px;
                font-weight: 700;
              `,
            }}
          />
        </View>
      </View>
    </View>
  );
}

const CardContainer = styled.View<{tierColor: string}>`
  padding: 24px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  gap: 12px;
  align-items: center;
  border-width: 2px;
  border-color: ${({tierColor}) => tierColor + '40'};
`;

const RankDisplay = styled.View`
  flex-direction: row;
  align-items: baseline;
  gap: 4px;
`;

const StatsRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

const StatItem = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const StatLabel = styled.Text`
  font-size: 14px;
`;

const StatValue = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${({theme}) => theme.text.basic};
`;

const StatDivider = styled.View`
  width: 1px;
  height: 14px;
  background-color: ${({theme}) => theme.role.border};
`;
