import {useState, useCallback, useEffect} from 'react';
import {getLocales} from 'expo-localization';
import {storage, Storage} from '../utils/storage';
import {i18n} from '../STRINGS';

type SupportedLocale = 'ko' | 'en' | 'ja' | 'de' | 'es' | 'fr' | 'th' | 'tw' | 'vi';

const SUPPORTED_LOCALES: SupportedLocale[] = ['ko', 'en', 'ja', 'de', 'es', 'fr', 'th', 'tw', 'vi'];

// Global state for locale changes
let localeListeners: ((locale: SupportedLocale) => void)[] = [];

const getDeviceLocale = (): SupportedLocale => {
  const deviceLocales = getLocales();
  const deviceLanguage = deviceLocales[0]?.languageCode as SupportedLocale;

  return SUPPORTED_LOCALES.includes(deviceLanguage) ? deviceLanguage : 'en';
};

export const useLocale = () => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const storedLocale = storage.getString(Storage.Locale) as SupportedLocale;
    return storedLocale || getDeviceLocale();
  });

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    storage.set(Storage.Locale, newLocale);
    setLocaleState(newLocale);

    // Update i18n locale immediately
    i18n.locale = newLocale;

    // Notify all listeners about the locale change
    localeListeners.forEach((listener) => listener(newLocale));
  }, []);

  const resetToDeviceLocale = useCallback(() => {
    storage.delete(Storage.Locale);
    const deviceLocale = getDeviceLocale();
    setLocaleState(deviceLocale);

    // Update i18n locale
    i18n.locale = deviceLocale;

    // Notify all listeners
    localeListeners.forEach((listener) => listener(deviceLocale));
  }, []);

  const getCurrentLocale = useCallback((): SupportedLocale => {
    const storedLocale = storage.getString(Storage.Locale) as SupportedLocale;
    return storedLocale || getDeviceLocale();
  }, []);

  // Subscribe to locale changes
  useEffect(() => {
    const listener = (newLocale: SupportedLocale) => {
      setLocaleState(newLocale);
    };

    localeListeners.push(listener);

    return () => {
      localeListeners = localeListeners.filter((l) => l !== listener);
    };
  }, []);

  useEffect(() => {
    // Initialize locale on app start
    const currentLocale = getCurrentLocale();
    if (currentLocale !== locale) {
      setLocaleState(currentLocale);
      i18n.locale = currentLocale;
    }
  }, [getCurrentLocale, locale]);

  return {
    locale,
    setLocale,
    resetToDeviceLocale,
    supportedLocales: SUPPORTED_LOCALES,
    getCurrentLocale,
  };
};
