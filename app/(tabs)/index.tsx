/**
 * @name Index
 *
 * 홈 화면 메인 컴포넌트
 */
import React from 'react';
import {useCPK} from 'cpk-ui';
import {Stack} from 'expo-router';
import {styled} from 'kstyled';
import TabIndexMobile from '../_Tabs/TabIndex/TabIndexMobile';
import TabIndexTablet from '../_Tabs/TabIndex/TabIndexTablet';
import CustomHeader from '../_Tabs/components/CustomHeader';

export default function Index(): JSX.Element {
  const {
    media: {isTablet},
  } = useCPK();

  return (
    <Container>
      <Stack.Screen options={{header: () => <CustomHeader />}} />
      {isTablet ? <TabIndexTablet /> : <TabIndexMobile />}
    </Container>
  );
}

const Container = styled.View`
  background-color: ${({theme}) => theme.bg.basic};
  flex: 1;
  align-self: stretch;
`;
