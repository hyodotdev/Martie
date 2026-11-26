// MMKV 4 runs on Nitro, which has no native module under Jest. This keeps the
// API in memory so code that imports storage can still load.
import {useCallback, useState} from 'react';

type Value = boolean | string | number | ArrayBuffer;

export const createMMKV = () => {
  const values = new Map<string, Value>();
  return {
    set: (key: string, value: Value) => void values.set(key, value),
    getString: (key: string) => {
      const value = values.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getNumber: (key: string) => {
      const value = values.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    getBoolean: (key: string) => {
      const value = values.get(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    getBuffer: (key: string) => {
      const value = values.get(key);
      return value instanceof ArrayBuffer ? value : undefined;
    },
    contains: (key: string) => values.has(key),
    remove: (key: string) => values.delete(key),
    getAllKeys: () => [...values.keys()],
    clearAll: () => values.clear(),
    addOnValueChangedListener: () => ({remove: () => undefined}),
  };
};

const useMockValue = <T>(initial?: T) => {
  const [value, setValue] = useState<T | undefined>(initial);
  const set = useCallback((next: T | undefined) => setValue(next), []);
  return [value, set] as const;
};

export const useMMKV = () => createMMKV();
export const useMMKVString = () => useMockValue<string>();
export const useMMKVNumber = () => useMockValue<number>();
export const useMMKVBoolean = () => useMockValue<boolean>();
export const useMMKVObject = () => useMockValue<unknown>();
export const useMMKVBuffer = () => useMockValue<ArrayBuffer>();
export const useMMKVListener = () => undefined;
export const useMMKVKeys = () => [];
export const existsMMKV = () => false;
export const deleteMMKV = () => true;
