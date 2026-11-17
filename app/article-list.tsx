import React from 'react';
import {Stack} from 'expo-router';
import {styled} from 'kstyled';
import TabArticleMobile from './_Tabs/TabArticle/TabArticleMobile';
import {t} from '../src/STRINGS';

export default function ArticleList(): JSX.Element {
  return (
    <Container>
      <Stack.Screen options={{title: t('discover.allArticles')}} />
      <TabArticleMobile />
    </Container>
  );
}

const Container = styled.View`
  background-color: ${({theme}) => theme.bg.basic};
  flex: 1;
  align-self: stretch;
`;
