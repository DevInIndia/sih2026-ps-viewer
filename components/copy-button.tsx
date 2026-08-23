"use client";

import { useEffect, useRef, useState } from "react";

import { CheckIcon, CopyIcon, XIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import { cx } from "@/lib/cx";

type State = "idle" | "done" | "failed";

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  async function onClick() {
    const ok = await copyText(value);
    setState(ok ? "done" : "failed");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  }

  const Icon = state === "done" ? CheckIcon : state === "failed" ? XIcon : CopyIcon;

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={cx(
        buttonClass,
        state === "done" && "border-good text-good",
        className,
      )}
    >
      <Icon className="size-3.5" />
      {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : label}
      {/* Announced without stealing focus. */}
      <span aria-live="polite" className="sr-only">
        {state === "done" ? `${value} copied to clipboard` : ""}
      </span>
    </button>
  );
}
