import {Pressable} from 'react-native';
import {Typography} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {t} from '../../STRINGS';
import ButtonMartie from '../ButtonMartie';

type Props = {
  onPress: () => void;
};

export default function BattleEntryCard({onPress}: Props): JSX.Element {
  return (
    <Pressable
      accessibilityLabel={[
        t('battle.cardTitle'),
        t('battle.cardDescription'),
      ].join(', ')}
      accessibilityRole="button"
      onPress={onPress}
    >
      <Container>
        <Typography.Heading5
          style={css`
            font-weight: 800;
          `}
        >
          ⚔️ {t('battle.cardTitle')}
        </Typography.Heading5>
        <Typography.Body3
          style={css`
            opacity: 0.7;
          `}
        >
          {t('battle.cardDescription')}
        </Typography.Body3>
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
  gap: 10px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;
