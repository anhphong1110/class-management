export type AvatarPreset = {
  hair: "a" | "b" | "c";
  hairColor: string;
  skin: string;
  bg: string;
};

export const DEFAULT_AVATAR_PRESET: AvatarPreset = {
  hair: "a",
  hairColor: "#3A2A4D",
  skin: "#FFD9B8",
  bg: "#D9D3FF",
};
