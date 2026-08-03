import type { JsonObject } from "./salon-domain";

export const DEFAULT_VISUAL_TOKENS = {
  backgroundColor: "#f7f5f0",
  foregroundColor: "#202124",
  brandColor: "#5c344f",
  sidebarColor: "#2b2028",
} as const;

export type VisualTokens = { [Key in keyof typeof DEFAULT_VISUAL_TOKENS]: string };

const color = /^#[0-9a-f]{6}$/i;

export function resolveVisualTokens(settings: JsonObject): VisualTokens {
  return Object.fromEntries(Object.entries(DEFAULT_VISUAL_TOKENS).map(([key, fallback]) => {
    const value = settings[key];
    return [key, typeof value === "string" && color.test(value) ? value.toLowerCase() : fallback];
  })) as VisualTokens;
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(left: string, right: string) {
  const [light, dark] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

export function validateVisualTokenContrast(tokens: VisualTokens) {
  if (
    contrast(tokens.backgroundColor, tokens.foregroundColor) < 4.5
    || contrast(tokens.brandColor, "#ffffff") < 4.5
    || contrast(tokens.sidebarColor, "#ffffff") < 4.5
  ) throw new Error("색상 대비는 배경·글자와 흰색 기준 4.5:1 이상이어야 합니다.");
}
