import 'kstyled';
import type {CustomAppTheme} from './theme';
import {CpkTheme} from 'cpk-ui/utils/theme';

type AllTheme = CustomAppTheme & CpkTheme;

declare module 'kstyled' {
  export interface DefaultTheme extends AllTheme {}
}

declare module 'cpk-ui' {
  export interface CpkTheme extends AllTheme {}
}
