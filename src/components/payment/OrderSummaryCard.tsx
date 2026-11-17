/**
 * @name OrderSummaryCard
 *
 * Product summary card for the Toss/Naver checkout screens. The PG
 * widgets render payment methods only, so the merchant product block
 * (icon, name, amount, total) is our own UI. Mirrors the BulbPack
 * artwork from the purchase screen.
 */

import {css, styled} from 'kstyled';
import {Icon, Typography, useCPK, type IconName} from 'cpk-ui';
import {t} from '../../STRINGS';

export type BulbPackDisplay = {
  iconName: IconName;
  iconColor: string;
};

export const getBulbPackDisplay = (bulbCount: number): BulbPackDisplay => {
  if (bulbCount === 10) {
    return {iconName: 'Lightning', iconColor: '#F9A825'};
  }

  return {iconName: 'LightningA', iconColor: '#FB8C00'};
};

const tintOf = (iconColor: string, isDarkMode: boolean): string => {
  const rgb =
    iconColor === '#FB8C00' ? '251, 140, 0' : '249, 168, 37';

  return `rgba(${rgb}, ${isDarkMode ? '0.16' : '0.1'})`;
};

type CardProps = {
  bulbCount: number;
  orderName: string;
  amountKrw: number;
  compact?: boolean;
};

const formatKrw = (amountKrw: number): string =>
  `${amountKrw.toLocaleString()}원`;

export default function OrderSummaryCard({
  bulbCount,
  orderName,
  amountKrw,
  compact = false,
}: CardProps): JSX.Element {
  const {theme, themeType} = useCPK();
  const {iconName, iconColor} = getBulbPackDisplay(bulbCount);
  const tileSize = compact ? 48 : 60;

  return (
    <Card
      style={css`
        background-color: ${theme.bg?.bubble || '#FFFFFF'};
        border-color: ${theme.role?.border || '#E8E8E8'};
        padding: ${compact ? '12px 14px' : '16px'};
        margin-bottom: ${compact ? '0' : '20px'};
      `}
    >
      <ProductRow>
        <IconTile
          style={css`
            width: ${tileSize}px;
            height: ${tileSize}px;
            border-radius: ${tileSize / 2}px;
            background-color: ${tintOf(iconColor, themeType === 'dark')};
          `}
        >
          <Icon
            name={iconName}
            size={compact ? 28 : 34}
            color={iconColor}
          />
        </IconTile>
        <ProductText>
          <Typography.Body1
            numberOfLines={1}
            style={css`
              font-weight: bold;
              color: ${theme.text?.basic || '#37140B'};
            `}
          >
            {orderName}
          </Typography.Body1>
          <Typography.Body4
            style={css`
              margin-top: 2px;
              color: ${theme.role?.warning || '#F57C00'};
            `}
          >
            {t('purchase.altBilling.testModeSandboxNote')}
          </Typography.Body4>
        </ProductText>
        <Typography.Body1
          style={css`
            font-weight: bold;
            font-variant: tabular-nums;
            color: ${theme.text?.basic || '#37140B'};
          `}
        >
          {formatKrw(amountKrw)}
        </Typography.Body1>
      </ProductRow>
      <Divider
        style={css`
          background-color: ${theme.role?.border || '#E8E8E8'};
        `}
      />
      <TotalRow>
        <Typography.Body2
          style={css`
            color: ${theme.text?.disabled || '#8F8F8F'};
          `}
        >
          {t('purchase.altBilling.orderTotal')}
        </Typography.Body2>
        <Typography.Body1
          style={css`
            font-weight: bold;
            font-variant: tabular-nums;
            color: ${theme.role?.primary || '#FF5B50'};
          `}
        >
          {formatKrw(amountKrw)}
        </Typography.Body1>
      </TotalRow>
    </Card>
  );
}

const Card = styled.View`
  border-radius: 20px;
  border-width: 1px;
`;

const ProductRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

const IconTile = styled.View`
  align-items: center;
  justify-content: center;
`;

const ProductText = styled.View`
  flex: 1;
`;

const Divider = styled.View`
  height: 1px;
  margin-vertical: 12px;
  opacity: 0.7;
`;

const TotalRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;
