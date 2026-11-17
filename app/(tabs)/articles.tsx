import React from 'react';
import {Stack} from 'expo-router';
import {styled} from 'kstyled';
import TabDiscoverMobile from '../_Tabs/TabArticle/TabDiscoverMobile';
import DiscoverHeader from '../_Tabs/components/DiscoverHeader';

export default function Articles(): JSX.Element {
  return (
    <Container>
      <Stack.Screen options={{header: () => <DiscoverHeader />}} />
      <TabDiscoverMobile />
    </Container>
  );
}

const Container = styled.View`
  background-color: ${({theme}) => theme.bg.basic};
  flex: 1;
  align-self: stretch;
`;
