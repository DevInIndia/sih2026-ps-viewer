import Link from "next/link";

import { buttonClass } from "@/components/ui";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="font-mono text-[2.4rem] font-semibold text-rule">
          404
        </span>
        <h1 className="text-[1.15rem] font-bold">
          That problem statement is not in this dataset.
        </h1>
        <p className="max-w-[42ch] text-[0.86rem] text-ink-3">
          The link may be for a different edition of the hackathon, or the
          statement may have been added to sih.gov.in after this snapshot was
          taken.
        </p>
        <Link href="/" className={buttonClass}>
          Back to all statements
        </Link>
      </div>
    </main>
  );
}
