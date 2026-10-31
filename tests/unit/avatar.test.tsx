import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Avatar } from "@/components/avatar/Avatar";
import { AvatarImage } from "@/components/avatar/AvatarImage";
import type { AvatarPreset } from "@/components/avatar/presets";

afterEach(cleanup);

const base: AvatarPreset = { hair: "a", hairColor: "#3A2A4D", skin: "#FFD9B8", bg: "#D9D3FF" };
const op = (c: HTMLElement, part: string) =>
  c.querySelector(`[data-part="${part}"]`)?.getAttribute("opacity");

describe("Avatar", () => {
  it("hair b shows side hair only", () => {
    const { container } = render(<Avatar preset={{ ...base, hair: "b" }} size={64} />);
    expect(op(container, "pigtails")).toBe("1");
    expect(op(container, "tuft")).toBe("0");
    expect(op(container, "bob")).toBe("0");
    expect(op(container, "crown")).toBe("0");
  });
  it("hair a shows tuft, hair c shows bob", () => {
    const a = render(<Avatar preset={base} size={64} />);
    expect(op(a.container, "tuft")).toBe("1");
    const c = render(<Avatar preset={{ ...base, hair: "c" }} size={64} />);
    expect(op(c.container, "bob")).toBe("1");
  });
  it("crown shows crown", () => {
    const { container } = render(<Avatar preset={base} size={64} crown />);
    expect(op(container, "crown")).toBe("1");
  });
  it("two instances have no duplicate ids and valid url refs", () => {
    const { container } = render(
      <>
        <Avatar preset={base} size={32} />
        <Avatar preset={base} size={32} />
      </>,
    );
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((i) => /^[A-Za-z0-9_-]+$/.test(i))).toBe(true);
  });
});

describe("AvatarImage", () => {
  it("null renders default preset with role img", () => {
    const { getAllByRole } = render(<AvatarImage avatar={null} size={40} />);
    expect(getAllByRole("img").length).toBeGreaterThan(0);
  });
  it("upload renders a round image", () => {
    const { getByRole } = render(<AvatarImage avatar={{ kind: "upload", url: "/a.png" }} size={40} />);
    expect(getByRole("img").className).toContain("rounded-full");
  });
});
