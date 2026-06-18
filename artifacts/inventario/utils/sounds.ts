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

export const Sounds = {
  crear() {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      chord([523.25, 659.25, 783.99], 0.45, 0.09);
    }
  },

  tap() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      tone(880, 0.08, "sine", 0.06);
    }
  },

  avanzar() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      tone(659.25, 0.12, "sine", 0.1);
      setTimeout(() => tone(783.99, 0.18, "sine", 0.1), 80);
    }
  },

  retroceder() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      tone(523.25, 0.12, "sine", 0.1);
      setTimeout(() => tone(440, 0.18, "sine", 0.08), 80);
    }
  },

  eliminar() {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      tone(330, 0.08, "sine", 0.12);
      setTimeout(() => tone(261.63, 0.25, "sine", 0.06), 70);
    }
  },

  abrir() {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    } else {
      tone(698.46, 0.1, "sine", 0.08, 0);
    }
  },

  backup() {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      chord([523.25, 659.25, 783.99, 1046.5], 0.5, 0.07);
    }
  },
};
