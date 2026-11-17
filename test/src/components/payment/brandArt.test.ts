import {
  GOOGLE_PLAY_ICON_ASPECT,
  GOOGLE_PLAY_ICON_XML,
  NPAY_BADGE_ASPECT,
  NPAY_BADGE_XML,
  NPAY_SIGNATURE_ASPECT,
  NPAY_SIGNATURE_BLACK_XML,
  TOSS_WORDMARK_ASPECT,
  brandArtHeight,
} from '../../../../src/components/payment/brandArt';

const viewBoxOf = (xml: string): number[] => {
  const match = /viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/.exec(xml);

  if (!match) {
    throw new Error('missing viewBox');
  }

  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
};

describe('brandArt', () => {
  it('keeps aspect constants in sync with the SVG viewBoxes', () => {
    const cases: [string, number][] = [
      [NPAY_SIGNATURE_BLACK_XML, NPAY_SIGNATURE_ASPECT],
      [NPAY_BADGE_XML, NPAY_BADGE_ASPECT],
      [GOOGLE_PLAY_ICON_XML, GOOGLE_PLAY_ICON_ASPECT],
    ];

    for (const [xml, aspect] of cases) {
      const [, , width, height] = viewBoxOf(xml);
      expect(aspect).toBeCloseTo(width / height, 5);
    }
  });

  it('matches the official Toss wordmark PNG dimensions (158x48)', () => {
    expect(TOSS_WORDMARK_ASPECT).toBeCloseTo(158 / 48, 5);
  });

  it('derives heights from widths without distortion', () => {
    expect(brandArtHeight(198, NPAY_SIGNATURE_ASPECT)).toBeCloseTo(66, 5);
    expect(brandArtHeight(277, NPAY_BADGE_ASPECT)).toBeCloseTo(105, 5);
  });

  it('uses only react-native-svg compatible paint attributes', () => {
    for (const xml of [
      NPAY_SIGNATURE_BLACK_XML,
      NPAY_BADGE_XML,
      GOOGLE_PLAY_ICON_XML,
    ]) {
      expect(xml).not.toContain('style=');
      expect(xml).not.toContain('<text');
    }
  });
});
