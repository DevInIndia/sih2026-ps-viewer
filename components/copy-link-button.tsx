"use client";

import { useEffect, useState } from "react";

import { CopyButton } from "@/components/copy-button";

/**
 * "Copy link" for a statement.
 *
 * The absolute URL is only known in the browser, so it is filled in after
 * mount; until then the button copies the path, which still resolves.
 */
export function CopyLinkButton({ ps }: { ps: string }) {
  const path = `/ps/${encodeURIComponent(ps)}`;
  const [href, setHref] = useState(path);

  useEffect(() => {
    setHref(`${window.location.origin}${path}`);
  }, [path]);

  return <CopyButton value={href} label="Copy link" />;
}
