import { DatabaseIcon } from "@/components/icons";
import { SUMMARY } from "@/lib/records";

export default function WorkspaceHome() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <DatabaseIcon className="size-9 text-rule" />
      <p className="max-w-[38ch] text-[0.88rem] text-ink-3">
        Pick a statement from the list to read its full brief, dataset links and
        submission details.
      </p>
      <p className="max-w-[42ch] text-[0.78rem] text-ink-3/80">
        {SUMMARY.total} statements from {SUMMARY.organisations} organisations
        across {SUMMARY.themes} themes, captured on {SUMMARY.capturedAt}.
      </p>
      <p className="mt-2 font-mono text-[0.68rem] tracking-[0.08em] text-ink-3/70 uppercase">
        Press{" "}
        <kbd className="rounded border border-rule px-1 py-0.5">/</kbd> to
        search ·{" "}
        <kbd className="rounded border border-rule px-1 py-0.5">?</kbd> for
        shortcuts
      </p>
    </div>
  );
}
