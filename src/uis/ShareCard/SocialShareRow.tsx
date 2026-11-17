import React from 'react';
import {Pressable} from 'react-native';
import {styled, css} from 'kstyled';
import {Icon, Typography, useCPK} from 'cpk-ui';
import {ImpactFeedbackStyle, impactAsync} from 'expo-haptics';
import {shareToSocial, SocialPlatform} from '../../utils/socialShare';
import {t} from '../../STRINGS';

type Props = {
  text: string;
  url: string;
  source: string;
  extras?: Record<string, unknown>;
};

type Item = {
  platform: SocialPlatform;
  label: string;
  bg: string;
  fg: string;
  icon?: 'TwitterLogoFill';
  mark?: string;
};

/**
 * Inline platform share row — Twitter (X), LINE, KakaoTalk (PMF sprint #70).
 *
 * KakaoTalk has no public web intent on mobile, so we route through the
 * system share sheet which lands on Kakao as the default destination on
 * Korean devices. Twitter and LINE go via web intents directly.
 */
export default function SocialShareRow({
  text,
  url,
  source,
  extras,
}: Props): JSX.Element {
  const {theme} = useCPK();
  const items: Item[] = [
    {
      platform: 'twitter',
      label: 'X',
      bg: '#000',
      fg: '#fff',
      icon: 'TwitterLogoFill',
    },
    {
      platform: 'line',
      label: 'LINE',
      bg: '#06C755',
      fg: '#fff',
    },
    {
      platform: 'kakao',
      label: 'Kakao',
      bg: '#FEE500',
      fg: '#191919',
      mark: '💬',
    },
  ];

  return (
    <Row>
      {items.map((item) => (
        <Pressable
          key={item.platform}
          onPress={() => {
            void impactAsync(ImpactFeedbackStyle.Light);
            void shareToSocial({
              text,
              url,
              source,
              platform: item.platform,
              extras,
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={t('shareCard.shareToPlatform', {
            platform: item.label,
          })}
          style={({pressed}) =>
            css`
              flex: 1;
              opacity: ${pressed ? 0.7 : 1};
            `
          }
        >
          <Pill
            style={css`
              background-color: ${item.bg};
              border-color: ${item.platform === 'twitter'
                ? theme.role.border
                : 'transparent'};
            `}
          >
            {item.icon ? (
              <Icon name={item.icon} size={16} color={item.fg} />
            ) : item.mark ? (
              <Typography.Body3
                style={css`
                  color: ${item.fg};
                  font-size: 14px;
                `}
              >
                {item.mark}
              </Typography.Body3>
            ) : null}
            <Typography.Body3
              style={css`
                color: ${item.fg};
                font-weight: 700;
                font-size: 13px;
              `}
            >
              {item.label}
            </Typography.Body3>
          </Pill>
        </Pressable>
      ))}
    </Row>
  );
}

const Row = styled.View`
  flex-direction: row;
  gap: 8px;
  align-self: stretch;
`;

const Pill = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  border-radius: 12px;
  border-width: 1px;
`;
