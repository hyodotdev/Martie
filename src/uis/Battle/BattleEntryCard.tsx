import {Image, Pressable, View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {useConvexAuth, useQuery} from 'convex/react';
import {api} from '../../../convex/_generated/api';
import {winRate} from '../../../convex/battle/logic';
import {IC_MARTIE_SMART} from '../../icons';
import {t} from '../../STRINGS';
import ButtonMartie from '../ButtonMartie';
import {recordText} from './BattleRecordCard';
import {Burst, INK} from './Sticker';

type Props = {
  onPress: () => void;
};

/**
 * The home screen's door to 1:1 battles, with where I stand so far. It sits
 * among the other home cards, so it shares their surface; only Martie and
 * the VS burst carry the battle look.
 */
export default function BattleEntryCard({onPress}: Props): JSX.Element {
  const {theme} = useCPK();
  const {isAuthenticated} = useConvexAuth();
  const stats = useQuery(
    api.battle.queries.getMyBattleStats,
    isAuthenticated ? {} : 'skip',
  );
  const played = stats ? stats.wins + stats.losses + stats.draws : 0;
  const rate = stats ? winRate(stats) : null;
  const summary =
    stats && played > 0
      ? [recordText(stats), rate === null ? '' : t('battle.winRate', {rate})]
          .filter(Boolean)
          .join(', ')
      : t('battle.cardDescription');

  return (
    <Pressable
      accessibilityLabel={[t('battle.cardTitle'), summary].join(', ')}
      accessibilityRole="button"
      onPress={onPress}
    >
      <Container>
        {/* Martie peeks in from the corner beside the VS burst. */}
        <Corner pointerEvents="none">
          <View style={{transform: [{rotate: '-10deg'}]}}>
            <Burst size={44}>
              <Typography.Body4
                style={css`
                  color: ${INK};
                  font-weight: 900;
                  font-style: italic;
                `}
              >
                VS
              </Typography.Body4>
            </Burst>
          </View>
          <Image
            accessibilityIgnoresInvertColors
            source={IC_MARTIE_SMART}
            resizeMode="contain"
            style={{width: 56, height: 56, marginLeft: -12}}
          />
        </Corner>

        <Typography.Heading5
          style={css`
            font-weight: 800;
            padding-right: 92px;
          `}
        >
          {t('battle.cardTitle')}
        </Typography.Heading5>

        {stats && played > 0 ? (
          <StatusRow>
            <Chip
              style={{
                backgroundColor: theme.bg.basic,
                borderColor: theme.role.border,
              }}
            >
              <Typography.Body3
                style={css`
                  font-weight: 800;
                `}
              >
                {recordText(stats)}
              </Typography.Body3>
            </Chip>
            {rate === null ? null : (
              <Chip
                style={{
                  backgroundColor: theme.role.primary,
                  borderColor: theme.role.primary,
                  transform: [{rotate: '-2deg'}],
                }}
              >
                <Typography.Body3
                  style={css`
                    color: #ffffff;
                    font-weight: 800;
                  `}
                >
                  {t('battle.winRate', {rate})}
                </Typography.Body3>
              </Chip>
            )}
            {stats.streak > 1 ? (
              <Chip
                style={{
                  backgroundColor: theme.bg.basic,
                  borderColor: theme.role.border,
                }}
              >
                <Typography.Body3
                  style={css`
                    font-weight: 800;
                  `}
                >
                  🔥 {t('battle.streak', {count: stats.streak})}
                </Typography.Body3>
              </Chip>
            ) : null}
          </StatusRow>
        ) : (
          <Typography.Body3
            style={css`
              opacity: 0.7;
              padding-right: 80px;
            `}
          >
            {t('battle.cardDescription')}
          </Typography.Body3>
        )}

        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Soft}
          onPress={onPress}
          text={t('battle.cardCta')}
          borderRadius={14}
          color="primary"
          styles={{
            container: css`
              height: 44px;
              border-width: 0;
            `,
            text: css`
              font-size: 15px;
              font-weight: 800;
            `,
          }}
        />
      </Container>
    </Pressable>
  );
}

const Container = styled.View`
  padding: 18px 20px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  margin: 0 16px;
  gap: 12px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const Corner = styled.View`
  position: absolute;
  top: 8px;
  right: 12px;
  flex-direction: row;
  align-items: center;
`;

const StatusRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.View`
  padding: 4px 10px;
  border-radius: 10px;
  border-width: 1px;
`;
