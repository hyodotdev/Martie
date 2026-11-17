import type {ComponentProps} from 'react';
import type {Icon} from 'cpk-ui';
import * as Localization from 'expo-localization';
import {storage, Storage} from './utils/storage';

import en from '../assets/langs/en.json';
import ko from '../assets/langs/ko.json';
import ja from '../assets/langs/ja.json';
import de from '../assets/langs/de.json';
import es from '../assets/langs/es.json';
import fr from '../assets/langs/fr.json';
import th from '../assets/langs/th.json';
import tw from '../assets/langs/tw.json';
import vi from '../assets/langs/vi.json';

// import {I18n} from 'i18n-js';
// ad-hoc: https://github.com/fnando/i18n/issues/26#issuecomment-1225775247
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {I18n} = require('i18n-js/dist/require/index');
const i18n = new I18n({en, ko, ja, de, es, fr, th, tw, vi});

i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Check for stored locale first, then fall back to device locale
const getInitialLocale = (): string => {
  const storedLocale = storage.getString(Storage.Locale);
  if (storedLocale) {
    return storedLocale;
  }
  return Localization.getLocales()[0].languageCode || 'en';
};

i18n.locale = getInitialLocale();

export const getLocale = (): 'en' | 'ko' | 'ja' | 'de' | 'es' | 'fr' | 'th' | 'tw' | 'vi' => i18n.locale.slice(0, 2);

export const capitalize = (
  str: string,
): ComponentProps<typeof Icon>['name'] => {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as ComponentProps<
    typeof Icon
  >['name'];
};

type NestedKeys<T> = T extends object
  ? {
      [K in keyof T]: K extends string | number
        ? `${K}` | (T[K] extends object ? `${K}.${NestedKeys<T[K]>}` : never)
        : never;
    }[keyof T]
  : '';

export const t = (
  param: NestedKeys<typeof en>,
  mapObj?: object,
  locale?: string,
): string => {
  const currentLocale = i18n.locale;

  if (locale) i18n.locale = locale;

  const translation = i18n.t(param, mapObj);
  i18n.locale = currentLocale;

  return translation;
};

// Export i18n instance for external use
export {i18n};
