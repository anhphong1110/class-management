import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { ICONS } from "@/components/ui/Icon";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

afterEach(cleanup);

describe("Button loading", () => {
  it("disables, sets aria-busy and ignores clicks while loading", () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Lưu</Button>);
    const b = screen.getByRole("button") as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    expect(b.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });
  it("is idle by default", () => {
    render(<Button>Lưu</Button>);
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBeNull();
  });
});

describe("ButtonLink", () => {
  it("renders a link with the button size classes", () => {
    render(<ButtonLink href="/em" size="lg">Đi</ButtonLink>);
    const a = screen.getByRole("link", { name: "Đi" });
    expect(a.getAttribute("href")).toBe("/em");
    expect(a.className).toContain("min-h-[52px]");
  });
});

describe("IconButton", () => {
  it("exposes its label as the accessible name", () => {
    render(<IconButton label="Đóng" icon={ICONS.x} />);
    expect(screen.getByRole("button", { name: "Đóng" })).toBeTruthy();
  });
});

describe("SegmentedTabs", () => {
  const items = [
    { key: "a", label: "Một" },
    { key: "b", label: "Hai" },
    { key: "c", label: "Ba" },
  ] as const;
  it("marks the selected tab and moves with arrow keys, wrapping around", () => {
    const onChange = vi.fn();
    render(<SegmentedTabs items={items} value="a" onChange={onChange} label="Loại" idPrefix="t" />);
    expect(screen.getByRole("tab", { name: "Một" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Hai" }).tabIndex).toBe(-1);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Một" }), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("c");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Một" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("b");
    fireEvent.click(screen.getByRole("tab", { name: "Ba" }));
    expect(onChange).toHaveBeenLastCalledWith("c");
  });
});
