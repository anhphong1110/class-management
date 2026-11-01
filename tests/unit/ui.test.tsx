import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import { Switch } from "@/components/ui/Switch";

afterEach(cleanup);

describe("Button", () => {
  it("has min height 44px class", () => {
    render(<Button>Lưu</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-11");
  });
});

describe("Switch", () => {
  it("calls onChange with the negated value", () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Cho phép" />);
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("Switch size and colours", () => {
  it("track is 46x27, strong when on and lavender when off", () => {
    const { rerender } = render(<Switch checked onChange={() => {}} label="A" />);
    const track = () => screen.getByRole("switch").querySelector("[aria-hidden]") as HTMLElement;
    expect(track().className).toContain("w-[46px]");
    expect(track().className).toContain("h-[27px]");
    expect(track().className).toContain("bg-primary-strong");
    rerender(<Switch checked={false} onChange={() => {}} label="A" />);
    expect(track().className).toContain("bg-[#B9B5E8]");
  });
});

describe("Switch disabled", () => {
  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Cho phép" disabled />);
    const sw = screen.getByRole("switch") as HTMLButtonElement;
    expect(sw.disabled).toBe(true);
    expect(sw.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Switch row", () => {
  it("clicking the label toggles, checked sets aria-checked, row is >= 44px", () => {
    const onChange = vi.fn();
    render(<Switch checked onChange={onChange} label="Cho phép" hint="Gợi ý" />);
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(sw.className).toContain("min-h-[50px]");
    fireEvent.click(screen.getByText("Cho phép"));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(<Modal open={false} onClose={() => {}} title="T">x</Modal>);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("is an accessible dialog and Esc closes", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Tiêu đề"><button>Một</button></Modal>);
    const d = screen.getByRole("dialog");
    expect(d.getAttribute("aria-modal")).toBe("true");
    expect(d.getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.getElementById(d.getAttribute("aria-labelledby")!)?.textContent).toBe("Tiêu đề");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
  it("moves focus in, traps Tab, restores focus", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { rerender } = render(
      <Modal open onClose={() => {}} title="T"><button>A</button><button>B</button></Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    const btns = dialog.querySelectorAll("button");
    const last = btns[btns.length - 1] as HTMLElement;
    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(dialog.querySelector("button"));
    (dialog.querySelector("button") as HTMLElement).focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    rerender(<Modal open={false} onClose={() => {}} title="T">x</Modal>);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
  it("locks body scroll, restoring the previous value on close", () => {
    document.body.style.overflow = "scroll";
    const { rerender } = render(<Modal open onClose={() => {}} title="T">x</Modal>);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Modal open={false} onClose={() => {}} title="T">x</Modal>);
    expect(document.body.style.overflow).toBe("scroll");
    document.body.style.overflow = "";
  });
  it("renders through a portal outside the render container and inerts siblings", () => {
    const { container, rerender } = render(<Modal open onClose={() => {}} title="T">x</Modal>);
    const dialog = screen.getByRole("dialog");
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
    const portalNode = Array.from(document.body.children).find((c) => c.contains(dialog))!;
    expect(portalNode.hasAttribute("inert")).toBe(false);
    expect(container.hasAttribute("inert")).toBe(true);
    rerender(<Modal open={false} onClose={() => {}} title="T">x</Modal>);
    expect(container.hasAttribute("inert")).toBe(false);
  });
  it("Esc closes only the topmost of stacked modals while the lock stays on", () => {
    const a = vi.fn();
    const b = vi.fn();
    const { container } = render(
      <>
        <Modal open onClose={a} title="A"><button>a</button></Modal>
        <Modal open onClose={b} title="B"><button>b</button></Modal>
      </>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");
    expect(container.hasAttribute("inert")).toBe(true);
  });
  const M = (o: { open: boolean; onClose?: () => void; t: string }) => (
    <Modal open={o.open} onClose={o.onClose ?? (() => {})} title={o.t}><button>{o.t}</button></Modal>
  );
  const overlayOf = (t: string) =>
    screen.getByRole("dialog", { name: t }).parentElement as HTMLElement;
  const inertCount = () => document.querySelectorAll("body > [inert]").length;

  it("stacked: only the top overlay is interactive; closing top re-enables the one below", () => {
    const a = vi.fn();
    const b = vi.fn();
    const { rerender } = render(<><M open t="A" onClose={a} /><M open t="B" onClose={b} /></>);
    expect(overlayOf("A").hasAttribute("inert")).toBe(true);
    expect(overlayOf("B").hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<><M open t="A" onClose={a} /><M open={false} t="B" onClose={b} /></>);
    expect(overlayOf("A").hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    rerender(<><M open={false} t="A" onClose={a} /><M open={false} t="B" onClose={b} /></>);
    expect(document.body.style.overflow).toBe("");
    expect(inertCount()).toBe(0);
  });
  it("out-of-order close: closing the lower modal first leaves the top usable", () => {
    const { rerender } = render(<><M open t="A" /><M open t="B" /></>);
    rerender(<><M open={false} t="A" /><M open t="B" /></>);
    expect(overlayOf("B").hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("hidden");
    expect(inertCount()).toBeGreaterThan(0);
    rerender(<><M open={false} t="A" /><M open={false} t="B" /></>);
    expect(document.body.style.overflow).toBe("");
    expect(inertCount()).toBe(0);
  });
  it("unmounting while open restores overflow and inert", () => {
    const { unmount } = render(<M open t="A" />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(inertCount()).toBe(0);
  });
  it("keeps focus inside a dialog with no focusable children on Tab", () => {
    render(<Modal open onClose={() => {}} title="T"><p>chỉ chữ</p></Modal>);
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(dialog);
  });
});

describe("Notice", () => {
  it("renders by tone", () => {
    render(<Notice tone="error">Lỗi</Notice>);
    expect(screen.getByRole("alert").textContent).toBe("Lỗi");
  });
  it("success uses status role", () => {
    render(<Notice tone="success">Xong</Notice>);
    expect(screen.getByRole("status").textContent).toBe("Xong");
  });
});
