// Split out of contentStore.ts so that file can stay safely importable from the client hook
// (useContentStoreHook.ts, for DEFAULT_CONTENT/deepMerge) — this module's import of
// lib/cmsContent.ts (marked "server-only") would otherwise drag Postgres access into the
// client bundle graph the moment anything in contentStore.ts's module scope referenced it,
// regardless of whether getContent() itself is ever actually called client-side.
import "server-only";
import { getStoredContent } from "@/lib/cmsContent";
import { DEFAULT_CONTENT, DEFAULT_DESIGN_SYSTEM, deepMerge } from "@/store/contentStore";
import type { CMSContent } from "@/store/contentStore";

export async function getContent(): Promise<CMSContent> {
  try {
    const stored = await getStoredContent();
    if (!stored) return DEFAULT_CONTENT;
    const merged = deepMerge(DEFAULT_CONTENT, stored as Partial<CMSContent>);

    // Append any default projects not yet in the stored list (new projects added to code),
    // but skip any that the user has explicitly deleted.
    const storedIds = new Set(merged.work.projects.map((p) => p.id));
    const deletedIds = new Set(merged.work.deletedProjectIds ?? []);
    const newDefaults = DEFAULT_CONTENT.work.projects.filter(
      (p) => !storedIds.has(p.id) && !deletedIds.has(p.id)
    );
    if (newDefaults.length > 0) {
      merged.work.projects = [...merged.work.projects, ...newDefaults];
    }

    // evaluate.stats gained an `id` field for the Work-page stats-bar selector feature —
    // assign a stable, index-based fallback id to any pre-existing entries that don't have
    // one yet (deterministic across reloads as long as the entry stays at that index, so a
    // homeStats slot referencing it doesn't silently break before the admin re-saves it).
    if (Array.isArray(merged.evaluate?.stats)) {
      merged.evaluate.stats = merged.evaluate.stats.map((s, i) => (s.id ? s : { ...s, id: `stat-legacy-${i}` }));
    }
    if (!merged.work.homeStats || typeof merged.work.homeStats !== "object") {
      merged.work.homeStats = DEFAULT_CONTENT.work.homeStats;
    } else if (!Array.isArray(merged.work.homeStats.slotIds)) {
      merged.work.homeStats.slotIds = DEFAULT_CONTENT.work.homeStats.slotIds;
    }

    // Ensure fields added after initial localStorage saves exist
    if (!Array.isArray(merged.enquiries)) merged.enquiries = [];
    if (!merged.mediaMeta || typeof merged.mediaMeta !== "object") merged.mediaMeta = {};
    if (!merged.branding || typeof merged.branding !== "object") merged.branding = {};
    if (!merged.designSystem || typeof merged.designSystem !== "object") merged.designSystem = DEFAULT_DESIGN_SYSTEM;
    if (!merged.designSystem.componentColors || typeof merged.designSystem.componentColors !== "object") {
      merged.designSystem.componentColors = {};
    }
    if (!merged.designSystem.buttonStyles) {
      merged.designSystem.buttonStyles = DEFAULT_DESIGN_SYSTEM.buttonStyles;
    } else {
      merged.designSystem.buttonStyles = {
        primary: { ...DEFAULT_DESIGN_SYSTEM.buttonStyles.primary, ...merged.designSystem.buttonStyles.primary },
        secondary: { ...DEFAULT_DESIGN_SYSTEM.buttonStyles.secondary, ...merged.designSystem.buttonStyles.secondary },
        tertiary: { ...DEFAULT_DESIGN_SYSTEM.buttonStyles.tertiary, ...merged.designSystem.buttonStyles.tertiary },
      };
    }
    if (!merged.designSystem.linkUnderline) merged.designSystem.linkUnderline = "none";
    merged.designSystem.typeScale = {
      ...DEFAULT_DESIGN_SYSTEM.typeScale,
      ...merged.designSystem.typeScale,
      body: { ...DEFAULT_DESIGN_SYSTEM.typeScale.body, ...merged.designSystem.typeScale?.body },
      headings: { ...DEFAULT_DESIGN_SYSTEM.typeScale.headings, ...merged.designSystem.typeScale?.headings },
      labels: { ...DEFAULT_DESIGN_SYSTEM.typeScale.labels, ...merged.designSystem.typeScale?.labels },
    };
    merged.designSystem.menuStyle = { ...DEFAULT_DESIGN_SYSTEM.menuStyle, ...merged.designSystem.menuStyle };
    merged.designSystem.tabBarStyle = { ...DEFAULT_DESIGN_SYSTEM.tabBarStyle, ...merged.designSystem.tabBarStyle };
    merged.designSystem.textAreaStyle = { ...DEFAULT_DESIGN_SYSTEM.textAreaStyle, ...merged.designSystem.textAreaStyle };
    merged.designSystem.switchStyle = { ...DEFAULT_DESIGN_SYSTEM.switchStyle, ...merged.designSystem.switchStyle };
    if (!Array.isArray(merged.designSystem.savedThemes)) merged.designSystem.savedThemes = [];

    return merged;
  } catch {
    return DEFAULT_CONTENT;
  }
}
