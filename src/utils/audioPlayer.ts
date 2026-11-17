import type {AudioPlayer} from 'expo-audio';

export const safePlayAudioPlayer = (player: AudioPlayer): void => {
  try {
    player.play();
  } catch {
    // Expo Audio can release native shared objects before JS cleanup runs.
  }
};

export const safePauseAudioPlayer = (player: AudioPlayer): void => {
  try {
    player.pause();
  } catch {
    // Ignore stale native player references during navigation teardown.
  }
};

export const safeSeekAudioPlayerToStart = (player: AudioPlayer): void => {
  try {
    void player.seekTo(0).catch(() => {});
  } catch {
    // Ignore stale native player references during navigation teardown.
  }
};

export const safeSetAudioPlayerLoop = (
  player: AudioPlayer,
  loop: boolean,
): void => {
  try {
    player.loop = loop;
  } catch {
    // Ignore stale native player references during navigation teardown.
  }
};

export const safeSetAudioPlayerVolume = (
  player: AudioPlayer,
  volume: number,
): void => {
  try {
    player.volume = volume;
  } catch {
    // Ignore stale native player references during navigation teardown.
  }
};

export const safeIsAudioPlayerPlaying = (player: AudioPlayer): boolean => {
  try {
    return player.playing;
  } catch {
    return false;
  }
};

export const stopAudioPlayer = (player: AudioPlayer): void => {
  safeSetAudioPlayerLoop(player, false);
  safePauseAudioPlayer(player);
  safeSeekAudioPlayerToStart(player);
};
