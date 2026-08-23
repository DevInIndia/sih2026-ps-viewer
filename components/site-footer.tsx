import {
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
} from "@/components/icons";
import { AUTHOR, PORTAL_URL } from "@/lib/author";

/**
 * Slim credit bar pinned below the workspace.
 *
 * The `mailto:` is built from the address in `lib/author.ts` rather than typed
 * inline, so there is one place to change it.
 */
export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule bg-surface px-4 py-2 text-[0.74rem] text-ink-3">
      <span className="mr-auto">
        Built by{" "}
        <span className="font-medium text-ink-2">{AUTHOR.name}</span>
      </span>

      <nav
        aria-label="Author links"
        className="flex flex-wrap items-center gap-x-3.5 gap-y-1"
      >
        <a
          href={`mailto:${AUTHOR.email}`}
          className="inline-flex items-center gap-1.5 transition-colors hover:text-accent-ink"
        >
          <MailIcon className="size-3.5" />
          <span className="hidden sm:inline">{AUTHOR.email}</span>
          <span className="sm:hidden">Email</span>
        </a>

        {AUTHOR.linkedin ? (
          <a
            href={AUTHOR.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-accent-ink"
          >
            <LinkedInIcon className="size-3.5" />
            {AUTHOR.linkedinHandle ?? "LinkedIn"}
          </a>
        ) : null}

        <a
          href={AUTHOR.github}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-accent-ink"
        >
          <GitHubIcon className="size-3.5" />
          {AUTHOR.githubHandle}
        </a>

        <span aria-hidden="true" className="hidden h-3 w-px bg-rule sm:block" />

        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-accent-ink"
        >
          Data from sih.gov.in
        </a>
      </nav>
    </footer>
  );
}
