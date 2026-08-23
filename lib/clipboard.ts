/**
 * Copy text to the clipboard, degrading safely.
 *
 * `navigator.clipboard` only exists in a secure context and can still reject
 * when the document is not focused or the user denied permission, so a
 * best-effort `execCommand` path stays behind it. Everything is wrapped: a
 * failed copy must never take a click handler down with it.
 */
export async function copyText(value: string): Promise<boolean> {
  if (typeof window === "undefined" || !value) return false;

  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Hand the user a generated file (shortlist export).
 *
 * The blob URL is revoked on the next tick so the object does not sit in memory
 * for the life of the tab.
 */
export function downloadBlob(filename: string, mime: string, contents: string) {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    // Sanitised here as well as at the call site: this value ends up as a
    // filesystem name on the user's machine.
    anchor.download = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Nothing sensible to do — the browser blocked the download.
  }
}
