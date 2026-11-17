import {AppRegistry} from '@amazon-devices/react-native-kepler';

import {name as appName} from './app.json';
import {App} from './src/App';

AppRegistry.registerComponent(appName, () => App);
