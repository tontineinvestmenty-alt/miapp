import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type AudioContextType = typeof AudioContext;

let ctx: InstanceType<AudioContextType> | null = null;

function getCtx(): InstanceType<AudioContextType> | null {
  if (Platform.OS !== "web") return null;
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gainVal = 0.18,
  fadeStart = 0.05
) {
  const context = getCtx();
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.connect(gain);
  gain.connect(context.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(gainVal, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  osc.start(context.currentTime + fadeStart);
  osc.stop(context.currentTime + duration + fadeStart);
}

function chord(freqs: number[], duration: number, gainVal = 0.1) {
  freqs.forEach((f) => tone(f, duration, "sine", gainVal));
}

// ── Custom sounds (user-provided files) ───────────────────────────────
export type SoundEffect =
  | "crear"
  | "tap"
  | "avanzar"
  | "retroceder"
  | "eliminar"
  | "abrir"
  | "backup";

export type CustomSoundMap = Partial<Record<SoundEffect, string>>;

let customMap: CustomSoundMap = {};

export function setCustomSoundMap(map: CustomSoundMap) {
  customMap = map ?? {};
}

// Lazily-loaded native audio module (expo-audio), web uses HTMLAudioElement.
type NativePlayer = { seekTo: (s: number) => void; play: () => void; remove: () => void };
let nativeAudio: { createAudioPlayer: (src: { uri: string }) => NativePlayer } | null = null;
const nativePlayers: Record<string, NativePlayer> = {};

// Attempts to play a custom audio file. Returns true only if playback was
// successfully initiated; on synchronous failure returns false, and on async
// failure (web) it invokes `onFail` so the default sound can still play.
function playUri(uri: string, onFail: () => void): boolean {
  try {
    if (Platform.OS === "web") {
      if (typeof Audio === "undefined") return false;
      const a = new Audio(uri);
      a.volume = 0.8;
      let failed = false;
      const fail = () => {
        if (failed) return;
        failed = true;
        onFail();
      };
      a.onerror = fail;
      void a.play().catch(fail);
      return true;
    }
    if (!nativeAudio) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      nativeAudio = require("expo-audio");
    }
    if (!nativeAudio) return false;
    let player = nativePlayers[uri];
    if (!player) {
      player = nativeAudio.createAudioPlayer({ uri });
      nativePlayers[uri] = player;
    }
    try {
      player.seekTo(0);
    } catch {
      // some players cannot seek before first play; ignore
    }
    player.play();
    return true;
  } catch {
    return false;
  }
}

// Plays the custom sound for an effect if one is set, falling back to `def`
// when none is set or when custom playback fails.
function withCustom(effect: SoundEffect, def: () => void) {
  const uri = customMap[effect];
  if (!uri) {
    def();
    return;
  }
  if (!playUri(uri, def)) def();
}

export const Sounds = {
  crear() {
    withCustom("crear", () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        chord([523.25, 659.25, 783.99], 0.45, 0.09);
      }
    });
  },

  tap() {
    withCustom("tap", () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        tone(880, 0.08, "sine", 0.06);
      }
    });
  },

  avanzar() {
    withCustom("avanzar", () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        tone(659.25, 0.12, "sine", 0.1);
        setTimeout(() => tone(783.99, 0.18, "sine", 0.1), 80);
      }
    });
  },

  retroceder() {
    withCustom("retroceder", () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        tone(523.25, 0.12, "sine", 0.1);
        setTimeout(() => tone(440, 0.18, "sine", 0.08), 80);
      }
    });
  },

  eliminar() {
    withCustom("eliminar", () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        tone(330, 0.08, "sine", 0.12);
        setTimeout(() => tone(261.63, 0.25, "sine", 0.06), 70);
      }
    });
  },

  abrir() {
    withCustom("abrir", () => {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      } else {
        tone(698.46, 0.1, "sine", 0.08, 0);
      }
    });
  },

  backup() {
    withCustom("backup", () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        chord([523.25, 659.25, 783.99, 1046.5], 0.5, 0.07);
      }
    });
  },
};
