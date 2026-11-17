/**
 * @name PaymentBrandMark
 *
 * Official payment-brand artwork rendered at fixed aspect ratios.
 * Vector marks use react-native-svg; the Toss wordmark uses expo-image.
 */

import {Image} from 'expo-image';
import {SvgXml} from 'react-native-svg';
import {
  GOOGLE_PLAY_ICON_ASPECT,
  GOOGLE_PLAY_ICON_XML,
  NPAY_BADGE_ASPECT,
  NPAY_BADGE_XML,
  NPAY_SIGNATURE_ASPECT,
  NPAY_SIGNATURE_BLACK_XML,
  TOSS_WORDMARK_ASPECT,
  brandArtHeight,
} from './brandArt';

type MarkProps = {
  width: number;
};

export function NaverSignatureMark({width}: MarkProps): JSX.Element {
  return (
    <SvgXml
      xml={NPAY_SIGNATURE_BLACK_XML}
      width={width}
      height={brandArtHeight(width, NPAY_SIGNATURE_ASPECT)}
    />
  );
}

export function NaverBadgeMark({width}: MarkProps): JSX.Element {
  return (
    <SvgXml
      xml={NPAY_BADGE_XML}
      width={width}
      height={brandArtHeight(width, NPAY_BADGE_ASPECT)}
    />
  );
}

export function PlayStoreIcon({width}: MarkProps): JSX.Element {
  return (
    <SvgXml
      xml={GOOGLE_PLAY_ICON_XML}
      width={width}
      height={brandArtHeight(width, GOOGLE_PLAY_ICON_ASPECT)}
    />
  );
}

export function TossWordmark({width}: MarkProps): JSX.Element {
  return (
    <Image
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require('../../../assets/payments/toss-wordmark-blue.png')}
      style={{
        width,
        height: brandArtHeight(width, TOSS_WORDMARK_ASPECT),
      }}
      contentFit="contain"
    />
  );
}
