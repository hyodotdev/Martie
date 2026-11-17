import RNWebView from 'react-native-webview';
import {Stack, useLocalSearchParams} from 'expo-router';
import {useCPK} from 'cpk-ui';
import {styled} from 'kstyled';

function WebView(): JSX.Element {
  const {uri, title} = useLocalSearchParams();
  const {theme} = useCPK();

  return (
    <Container>
      <Stack.Screen
        options={{
          title: (title as string) || '',
          headerShown: true,
        }}
      />
      <RNWebView
        containerStyle={{
          backgroundColor: theme.bg.basic,
        }}
        source={{uri: uri as string}}
      />
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
`;

export default WebView;
