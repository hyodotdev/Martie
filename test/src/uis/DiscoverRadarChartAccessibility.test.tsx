import {render} from '@testing-library/react-native';
import React from 'react';

import RadarChart from '../../../src/uis/Discover/RadarChart';
import {createRadarAccessibilityLabel} from '../../../src/uis/Discover/accessibility';

jest.mock('kstyled', () => ({
  css: jest.requireActual('kstyled').css,
}));

jest.mock('cpk-ui', () => ({
  useCPK: () => ({
    theme: {
      role: {primary: '#2563eb'},
      text: {
        basic: '#111111',
        placeholder: '#999999',
      },
    },
  }),
}));

jest.mock('../../../src/STRINGS', () => ({
  t: (key: string) => {
    const strings: Record<string, string> = {
      'discover.myRadar': 'My Knowledge Radar',
    };

    return strings[key] ?? key;
  },
}));

jest.mock('react-native-svg', () => {
  const React = jest.requireActual('react');
  const {Text, View} = jest.requireActual('react-native');

  const Svg = ({children, ...props}: any) =>
    React.createElement(View, props, children);
  const Shape = ({children, ...props}: any) =>
    React.createElement(View, props, children);
  const SvgText = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    __esModule: true,
    default: Svg,
    Circle: Shape,
    Line: Shape,
    Polygon: Shape,
    Text: SvgText,
  };
});

describe('Discover RadarChart accessibility', () => {
  const stats = [
    {categoryName: 'BASIC_SCIENCE', localizedName: 'Science', winRate: 82.4},
    {categoryName: 'WORLD_HISTORY', localizedName: 'History', winRate: 61.2},
    {categoryName: 'ART', localizedName: 'Art', winRate: 39.6},
  ];

  it('announces the visual radar chart as one image summary', async () => {
    const {getByLabelText} = await render(<RadarChart stats={stats} />);

    const chart = getByLabelText(
      'My Knowledge Radar, Science 82%, History 61%, Art 40%',
    );

    expect(chart.props.accessibilityRole).toBe('image');
  });

  it('announces only the rendered capped category set', async () => {
    const manyStats = Array.from({length: 10}, (_, index) => ({
      categoryName: `CATEGORY_${index}`,
      localizedName: `Category ${index}`,
      winRate: index * 10,
    }));

    const {getByLabelText, queryByLabelText} = await render(
      <RadarChart stats={manyStats} />,
    );

    expect(
      getByLabelText(
        'My Knowledge Radar, Category 9 90%, Category 8 80%, Category 7 70%, Category 6 60%, Category 3 30%, Category 2 20%, Category 1 10%, Category 0 0%',
      ),
    ).toBeTruthy();
    expect(
      queryByLabelText(
        'My Knowledge Radar, Category 9 90%, Category 8 80%, Category 7 70%, Category 6 60%, Category 5 50%, Category 4 40%, Category 3 30%, Category 2 20%, Category 1 10%, Category 0 0%',
      ),
    ).toBeNull();
  });

  it('skips missing labels and defaults invalid rates in summaries', () => {
    expect(
      createRadarAccessibilityLabel({
        stats: [
          {localizedName: ' Science ', winRate: Number.NaN},
          {localizedName: null, winRate: 72},
          {localizedName: 'History', winRate: null},
        ],
        title: 'My Knowledge Radar',
      }),
    ).toBe('My Knowledge Radar, Science 0%, History 0%');
  });
});
