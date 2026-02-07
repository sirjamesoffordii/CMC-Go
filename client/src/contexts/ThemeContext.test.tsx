// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeContext";

function ThemeConsumer() {
  const { theme, toggleTheme, switchable } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="switchable">{String(switchable)}</span>
      {toggleTheme ? (
        <button type="button" onClick={toggleTheme}>
          Toggle
        </button>
      ) : null}
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    cleanup();
  });

  it("provides default theme and updates document class", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("loads stored theme and toggles when switchable", async () => {
    localStorage.setItem("theme", "dark");
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light" switchable>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Toggle" }));

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("throws if used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within ThemeProvider"
    );

    consoleSpy.mockRestore();
  });
});
