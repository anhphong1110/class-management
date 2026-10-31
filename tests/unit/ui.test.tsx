import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import { Toggle } from "@/components/ui/Toggle";

afterEach(cleanup);

describe("Button", () => {
  it("has min height 44px class", () => {
    render(<Button>Lưu</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-11");
  });
});

describe("Toggle", () => {
  it("calls onChange with the negated value", () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Cho phép" />);
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("Toggle disabled", () => {
  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Cho phép" disabled />);
    const sw = screen.getByRole("switch") as HTMLButtonElement;
    expect(sw.disabled).toBe(true);
    expect(sw.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Toggle row", () => {
  it("clicking the label toggles, checked sets aria-checked, row is >= 44px", () => {
    const onChange = vi.fn();
    render(<Toggle checked onChange={onChange} label="Cho phép" hint="Gợi ý" />);
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
