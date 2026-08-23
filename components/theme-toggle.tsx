"use client";

import { useCallback, useEffect, useState } from "react";

import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui";
import { cx } from "@/lib/cx";

const STORAGE_KEY = "sih2026.theme";
const ORDER = ["system", "light", "dark"] as const;
type Choice = (typeof ORDER)[number];

const LABEL: Record<Choice, string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

function isChoice(value: unknown): value is Choice {
  return (ORDER as readonly unknown[]).includes(value);
}

function apply(choice: Choice) {
  const root = document.documentElement;
  // "system" is the absence of the attribute — the stylesheet already resolves
  // it through prefers-color-scheme, so nothing has to be computed here.
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

/**
 * Three-way theme control: system → light → dark.
 *
 * The original viewer only toggled between light and dark and forgot the choice
 * on reload; this remembers it and keeps "follow the OS" as a first-class
 * option. The matching pre-paint script lives in app/layout.tsx.
 */
export function ThemeToggle({ className }: { className?: string }) {
  // Starts at "system" so the server and the first client render agree; the
  // stored choice is adopted immediately after mount.
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — stay on "system".
    }
    if (isChoice(stored)) setChoice(stored);
  }, []);

  const cycle = useCallback(() => {
    setChoice((prev) => {
      const next = ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length] ?? "system";
      apply(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Preference just won't survive this session.
      }
      return next;
    });
  }, []);

  const Icon =
    choice === "light" ? SunIcon : choice === "dark" ? MoonIcon : MonitorIcon;

  return (
    <button
      type="button"
      onClick={cycle}
      className={cx(buttonClass, "w-9 px-0", className)}
      title={`Theme: ${LABEL[choice]} — click to change`}
      aria-label={`Colour theme: ${LABEL[choice]}. Activate to change.`}
    >
      <Icon className="size-4" />
    </button>
  );
}
