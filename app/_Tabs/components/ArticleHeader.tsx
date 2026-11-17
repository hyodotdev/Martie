import React from 'react';
import {Typography, useCPK} from 'cpk-ui';
import {css} from 'kstyled';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {t} from '../../../src/STRINGS';

export default function ArticleHeader(): JSX.Element {
  const {top} = useSafeAreaInsets();
  const {theme} = useCPK();

  return (
    <View
      style={css`
        padding: ${top + 'px'} 16px 0;
        background-color: ${theme.bg.basic};
        height: ${68 + top + 'px'};
        flex-direction: row;
        align-items: center;
      `}
    >
      <Typography.Heading3
        accessibilityRole="header"
        style={css`
          color: ${theme.text.basic};
          margin-left: 14px;
        `}
      >
        {t('article.title')}
      </Typography.Heading3>
    </View>
  );
}
