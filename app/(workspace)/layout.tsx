import { WorkspaceShell } from "@/components/workspace-shell";
import { FACETS, LIST_ITEMS, SUMMARY } from "@/lib/records";

/**
 * The workspace chrome — masthead, filter rail and results list.
 *
 * It is a layout rather than part of each page so that opening a statement
 * swaps only the detail pane: the filters you have set, the scroll position of
 * the list and the search box all survive navigation.
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      listItems={LIST_ITEMS}
      facets={FACETS}
      summary={SUMMARY}
    >
      {children}
    </WorkspaceShell>
  );
}
