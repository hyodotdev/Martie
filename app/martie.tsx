/**
 * @name MartieLanding
 *
 * Lightweight web landing for shared Martie links.
 */
import {Image} from 'expo-image';
import {Stack} from 'expo-router';
import {Linking, Platform, View} from 'react-native';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';

import {IC_MARTIE_BASIC, IC_WORDMARK} from '../src/icons';
import ButtonMartie from '../src/uis/ButtonMartie';
import {APP_STORE_URLS} from '../src/utils/constants';
import {t} from '../src/STRINGS';
import {logEvent} from '../src/utils/analytics';

function withSource(url: string, source: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(
      parsed.hostname.includes('play.google.com') ? 'referrer' : 'source',
      parsed.hostname.includes('play.google.com')
        ? `source=${source}`
        : source,
    );
    return parsed.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}source=${source}`;
  }
}

export default function MartieLanding(): JSX.Element {
  const {theme} = useCPK();

  const openStore = (platform: 'ios' | 'android') => {
    const url = withSource(APP_STORE_URLS[platform], 'share_landing');
    logEvent('share_landing_store_opened', {platform});
    void Linking.openURL(url);
  };

  return (
    <Container>
      <Stack.Screen options={{headerShown: false}} />
      <Hero>
        <Image
          accessible={false}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
          source={IC_WORDMARK}
          style={css`
            width: 124px;
            height: 50px;
          `}
          contentFit="contain"
        />
        <Image
          accessible={false}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
          source={IC_MARTIE_BASIC}
          style={css`
            width: 148px;
            height: 148px;
          `}
          contentFit="contain"
        />
        <TextGroup>
          <Typography.Heading2
            accessibilityRole="header"
            style={css`
              text-align: center;
              color: ${theme.text.basic};
              font-weight: 800;
            `}
          >
            {t('landing.title')}
          </Typography.Heading2>
          <Typography.Body2
            style={css`
              text-align: center;
              color: ${theme.text.placeholder};
              line-height: 22px;
            `}
          >
            {t('landing.body')}
          </Typography.Body2>
        </TextGroup>
        <ButtonGroup>
          {(Platform.OS === 'ios' || Platform.OS === 'web') && (
            <View style={css`flex: 1;`}>
              <ButtonMartie
                accessibilityRole="link"
                text={t('landing.iosButton')}
                onPress={() => openStore('ios')}
                borderRadius={14}
                styles={{
                  container: css`
                    height: 50px;
                    border-width: 0;
                  `,
                  text: css`
                    font-size: 15px;
                    font-weight: 800;
                  `,
                }}
              />
            </View>
          )}
          {(Platform.OS === 'android' || Platform.OS === 'web') && (
            <View style={css`flex: 1;`}>
              <ButtonMartie
                accessibilityRole="link"
                text={t('landing.androidButton')}
                onPress={() => openStore('android')}
                borderRadius={14}
                color="light"
                styles={{
                  container: css`
                    height: 50px;
                    border-width: 1px;
                    border-color: ${theme.role.border};
                  `,
                  text: css`
                    font-size: 15px;
                    font-weight: 800;
                  `,
                }}
              />
            </View>
          )}
        </ButtonGroup>
      </Hero>
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Hero = styled.View`
  width: 100%;
  max-width: 420px;
  align-items: center;
  gap: 22px;
`;

const TextGroup = styled.View`
  gap: 10px;
`;

const ButtonGroup = styled.View`
  align-self: stretch;
  flex-direction: row;
  gap: 10px;
`;
