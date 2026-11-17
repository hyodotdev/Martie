/**
 * @name PaymentTestBanner
 *
 * Branded test-mode card for the purchase screen. Shows which payment
 * rail a test build uses. Keeps the literal "Payment test mode: ..."
 * line so device automation can keep grepping for it.
 */

import {css, styled} from 'kstyled';
import {Typography, useCPK} from 'cpk-ui';
import {t} from '../../STRINGS';
import {
  NaverBadgeMark,
  PlayStoreIcon,
  TossWordmark,
} from './PaymentBrandMark';

export type TestBannerMode = 'toss' | 'naver' | 'alt';

type BannerProps = {
  mode: TestBannerMode;
  modeLabel: string;
};

function BannerArt({mode}: {mode: TestBannerMode}): JSX.Element {
  if (mode === 'toss') {
    return (
      <ArtChip>
        <TossWordmark width={72} />
      </ArtChip>
    );
  }

  if (mode === 'naver') {
    return (
      <ArtChip>
        <NaverBadgeMark width={96} />
      </ArtChip>
    );
  }

  return (
    <ArtChip>
      <MultiMark>
        <PlayStoreIcon width={22} />
        <TossWordmark width={44} />
      </MultiMark>
    </ArtChip>
  );
}

export default function PaymentTestBanner({
  mode,
  modeLabel,
}: BannerProps): JSX.Element {
  const {theme} = useCPK();

  return (
    <Card
      style={css`
        background-color: ${theme.bg.bubble};
        border-color: ${theme.role.border};
      `}
    >
      <BannerArt mode={mode} />
      <CardText>
        <Typography.Body2
          style={css`
            font-weight: bold;
            color: ${theme.role.warning};
          `}
        >
          Payment test mode: {modeLabel}
        </Typography.Body2>
        <Typography.Body4
          style={css`
            margin-top: 2px;
            color: ${theme.text.disabled};
          `}
        >
          {t('purchase.altBilling.testModeSandboxNote')}
        </Typography.Body4>
      </CardText>
    </Card>
  );
}

const Card = styled.View`
  flex-direction: row;
  align-items: center;
  border-radius: 18px;
  border-width: 1px;
  padding: 12px;
  margin-bottom: 16px;
  gap: 12px;
`;

const ArtChip = styled.View`
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  background-color: #ffffff;
`;

const MultiMark = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const CardText = styled.View`
  flex: 1;
`;
