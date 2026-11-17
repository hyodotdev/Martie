import type {StyleProp, ViewStyle} from 'react-native';
import {View} from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export default function BannerAd({style}: Props): JSX.Element {
  return <View style={style} />;
}
