import { Platform } from "react-native";

// Web-safe glow helpers: react-native-web deprecated shadow*/textShadow* style
// props in favor of CSS boxShadow/textShadow strings. Native keeps the classic
// shadow props so iOS/Android rendering is unchanged.

const hexToRgba = (color: string, alpha: number): string => {
  if (!color.startsWith("#")) return color;
  const h = color.slice(1);
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

export const glow = (color: string, radius: number, opacity: number, offsetY = 0) =>
  Platform.OS === "web"
    ? ({ boxShadow: `0 ${offsetY}px ${radius}px ${hexToRgba(color, opacity)}` } as const)
    : ({ shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: offsetY } } as const);

export const textGlow = (color: string, radius: number) =>
  Platform.OS === "web"
    ? ({ textShadow: `0 0 ${radius}px ${color}` } as never)
    : ({ textShadowColor: color, textShadowRadius: radius } as const);
