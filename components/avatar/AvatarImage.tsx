import { Avatar } from "./Avatar";
import { DEFAULT_AVATAR_PRESET, type AvatarPreset } from "./presets";

export type AvatarValue =
  | { kind: "preset"; preset: AvatarPreset }
  | { kind: "upload"; url: string }
  | null;

export function AvatarImage({ avatar, size }: { avatar: AvatarValue; size: number }) {
  if (avatar?.kind === "upload") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar.url}
        alt="Ảnh đại diện"
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <Avatar preset={avatar?.preset ?? DEFAULT_AVATAR_PRESET} size={size} />;
}
