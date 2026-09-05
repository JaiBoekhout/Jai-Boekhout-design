"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { ChevronDown, ChevronUp, Plus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, LayoutGrid, Image as ImageIcon, X, Trash2, Copy, Search, ExternalLink, Eye, EyeOff } from "lucide-react";
import { CMSInput, CMSUrlInput, CMSSlugInput, CMSTextarea, CMSArrayEditor, CMSChipEditor, CMSSectionHeading, CMSCard, selectArrowStyle, useDragReorder, DragHandle } from "@/components/CMSFields";
import { ResponsiveRichTextEditor } from "@/components/ResponsiveRichTextEditor";
import { ImagePicker } from "@/components/ImagePicker";
import { Switch } from "@/components/SiteKit";
import type { CMSWork, CMSCaseStudy, CMSCompany, CMSProject, CMSStat, ViewMoreSort, ViewMoreCandidate, ProjectListLayout, CMSProjectCategory } from "@/store/contentStore";
import { resolveViewMore, resolveLinkedCaseStudy, projectUrlSlug } from "@/store/contentStore";

const MAX_HOME_STATS = 6;

// Drives the Work tab's sidebar sub-section list in AdminCMS.tsx (same pattern as
// DESIGN_SYSTEM_SECTIONS in DesignSystemSection.tsx) — one entry per top-level CMSSectionHeading
// below, in order. "View More Projects" isn't included — it's a per-item heading inside
// ViewMoreEditor, repeated once per project/case study, not a single page anchor.
export const WORK_SECTIONS: { id: string; label: string }[] = [
  { id: "work-hero", label: "Hero" },
  { id: "work-stats-bar", label: "Stats Bar" },
  { id: "work-featured-grid", label: "Featured Grid" },
  { id: "work-project-list", label: "Project List" },
  { id: "work-case-studies", label: "Case Studies" },
  { id: "work-projects", label: "Projects" },
];

interface Props {
  data: CMSWork;
  // What's actually in Postgres right now — used only to flag cards/fields that differ from it
  // (see the "dirty" outline on each CMSCard/field below), never read for anything else.
  savedData: CMSWork;
  companies: CMSCompany[];
  evaluateStats: CMSStat[];
  onChange: (data: CMSWork) => void;
}

// Show/hide + slot-count + per-slot selector for the Work-page stats bar, which is a selector
// over Evaluate → At a Glance entries rather than its own authored content — editing a stat's
// value/label there is reflected here automatically since slots store an id, not copied text.
function HomeStatsEditor({ data, evaluateStats, onChange }: { data: CMSWork; evaluateStats: CMSStat[]; onChange: (data: CMSWork) => void }) {
  const cfg = data.homeStats;
  const validIds = new Set(evaluateStats.map((s) => s.id));

  function updateCfg(patch: Partial<CMSWork["homeStats"]>) {
    onChange({ ...data, homeStats: { ...cfg, ...patch } });
  }

  return (
    <>
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer", userSelect: "none" }}>
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => updateCfg({ enabled: e.target.checked })}
          style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
        />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#EDE8DF", letterSpacing: "0.04em" }}>
          Show stats section on homepage
        </span>
      </label>

      {cfg.enabled && (
        <>
          <div className="mb-4">
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              Number of stats to display
            </label>
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_HOME_STATS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateCfg({ count: n })}
                  style={{
                    width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${cfg.count === n ? "rgba(20,173,181,0.5)" : "rgba(237,232,223,0.1)"}`,
                    background: cfg.count === n ? "rgba(20,173,181,0.12)" : "#0C1117",
                    color: cfg.count === n ? "#14ADB5" : "#EDE8DF",
                    fontFamily: "'DM Mono', monospace", fontSize: "12px",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {evaluateStats.length === 0 ? (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginBottom: 16 }}>
              No At a Glance entries yet — add some under Evaluate → At A Glance first, then come back here to pick which ones show.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {Array.from({ length: cfg.count }, (_, i) => i).map((i) => {
                const currentId = cfg.slotIds[i] ?? null;
                const isMissing = !!currentId && !validIds.has(currentId);
                return (
                  <div key={i}>
                    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Slot {i + 1}
                    </label>
                    <select
                      value={isMissing ? "" : currentId ?? ""}
                      onChange={(e) => {
                        const slots = [...cfg.slotIds];
                        while (slots.length < MAX_HOME_STATS) slots.push(null);
                        slots[i] = e.target.value || null;
                        updateCfg({ slotIds: slots });
                      }}
                      style={{
                        width: "100%", background: "#0C1117", border: `1px solid ${isMissing ? "rgba(224,82,82,0.4)" : "rgba(237,232,223,0.08)"}`, borderRadius: "8px",
                        padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#EDE8DF", fontWeight: 300, outline: "none",
                        ...selectArrowStyle,
                      }}
                    >
                      <option value="" disabled={!isMissing}>{isMissing ? "Entry deleted — pick a replacement" : "Select an entry…"}</option>
                      {evaluateStats.map((s) => (
                        <option key={s.id} value={s.id}>{s.label} ({s.value})</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

// Curated categories for the public featured grid's filter bar (CMSWork.projectCategories) —
// a small fixed taxonomy the admin maintains directly, separate from each project's own
// freeform Tags chip editor below. The built-in "All" filter is shown here as a non-editable
// reference row but never stored — mirrors the FAQ section's category manager pattern.
function ProjectCategoryManager({ data, onChange }: { data: CMSWork; onChange: (data: CMSWork) => void }) {
  const categories = data.projectCategories ?? [];
  const drag = useDragReorder(categories, (next) =>
    onChange({ ...data, projectCategories: next.map((c, i) => ({ ...c, order: i })) })
  );
  const hasAllCollision = categories.some((c) => c.name.trim().toLowerCase() === "all");

  function addCategory() {
    onChange({
      ...data,
      projectCategories: [...categories, { id: `projcat-${Date.now()}`, name: "New Category", order: categories.length }],
    });
  }

  function renameCategory(id: string, name: string) {
    onChange({ ...data, projectCategories: categories.map((c) => (c.id === id ? { ...c, name } : c)) });
  }

  function deleteCategory(id: string) {
    onChange({
      ...data,
      projectCategories: categories.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })),
      projects: data.projects.map((p) =>
        p.categories?.includes(id) ? { ...p, categories: p.categories.filter((cid) => cid !== id) } : p
      ),
      // Bare case studies can be featured directly (see caseStudyToProject in contentStore.ts)
      // and carry their own copy of this field — same cascade as projects above.
      caseStudies: data.caseStudies.map((cs) =>
        cs.categories?.includes(id) ? { ...cs, categories: cs.categories.filter((cid) => cid !== id) } : cs
      ),
    });
  }

  return (
    <div className="mb-4">
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
        Filter Categories
      </label>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginBottom: 12, lineHeight: 1.5 }}>
        Shown as a filter pill bar above the Featured Grid on the public site. Assign each project to one or more categories below in the Projects list. &quot;All&quot; is built in and always shown first.
      </p>
      <div className="flex flex-col gap-1.5 mb-2">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(237,232,223,0.03)", border: "1px solid rgba(237,232,223,0.08)" }}>
          <span style={{ width: 14, flexShrink: 0 }} />
          <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(237,232,223,0.4)" }}>All</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(140,154,163,0.5)", letterSpacing: "0.06em" }}>BUILT-IN</span>
        </div>
        {categories.map((c, i) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "rgba(20,173,181,0.05)", border: "1px solid rgba(20,173,181,0.15)", ...drag.cardStyle(i) }}
            {...drag.dropTargetProps(i)}
          >
            <DragHandle {...drag.dragHandleProps(i)} />
            <input
              type="text"
              value={c.name}
              onChange={(e) => renameCategory(c.id, e.target.value)}
              style={{
                flex: 1, background: "#0C1117",
                border: `1px solid ${c.name.trim().toLowerCase() === "all" ? "rgba(224,82,82,0.5)" : "rgba(237,232,223,0.08)"}`,
                borderRadius: 6, padding: "6px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EDE8DF", outline: "none",
              }}
            />
            <button
              onClick={() => deleteCategory(c.id)}
              title="Delete category"
              className="hover:text-red-400 transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(140,154,163,0.5)", padding: 4, display: "flex" }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      {hasAllCollision && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#E05252", marginBottom: 8 }}>
          A category can&apos;t be named &quot;All&quot; — that&apos;s the built-in filter shown above.
        </p>
      )}
      <button
        onClick={addCategory}
        className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
        style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#14ADB5", background: "none", border: "1px solid rgba(20,173,181,0.3)", borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}
      >
        <Plus size={12} /> Add Category
      </button>
    </div>
  );
}

// Toggle-chip picker for a single project/case-study row's own CMSProjectCategory membership —
// shared by both CMSCaseStudy Tags editors (updateCase) and the CMSProject one (updateProject)
// below, since a bare case study can itself be a featured slot (see caseStudyToProject in
// store/contentStore.ts) and needs the same assignability. Renders nothing while no categories
// have been curated yet in ProjectCategoryManager above.
function CategoryToggleRow({ categories, selected, onChange }: { categories: CMSProjectCategory[]; selected: string[]; onChange: (next: string[]) => void }) {
  if (categories.length === 0) return null;
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  return (
    <div className="mb-4">
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
        Filter Categories
      </label>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((c) => {
          const active = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(active ? selected.filter((id) => id !== c.id) : [...selected, c.id])}
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.03em",
                padding: "6px 13px", borderRadius: 999, cursor: "pointer", transition: "all 0.15s ease",
                background: active ? "#14ADB5" : "transparent",
                color: active ? "#0C1117" : "rgba(237,232,223,0.5)",
                border: active ? "1px solid transparent" : "1px solid rgba(237,232,223,0.16)",
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// " / Agency Name" suffix for a row's client display when it's tagged Agency — mirrors the
// "Client, Location / Freelance Project" free-text convention already used on custom entries,
// just computed from the linked Company instead of typed by hand.
function agencySuffix(companies: CMSCompany[], clientMode: "custom" | "agency" | undefined, companyId: string | undefined): string {
  if (clientMode !== "agency" || !companyId) return "";
  const company = companies.find((c) => c.id === companyId);
  return company ? ` / ${company.name}` : "";
}

// Client / Type field — toggles between a free-text "Custom" client and an "Agency" dropdown
// sourced from the Design System's Companies list, for crediting work done for an employer's
// own clients (copyright/IP clarity) rather than Jai's own client relationship.
function ClientField({
  mode, clientValue, companyId, companies, onModeChange, onClientChange, onCompanyChange,
}: {
  mode: "custom" | "agency";
  clientValue: string;
  companyId: string | undefined;
  companies: CMSCompany[];
  onModeChange: (mode: "custom" | "agency") => void;
  onClientChange: (v: string) => void;
  onCompanyChange: (id: string | undefined) => void;
}) {
  return (
    <div className="flex flex-col mb-4">
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Type
        </label>
        <Switch
          checked={mode === "agency"}
          onChange={(checked) => onModeChange(checked ? "agency" : "custom")}
          label={mode === "agency" ? "Agency" : "Custom"}
        />
      </div>
      <div className={mode === "agency" ? "grid grid-cols-1 md:grid-cols-2 gap-3" : undefined}>
        <div>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Client Name
          </label>
          <input
            type="text"
            value={clientValue}
            onChange={(e) => onClientChange(e.target.value)}
            placeholder="e.g. Shadow Creek · McLaren Vale"
            style={{
              width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "8px",
              padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#EDE8DF", fontWeight: 300, outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.08)")}
          />
        </div>
        {mode === "agency" && (
          <div>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Agency
            </label>
            {companies.length > 0 ? (
              <select
                value={companyId ?? ""}
                onChange={(e) => onCompanyChange(e.target.value || undefined)}
                style={{
                  width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "8px",
                  padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#EDE8DF", fontWeight: 300, outline: "none",
                  ...selectArrowStyle,
                }}
              >
                <option value="" disabled>Select an agency…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", margin: 0 }}>
                No companies yet — add one under Design System → Companies.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// The reverse of the Project editor's "Linked Case Study" picker — shown on the Case Study
// editor so the link can be set/confirmed from whichever side of a pair is actually visible
// (a project that already resolves to a case study is hidden from the Projects list entirely,
// shown only via its case study, so that picker alone wasn't reachable for existing pairs).
function LinkedProjectField({
  cs, allCaseStudies, projects, onLink,
}: {
  cs: CMSCaseStudy;
  allCaseStudies: CMSCaseStudy[];
  projects: CMSProject[];
  onLink: (projectId: string | null) => void;
}) {
  const explicitMatch = projects.find((p) => p.linkedCaseStudyId === cs.id);
  const autoMatch = !explicitMatch
    ? projects.find((p) => resolveLinkedCaseStudy({ ...p, linkedCaseStudyId: undefined }, allCaseStudies)?.id === cs.id)
    : undefined;

  return (
    <div className="flex flex-col mb-4">
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
        Linked Project (optional)
      </label>
      <select
        value={explicitMatch?.id ?? ""}
        onChange={(e) => onLink(e.target.value || null)}
        style={{
          width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "8px",
          padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#EDE8DF", fontWeight: 300, outline: "none",
          ...selectArrowStyle,
        }}
      >
        <option value="">{autoMatch ? `None set — currently auto-matched by title to "${autoMatch.name}"` : "None"}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {autoMatch && !explicitMatch && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8C9AA3", marginTop: 6, lineHeight: 1.5 }}>
          Renaming either title could silently break this auto-match — pick it explicitly above to make the link permanent.
        </p>
      )}
    </div>
  );
}

const MAX_FEATURED = 9;

type SortMode = "newest" | "oldest" | "az" | "za";

// Sort strictly by createdAt (publish date), never updatedAt — updatedAt changes
// on every keystroke while editing, and using it here would make a card jump to
// the top of a "Newest first" list mid-edit. Undated legacy entries (created
// before this field existed) tie at 0 and simply keep their original relative
// order (stable sort) instead of reshuffling as they're edited.
function sortTime(item: { createdAt?: string }): number {
  return item.createdAt ? new Date(item.createdAt).getTime() : 0;
}

function applySort<T extends { createdAt?: string; updatedAt?: string }>(
  items: T[],
  sort: SortMode,
  getName: (item: T) => string
): T[] {
  const arr = [...items];
  switch (sort) {
    case "newest": return arr.sort((a, b) => sortTime(b) - sortTime(a));
    case "oldest": return arr.sort((a, b) => sortTime(a) - sortTime(b));
    case "az": return arr.sort((a, b) => getName(a).localeCompare(getName(b)));
    case "za": return arr.sort((a, b) => getName(b).localeCompare(getName(a)));
  }
}

function matchesSearch(query: string, ...fields: (string | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

function ListToolbar({
  search, onSearchChange, sort, onSortChange, placeholder, resultCount, totalCount,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  sort: SortMode;
  onSortChange: (v: SortMode) => void;
  placeholder: string;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(140,154,163,0.5)", pointerEvents: "none" }} />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          style={{ width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: 8, padding: "8px 30px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EDE8DF", outline: "none", transition: "border-color 0.2s" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.08)")}
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            title="Clear search"
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(140,154,163,0.6)", padding: 2, display: "flex" }}
          >
            <X size={12} />
          </button>
        )}
      </div>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortMode)}
        title="Sort order"
        style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: 8, padding: "8px 10px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none", cursor: "pointer", flexShrink: 0, ...selectArrowStyle }}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="az">Name A–Z</option>
        <option value="za">Name Z–A</option>
      </select>
      {search && (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(140,154,163,0.5)", flexShrink: 0, whiteSpace: "nowrap" }}>
          {resultCount}/{totalCount}
        </span>
      )}
    </div>
  );
}

const VIEW_MORE_MAX_PINNED = 3;

// Opens the live public popup for this project/case study in a new tab, via the deep-link
// query param page.tsx reads on mount (?project=<id>, same unified id space as
// featuredProjectOrder/viewMorePinnedIds). Renders left of the status badge.
function ViewPageButton({ id }: { id: string }) {
  return (
    <a
      href={`/work/${encodeURIComponent(id)}`}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="View this page on the live site (opens in a new tab)"
      className="hover:opacity-80 transition-opacity"
      style={{
        display: "flex", alignItems: "center", gap: 5, fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em",
        color: "#EDE8DF", background: "none", border: "1px solid rgba(237,232,223,0.15)", borderRadius: 20, padding: "4px 10px",
        textDecoration: "none", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
      }}
    >
      <ExternalLink size={10} />
      View Page
    </a>
  );
}

function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 280 }}>
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter password…"
        style={{ width: "100%", background: "rgba(237,232,223,0.04)", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 7, padding: "8px 34px 8px 10px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#EDE8DF", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, cursor: "pointer", color: "rgba(237,232,223,0.5)", display: "flex" }}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

interface ViewMoreEditorProps {
  currentId: string;
  heading: string;
  pinnedIds: string[];
  category?: string;
  sort?: ViewMoreSort;
  allEntries: ViewMoreCandidate[];
  allTags: string[];
  onChange: (patch: {
    viewMoreHeading?: string;
    viewMorePinnedIds?: string[];
    viewMoreCategory?: string;
    viewMoreSort?: ViewMoreSort;
  }) => void;
}

// Editor for the "View More Projects" section shown at the bottom of the public popup.
// Pin 0-3 specific projects directly; whichever slots aren't pinned always auto-fill from
// the category+sort settings below (dropping the category if it can't fill every slot).
// The preview list uses the exact same resolveViewMore() the public site calls, so it can
// never drift from what visitors actually see.
function ViewMoreEditor({ currentId, heading, pinnedIds, category, sort, allEntries, allTags, onChange }: ViewMoreEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pinnedEntries = pinnedIds
    .map((id) => allEntries.find((e) => e.id === id))
    .filter((e): e is ViewMoreCandidate => !!e);
  const availableToPin = allEntries.filter((e) => e.id !== currentId && !pinnedIds.includes(e.id));
  const preview = resolveViewMore(allEntries, { pinnedIds, category, sort }, currentId);

  const selectStyle: React.CSSProperties = {
    width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: 8,
    padding: "8px 10px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none", cursor: "pointer",
    ...selectArrowStyle,
  };
  const smallLabel: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#14ADB5", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5,
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <CMSSectionHeading>View More Projects</CMSSectionHeading>
      <CMSInput label="Section Heading" value={heading} onChange={(v) => onChange({ viewMoreHeading: v })} />

      {/* Pinned picker — always visible, 0-3 selections */}
      <label style={smallLabel}>Pinned (optional, up to 3)</label>
      <div style={{ marginBottom: 14 }}>
        {pinnedEntries.map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(237,232,223,0.03)", border: "1px solid rgba(237,232,223,0.08)", borderRadius: 7, marginBottom: 5 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12.5, color: "var(--c-heading)", margin: 0 }}>{e.name}</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9.5, color: "rgba(140,154,163,0.6)", margin: 0 }}>{e.client}</p>
            </div>
            <button
              onClick={() => onChange({ viewMorePinnedIds: pinnedIds.filter((id) => id !== e.id) })}
              title="Remove"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: 4, display: "flex", flexShrink: 0 }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {pinnedIds.length < VIEW_MORE_MAX_PINNED && (
          <div style={{ position: "relative", marginTop: 4 }}>
            {pickerOpen && <div style={{ position: "fixed", inset: 0, zIndex: 15 }} onClick={() => setPickerOpen(false)} />}
            <button
              onClick={() => setPickerOpen((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.06em", color: "#14ADB5", background: "rgba(20,173,181,0.06)", border: "1px dashed rgba(20,173,181,0.3)", borderRadius: 7, padding: "9px 12px", cursor: "pointer", justifyContent: "center" }}
            >
              <Plus size={12} /> Add pinned project ({VIEW_MORE_MAX_PINNED - pinnedIds.length} left)
            </button>
            {pickerOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, background: "#111820", border: "1px solid rgba(237,232,223,0.12)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxHeight: 280, overflowY: "auto" }}>
                {availableToPin.length === 0 ? (
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", padding: "14px 16px", margin: 0 }}>No other projects available</p>
                ) : availableToPin.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { onChange({ viewMorePinnedIds: [...pinnedIds, e.id] }); setPickerOpen(false); }}
                    className="hover:bg-white/5 transition-colors"
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px", background: "none", border: "none", borderBottom: "0.5px solid rgba(237,232,223,0.06)", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: "var(--c-heading)", margin: 0, fontWeight: 400 }}>{e.name}</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#EDE8DF", margin: 0 }}>{e.client}</p>
                    </div>
                    <Plus size={11} style={{ color: "#14ADB5", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category + sort — always visible, govern whichever slots aren't pinned */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={smallLabel}>Category filter (for unpinned slots)</label>
          <select value={category || ""} onChange={(e) => onChange({ viewMoreCategory: e.target.value || undefined })} style={selectStyle}>
            <option value="" style={{ background: "#0C1117" }}>— No filter —</option>
            {allTags.map((t) => <option key={t} value={t} style={{ background: "#0C1117" }}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={smallLabel}>Sort</label>
          <select value={sort || "newest"} onChange={(e) => onChange({ viewMoreSort: e.target.value as ViewMoreSort })} style={selectStyle}>
            <option value="oldest" style={{ background: "#0C1117" }}>Oldest → Newest</option>
            <option value="newest" style={{ background: "#0C1117" }}>Newest → Oldest</option>
          </select>
        </div>
      </div>

      {/* Live preview — exactly what the public site will resolve right now */}
      <label style={smallLabel}>Preview — what will show on the page</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {preview.length === 0 ? (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(140,154,163,0.5)", margin: 0 }}>No eligible projects yet.</p>
        ) : preview.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(237,232,223,0.02)", border: "1px solid rgba(237,232,223,0.06)", borderRadius: 6 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(140,154,163,0.5)", flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12, color: "var(--c-heading)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 8.5, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0,
              color: p.source === "pinned" ? "#14ADB5" : "#8C9AA3",
              background: p.source === "pinned" ? "rgba(20,173,181,0.1)" : "rgba(140,154,163,0.08)",
              border: `1px solid ${p.source === "pinned" ? "rgba(20,173,181,0.3)" : "rgba(140,154,163,0.15)"}`,
              borderRadius: 999, padding: "2px 8px",
            }}>
              {p.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Swaps two of a case study's 3 "Highlight" images — src, focal position and zoom move together
// as a unit so reordering doesn't leave a photo with the wrong crop.
function swapCaseHighlights(cs: CMSCaseStudy, a: 1 | 2 | 3, b: 1 | 2 | 3): Partial<CMSCaseStudy> {
  const slot = (n: 1 | 2 | 3) =>
    n === 1 ? { url: cs.img1Url, pos: cs.img1Position, scale: cs.img1Scale }
    : n === 2 ? { url: cs.img2Url, pos: cs.img2Position, scale: cs.img2Scale }
    : { url: cs.img3Url, pos: cs.img3Position, scale: cs.img3Scale };
  const A = slot(a), B = slot(b);
  const patch: Partial<CMSCaseStudy> = {};
  const apply = (n: 1 | 2 | 3, v: { url?: string; pos?: string; scale?: number }) => {
    if (n === 1) { patch.img1Url = v.url; patch.img1Position = v.pos; patch.img1Scale = v.scale; }
    else if (n === 2) { patch.img2Url = v.url; patch.img2Position = v.pos; patch.img2Scale = v.scale; }
    else { patch.img3Url = v.url; patch.img3Position = v.pos; patch.img3Scale = v.scale; }
  };
  apply(a, B);
  apply(b, A);
  return patch;
}

// imgs[0] is a reserved placeholder (see swapProjectHighlights below) that a blanket
// `.filter(Boolean)` would silently compact away, shifting every highlight down one slot —
// trimming only trailing empties preserves it (and any deliberately-cleared middle slot).
function trimTrailingEmpty(arr: string[]): string[] {
  const next = [...arr];
  while (next.length > 0 && !next[next.length - 1]) next.pop();
  return next;
}

// Same idea for a project's 3 "Highlight" images — src lives in the imgs[] array (index = slot
// number, i.e. Highlight 1/2/3 are imgs[1]/imgs[2]/imgs[3]) while focal position/zoom are separate
// per-slot fields. imgs[0] is deliberately left reserved/blank here — the public side (see
// FeaturedProjects.tsx) falls back to it as a cover/hero image when coverImageUrl/heroImageUrl
// aren't set, so it must never double as "Highlight 1".
function swapProjectHighlights(p: CMSProject, a: 1 | 2 | 3, b: 1 | 2 | 3): Partial<CMSProject> {
  const imgs = [...p.imgs];
  while (imgs.length < 4) imgs.push("");
  const ai = a, bi = b;
  [imgs[ai], imgs[bi]] = [imgs[bi], imgs[ai]];

  const slot = (n: 1 | 2 | 3) =>
    n === 1 ? { pos: p.img1Position, scale: p.img1Scale }
    : n === 2 ? { pos: p.img2Position, scale: p.img2Scale }
    : { pos: p.img3Position, scale: p.img3Scale };
  const A = slot(a), B = slot(b);
  const patch: Partial<CMSProject> = { imgs: trimTrailingEmpty(imgs) };
  const apply = (n: 1 | 2 | 3, v: { pos?: string; scale?: number }) => {
    if (n === 1) { patch.img1Position = v.pos; patch.img1Scale = v.scale; }
    else if (n === 2) { patch.img2Position = v.pos; patch.img2Scale = v.scale; }
    else { patch.img3Position = v.pos; patch.img3Scale = v.scale; }
  };
  apply(a, B);
  apply(b, A);
  return patch;
}

// Left/right arrows for a highlight slot's headerAction — pass undefined for whichever side is
// already at the end of the row to disable it.
// Sits in the grid gutter between two Highlight image cards — one click swaps that adjacent
// pair (src + focal position + zoom move together). Centered via the grid's alignItems:
// "center" rather than any fixed offset, so it holds position regardless of card height.
function HighlightSwapButton({ onSwap }: { onSwap: () => void }) {
  return (
    <button
      type="button"
      onClick={onSwap}
      title="Swap these two images"
      className="hover:opacity-100 transition-opacity"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "rgba(237,232,223,0.05)", border: "1px solid rgba(237,232,223,0.15)",
        color: "#EDE8DF", cursor: "pointer", opacity: 0.7,
      }}
    >
      <ArrowLeft size={14} />
      <ArrowRight size={14} />
    </button>
  );
}

export function WorkSection({ data, savedData, companies, evaluateStats, onChange }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [openProjId, setOpenProjId] = useState<string | null>(null);
  const [imgOpenId, setImgOpenId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [savedProjId, setSavedProjId] = useState<string | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmProjId, setDeleteConfirmProjId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);
  const newCardRef = useRef<HTMLDivElement>(null);
  const [csSearch, setCsSearch] = useState("");
  const [csSort, setCsSort] = useState<SortMode>("newest");
  const [projSearch, setProjSearch] = useState("");
  const [projSort, setProjSort] = useState<SortMode>("newest");

  useEffect(() => {
    if (justAddedId === null) return;
    newCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setJustAddedId(null);
  }, [justAddedId]);

  useEffect(() => {
    if (deleteConfirmId === null) return;
    const t = setTimeout(() => setDeleteConfirmId(null), 3000);
    return () => clearTimeout(t);
  }, [deleteConfirmId]);

  useEffect(() => {
    if (deleteConfirmProjId === null) return;
    const t = setTimeout(() => setDeleteConfirmProjId(null), 3000);
    return () => clearTimeout(t);
  }, [deleteConfirmProjId]);

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function updateProject(id: string, updates: Partial<typeof data.projects[0]>) {
    const current = data.projects.find((p) => p.id === id);
    const isLive = !current?.status || current.status === "published";
    const autoStatus = !("status" in updates) && isLive
      ? { status: "updated" as const }
      : {};
    onChange({
      ...data,
      projects: data.projects.map((p) =>
        p.id === id
          ? { ...p, ...updates, ...autoStatus, updatedAt: new Date().toISOString() }
          : p
      ),
    });
  }

  // Points project.linkedCaseStudyId at this case study — clearing it from whichever other
  // project (if any) currently claims it first, so the relationship stays 1:1. projectId null
  // clears the link entirely (falls back to fuzzy title matching again).
  function setLinkedProject(caseStudyId: number, projectId: string | null) {
    onChange({
      ...data,
      projects: data.projects.map((p) => {
        if (p.id === projectId) return { ...p, linkedCaseStudyId: caseStudyId };
        if (p.linkedCaseStudyId === caseStudyId) return { ...p, linkedCaseStudyId: undefined };
        return p;
      }),
    });
  }

  // Effective featured order — when empty the store falls back to projects.slice(0,9),
  // so we mirror that behaviour here so the UI shows a useful starting state.
  const effectiveFeatured: string[] =
    data.featuredProjectOrder.length > 0
      ? data.featuredProjectOrder
      : data.projects.slice(0, MAX_FEATURED).map((p) => p.id);

  function toggleFeatured(id: string) {
    const isFeatured = effectiveFeatured.includes(id);
    const next = isFeatured
      ? effectiveFeatured.filter((x) => x !== id)
      : effectiveFeatured.length < MAX_FEATURED
        ? [...effectiveFeatured, id]
        : effectiveFeatured; // already at 9 — ignore
    onChange({ ...data, featuredProjectOrder: next });
  }

  function moveFeatured(id: string, dir: -1 | 1) {
    const idx = effectiveFeatured.indexOf(id);
    if (idx < 0) return;
    const next = [...effectiveFeatured];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ ...data, featuredProjectOrder: next });
  }

  const featuredDrag = useDragReorder(effectiveFeatured, (next) => onChange({ ...data, featuredProjectOrder: next }));

  function updateCase(id: number, updates: Partial<CMSCaseStudy>) {
    const current = data.caseStudies.find((cs) => cs.id === id);
    const isLive = !current?.status || current.status === "published";
    const autoStatus = !("status" in updates) && isLive
      ? { status: "updated" as const }
      : {};
    onChange({
      ...data,
      caseStudies: data.caseStudies.map((cs) =>
        cs.id === id
          ? { ...cs, ...updates, ...autoStatus, updatedAt: new Date().toISOString() }
          : cs
      ),
    });
  }

  function duplicateCase(cs: CMSCaseStudy) {
    const newId = Math.max(...data.caseStudies.map((c) => c.id)) + 1;
    const now = new Date().toISOString();
    onChange({
      ...data,
      caseStudies: [...data.caseStudies, { ...cs, id: newId, title: `Copy of ${cs.title}`, status: "unpublished" as const, createdAt: now, updatedAt: now }],
    });
  }

  function duplicateProject(p: (typeof data.projects)[0]) {
    const newId = `${p.id}-copy-${Date.now()}`;
    const now = new Date().toISOString();
    onChange({
      ...data,
      projects: [...data.projects, { ...p, id: newId, name: `Copy of ${p.name}`, status: "unpublished" as const, createdAt: now, updatedAt: now }],
    });
  }

  function addCase() {
    const newId = Math.max(0, ...data.caseStudies.map((c) => c.id)) + 1;
    const now = new Date().toISOString();
    onChange({
      ...data,
      caseStudies: [...data.caseStudies, { id: newId, title: "New Project", client: "", summary: "", outcomes: [], tags: [], status: "unpublished" as const, createdAt: now, updatedAt: now }],
    });
    setOpenId(newId);
    setJustAddedId(newId);
  }

  // Rows: featured ones first (in order) — includes both CMSProject and CS-backed entries
  const featuredRows = effectiveFeatured
    .map((id) => {
      if (id.startsWith("cs-")) {
        const csId = parseInt(id.slice(3), 10);
        const cs = data.caseStudies.find((c) => c.id === csId);
        if (!cs) return null;
        return { id, num: id, name: cs.title, client: cs.client, tags: cs.tags || [], desc: cs.summary || "", outcomes: cs.outcomes || [], imgs: ["", cs.img1Url || "", cs.img2Url || "", cs.img3Url || ""], coverImageUrl: cs.coverImageUrl, heroImageUrl: cs.heroImageUrl, status: cs.status, live: cs.liveUrl || null, caseStudy: null } as typeof data.projects[0];
      }
      return data.projects.find((p) => p.id === id) || null;
    })
    .filter(Boolean) as typeof data.projects;
  const unfeaturedRows = data.projects.filter((p) => !effectiveFeatured.includes(p.id));

  // Split case studies: only those with fullCaseStudy checked go in the Case Studies section
  const fullCaseStudies = data.caseStudies.filter((cs) => cs.fullCaseStudy);
  const draftCaseStudies = data.caseStudies.filter((cs) => !cs.fullCaseStudy);

  // CMSProject entries without a linked case study — shown in the "Projects" section
  const standaloneProjects = data.projects.filter((p) => !resolveLinkedCaseStudy(p, data.caseStudies));

  // Search + sort. "Case Studies" toolbar covers only full case studies.
  const filteredFullCaseStudies = applySort(
    fullCaseStudies.filter((cs) => matchesSearch(csSearch, cs.title, cs.client, ...cs.tags)),
    csSort,
    (cs) => cs.title
  );

  // "Projects" toolbar covers BOTH draft case studies and standalone CMSProjects, merged
  // into one interleaved list (not two lists concatenated) so sort/search behave as a
  // single "Projects" section the way they visually appear under one heading.
  type ProjectsEntry = { kind: "cs"; cs: CMSCaseStudy } | { kind: "proj"; p: (typeof data.projects)[0] };
  const projectsListEntries: ProjectsEntry[] = (() => {
    const all: ProjectsEntry[] = [
      ...draftCaseStudies.map((cs): ProjectsEntry => ({ kind: "cs", cs })),
      ...standaloneProjects.map((p): ProjectsEntry => ({ kind: "proj", p })),
    ];
    const name = (e: ProjectsEntry) => (e.kind === "cs" ? e.cs.title : e.p.name);
    const client = (e: ProjectsEntry) => (e.kind === "cs" ? e.cs.client : e.p.client);
    const tags = (e: ProjectsEntry) => (e.kind === "cs" ? e.cs.tags : e.p.tags);
    const time = (e: ProjectsEntry) => sortTime(e.kind === "cs" ? e.cs : e.p);
    const filtered = all.filter((e) => matchesSearch(projSearch, name(e), client(e), ...tags(e)));
    switch (projSort) {
      case "newest": return filtered.sort((a, b) => time(b) - time(a));
      case "oldest": return filtered.sort((a, b) => time(a) - time(b));
      case "az": return filtered.sort((a, b) => name(a).localeCompare(name(b)));
      case "za": return filtered.sort((a, b) => name(b).localeCompare(name(a)));
    }
  })();
  const projResultCount = projectsListEntries.length;
  const projTotalCount = draftCaseStudies.length + standaloneProjects.length;

  // Every project + case study, unified into one id space (project id, or "cs-<id>" for
  // case-study-only entries) — feeds the View More Projects pinned-picker and category list.
  const allEntries: ViewMoreCandidate[] = [
    ...data.projects.map((p) => ({ id: p.id, name: p.name, client: p.client, tags: p.tags, createdAt: p.createdAt, updatedAt: p.updatedAt })),
    ...data.caseStudies
      .filter((cs) => !data.projects.some((p) => resolveLinkedCaseStudy(p, data.caseStudies)?.id === cs.id))
      .map((cs) => ({ id: `cs-${cs.id}`, name: cs.title, client: cs.client, tags: cs.tags, createdAt: cs.createdAt, updatedAt: cs.updatedAt })),
  ];
  // A case study's "self id" for exclusion purposes: if it's dual-represented by a
  // CMSProject, that project's id IS the canonical id in allEntries (see filter above).
  function selfIdForCase(cs: CMSCaseStudy): string {
    const dual = data.projects.find((p) => resolveLinkedCaseStudy(p, data.caseStudies)?.id === cs.id);
    return dual ? projectUrlSlug(dual) : (cs.slug && cs.slug.trim()) || `cs-${cs.id}`;
  }
  const allTags = Array.from(new Set([...data.projects, ...data.caseStudies].flatMap((e) => e.tags))).sort((a, b) => a.localeCompare(b));

  // Card-level "unsaved" outline — cheaper and more useful than per-field precision here, since
  // every field below lives inside one of these collapsible cards; a highlighted input inside a
  // collapsed card would be invisible anyway. A missing saved counterpart (id not found) means
  // the whole card is new and unsaved, not an error.
  function caseStudyDirtyStyle(cs: CMSCaseStudy): React.CSSProperties | undefined {
    const saved = savedData.caseStudies.find((x) => x.id === cs.id);
    const dirty = !saved || JSON.stringify(cs) !== JSON.stringify(saved);
    return dirty ? { borderColor: "rgba(245,158,11,0.5)", boxShadow: "0 0 0 1px rgba(245,158,11,0.15)" } : undefined;
  }
  function projectDirtyStyle(p: CMSProject): React.CSSProperties | undefined {
    const saved = savedData.projects.find((x) => x.id === p.id);
    const dirty = !saved || JSON.stringify(p) !== JSON.stringify(saved);
    return dirty ? { borderColor: "rgba(245,158,11,0.5)", boxShadow: "0 0 0 1px rgba(245,158,11,0.15)" } : undefined;
  }

  return (
    <div>
      <CMSSectionHeading id="work-hero">Hero</CMSSectionHeading>
      <ResponsiveRichTextEditor
        label="Hero Statement"
        value={data.heroStatement}
        onChange={(v) => onChange({ ...data, heroStatement: v })}
        mobileValue={data.heroStatementMobile}
        onMobileChange={(v) => onChange({ ...data, heroStatementMobile: v })}
        dirty={data.heroStatement !== savedData.heroStatement || data.heroStatementMobile !== savedData.heroStatementMobile}
      />

      <CMSSectionHeading id="work-stats-bar">Stats Bar</CMSSectionHeading>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -12, marginBottom: 16, lineHeight: 1.5 }}>
        Pulls from Evaluate → At A Glance — pick which entries show here and in what order. Editing a value or label there updates it here automatically.
      </p>
      <HomeStatsEditor data={data} evaluateStats={evaluateStats} onChange={onChange} />

      <CMSSectionHeading id="work-featured-grid">Featured Grid</CMSSectionHeading>

      <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(20,173,181,0.05)", border: "1px solid rgba(20,173,181,0.15)" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.08em" }}>
          Select up to {MAX_FEATURED} published projects to display in the top grid. Use ↑ ↓ to reorder.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 mb-2" style={{ gap: "8px" }}>
        {featuredRows.map((p, pos) => {
          const canMoveUp = pos > 0;
          const canMoveDown = pos < featuredRows.length - 1;

          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
              style={{ background: "rgba(20,173,181,0.07)", border: "1px solid rgba(20,173,181,0.18)", ...featuredDrag.cardStyle(pos) }}
              {...featuredDrag.dropTargetProps(pos)}
            >
              <DragHandle {...featuredDrag.dragHandleProps(pos)} />

              {/* Position badge */}
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  background: "#14ADB5",
                  color: "#0C1117",
                }}
              >
                {pos + 1}
              </div>

              {/* Project info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "var(--c-heading)", fontWeight: 400, margin: 0 }}>
                  {p.name}
                </p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "rgba(140,154,163,0.6)", margin: 0 }}>
                  {p.client}
                </p>
              </div>

              {/* Reorder arrows (featured only) */}
              <div className="flex gap-1">
                <button
                  onClick={() => moveFeatured(p.id, -1)}
                  disabled={!canMoveUp}
                  title="Move up"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: canMoveUp ? "pointer" : "default",
                    color: canMoveUp ? "#EDE8DF" : "rgba(140,154,163,0.2)",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => moveFeatured(p.id, 1)}
                  disabled={!canMoveDown}
                  title="Move down"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: canMoveDown ? "pointer" : "default",
                    color: canMoveDown ? "#EDE8DF" : "rgba(140,154,163,0.2)",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <ArrowDown size={12} />
                </button>
              </div>

              {/* Remove from grid */}
              <button
                onClick={() => toggleFeatured(p.id)}
                title="Remove from grid"
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em", padding: "5px 12px", borderRadius: "6px", border: "1px solid rgba(192,57,43,0.25)", background: "none", color: "#EDE8DF", cursor: "pointer", flexShrink: 0, transition: "all 0.15s ease" }}
                className="hover:border-red-400/40 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {/* Add New Highlighted Project */}
      {(() => {
        const featuredSet = new Set(effectiveFeatured);
        const slotsLeft = MAX_FEATURED - effectiveFeatured.length;
        // All addable entries: non-featured CMSProjects + CS entries not already represented by a CMSProject
        const csOnlyEntries = data.caseStudies.filter(
          (cs) => !data.projects.some((p) =>
            cs.title.toLowerCase().includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(cs.title.toLowerCase().split(/\s*[–\-]\s*/)[0].trim())
          )
        );
        const availableEntries: { id: string; name: string; client: string; status?: string }[] = [
          ...data.projects
            .filter((p) => !featuredSet.has(p.id))
            .map((p) => ({ id: p.id, name: p.name, client: p.client, status: p.status ?? undefined })),
          ...csOnlyEntries
            .filter((cs) => !featuredSet.has(`cs-${cs.id}`))
            .map((cs) => ({ id: `cs-${cs.id}`, name: cs.title, client: cs.client, status: cs.status ?? undefined })),
        ];

        return (
          <div style={{ position: "relative", marginTop: 2 }}>
            {addPickerOpen && (
              <div style={{ position: "fixed", inset: 0, zIndex: 15 }} onClick={() => setAddPickerOpen(false)} />
            )}
            <button
              onClick={() => setAddPickerOpen((v) => !v)}
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#0F1519", background: "#14ADB5", border: "none", borderRadius: "10px", cursor: "pointer", padding: "10px 16px" }}
            >
              <Plus size={12} /> Add New Highlighted Project {slotsLeft > 0 && `(${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} free)`}
            </button>
            {addPickerOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, background: "#111820", border: "1px solid rgba(237,232,223,0.12)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxHeight: 360, overflowY: "auto" }}>
                {availableEntries.length === 0 ? (
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#EDE8DF", padding: "14px 16px", margin: 0 }}>All projects are already in the grid</p>
                ) : availableEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => { if (slotsLeft > 0) { toggleFeatured(entry.id); setAddPickerOpen(false); } }}
                    disabled={slotsLeft === 0}
                    className="hover:bg-white/5 transition-colors"
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px", background: "none", border: "none", borderBottom: "0.5px solid rgba(237,232,223,0.06)", cursor: slotsLeft > 0 ? "pointer" : "not-allowed", textAlign: "left", opacity: slotsLeft === 0 ? 0.4 : 1 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "var(--c-heading)", margin: 0, fontWeight: 400 }}>{entry.name}</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", margin: 0 }}>{entry.client}</p>
                    </div>
                    {entry.status && entry.status !== "published" && (
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: entry.status === "unpublished" ? "#E05252" : "#F59E0B", letterSpacing: "0.06em", flexShrink: 0 }}>{entry.status}</span>
                    )}
                    <Plus size={11} style={{ color: "#14ADB5", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "rgba(140,154,163,0.4)", letterSpacing: "0.06em", marginBottom: "24px", marginTop: 10 }}>
        {effectiveFeatured.length} / {MAX_FEATURED} slots filled
      </div>

      <ProjectCategoryManager data={data} onChange={onChange} />

      <CMSSectionHeading id="work-project-list">Project List</CMSSectionHeading>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#8C9AA3", marginTop: "-8px", marginBottom: "16px", lineHeight: 1.5 }}>
        Controls how the &quot;View more projects&quot; list appears on the public Work page, underneath the Featured Grid.
      </p>
      <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 mb-6">
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#6B7E8A", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Layout</p>
          <div className="flex gap-2">
            {([{ v: "list", l: "List view" }, { v: "card", l: "Card view" }] as { v: ProjectListLayout; l: string }[]).map((opt) => {
              const active = (data.projectListLayout ?? "list") === opt.v;
              return (
                <button
                  key={opt.v}
                  onClick={() => onChange({ ...data, projectListLayout: opt.v })}
                  style={{
                    fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.04em",
                    padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                    background: active ? "#14ADB5" : "rgba(237,232,223,0.04)",
                    border: `1px solid ${active ? "#14ADB5" : "rgba(237,232,223,0.1)"}`,
                    color: active ? "#0C1117" : "#EDE8DF",
                  }}
                >
                  {opt.l}
                </button>
              );
            })}
          </div>
        </div>
        {(data.projectListLayout ?? "list") === "card" && (
          <div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#6B7E8A", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Columns (large screens)</p>
            <select
              value={data.projectListColumns ?? 4}
              onChange={(e) => onChange({ ...data, projectListColumns: parseInt(e.target.value) })}
              style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: 8, padding: "8px 10px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none", cursor: "pointer", ...selectArrowStyle }}
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} per row</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#6B7E8A", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Rows to show</p>
          <select
            value={data.projectListRows ?? 3}
            onChange={(e) => onChange({ ...data, projectListRows: parseInt(e.target.value) })}
            style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: 8, padding: "8px 10px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none", cursor: "pointer", ...selectArrowStyle }}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} row{n > 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>
      </div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#6B7E8A", marginTop: "-10px", marginBottom: "24px", lineHeight: 1.5 }}>
        {(data.projectListLayout ?? "list") === "card"
          ? "Card columns step down automatically on smaller screens (3, then 2, then 1 per row). "
          : ""}
        Shows {data.projectListRows ?? 3} row{(data.projectListRows ?? 3) > 1 ? "s" : ""} at a time, with a &quot;Load more Projects&quot; button to reveal the next {data.projectListRows ?? 3}.
      </p>

      <CMSSectionHeading id="work-case-studies">Case Studies</CMSSectionHeading>
      <button
        onClick={addCase}
        className="flex items-center gap-2 mb-4 transition-opacity hover:opacity-80"
        style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#0F1519", background: "#14ADB5", border: "none", borderRadius: "10px", cursor: "pointer", padding: "8px 14px" }}
      >
        <Plus size={12} /> Add New Case Study
      </button>

      <ListToolbar
        search={csSearch}
        onSearchChange={setCsSearch}
        sort={csSort}
        onSortChange={setCsSort}
        placeholder="Search case studies…"
        resultCount={filteredFullCaseStudies.length}
        totalCount={fullCaseStudies.length}
      />
      {csSearch && filteredFullCaseStudies.length === 0 && (
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "rgba(140,154,163,0.5)", padding: "16px 4px" }}>
          No case studies match &quot;{csSearch}&quot;.
        </p>
      )}

      {filteredFullCaseStudies.map((cs) => (
        <CMSCard key={cs.id} ref={cs.id === justAddedId ? newCardRef : undefined} style={caseStudyDirtyStyle(cs)}>
          <div className="w-full flex flex-col lg:flex-row lg:items-center gap-3" style={{ position: "sticky", top: 0, zIndex: 5, background: "#141D24", margin: "-20px -20px 0", padding: "20px 20px 14px", borderRadius: "12px 12px 0 0" }}>
            {/* Clickable title area — stacks above the action row on narrow screens (a long
                title wrapping to several lines would otherwise squeeze against and vertically
                center oddly beside it); back to sitting alongside it, right-aligned, at lg. */}
            <div
              className="text-left w-full lg:flex-1 min-w-0"
              style={{ cursor: "pointer" }}
              onClick={() => setOpenId(openId === cs.id ? null : cs.id)}
            >
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "var(--c-heading)", fontWeight: 400, margin: 0 }}>
                {cs.title || "Untitled"}
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", margin: 0 }}>
                {cs.client}{agencySuffix(companies, cs.clientMode, cs.companyId)}
                <span style={{ marginLeft: 8, opacity: 0.45 }}>· {cs.updatedAt ? relativeTime(cs.updatedAt) : "—"}</span>
              </p>
            </div>

            {/* Action row — underneath the title on narrow screens, back to the right of it at lg */}
            <div className="w-full lg:w-auto flex items-center gap-3 flex-wrap lg:flex-nowrap">
            <ViewPageButton id={selfIdForCase(cs)} />

            {/* Status badge — automatic, read-only */}
            {(() => {
              const st = cs.status || "published";
              const color = st === "updated" ? "#F59E0B" : st === "unpublished" ? "#E05252" : st === "saved" ? "#14ADB5" : "#4CAF80";
              const bg    = st === "updated" ? "rgba(245,158,11,0.1)" : st === "unpublished" ? "rgba(224,82,82,0.1)" : st === "saved" ? "rgba(20,173,181,0.1)" : "rgba(76,175,128,0.1)";
              const label = st === "updated" ? "Updated" : st === "unpublished" ? "Unpublished" : st === "saved" ? "Saved" : "Published";
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: bg, border: `1px solid ${color}50`, borderRadius: 20, padding: "4px 10px", flexShrink: 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{label}</span>
                </div>
              );
            })()}

            {/* Save draft */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateCase(cs.id, { status: "saved" });
                setSavedId(cs.id);
                setTimeout(() => setSavedId((prev) => (prev === cs.id ? null : prev)), 1500);
              }}
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em",
                padding: "5px 12px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap", cursor: "pointer",
                border: savedId === cs.id ? "1px solid rgba(20,173,181,0.4)" : "1px solid rgba(237,232,223,0.15)",
                background: savedId === cs.id ? "rgba(20,173,181,0.15)" : "rgba(237,232,223,0.04)",
                color: savedId === cs.id ? "#14ADB5" : "#EDE8DF",
                transition: "all 0.2s ease",
              }}
            >
              {savedId === cs.id ? "Saved ✓" : "Save"}
            </button>

            {/* Publish */}
            <button
              onClick={(e) => { e.stopPropagation(); updateCase(cs.id, { status: "published" }); }}
              disabled={cs.status === "published" || !cs.status}
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em",
                padding: "5px 12px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap",
                border: "1px solid rgba(76,175,128,0.4)",
                background: (cs.status === "published" || !cs.status) ? "rgba(76,175,128,0.08)" : "rgba(76,175,128,0.18)",
                color: "#4CAF80",
                cursor: (cs.status === "published" || !cs.status) ? "default" : "pointer",
                opacity: (cs.status === "published" || !cs.status) ? 0.4 : 1,
                transition: "all 0.15s ease",
              }}
            >Publish</button>

            {/* Unpublish */}
            <button
              onClick={(e) => { e.stopPropagation(); updateCase(cs.id, { status: "unpublished" }); }}
              disabled={cs.status === "unpublished"}
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em",
                padding: "5px 12px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap",
                border: `1px solid ${cs.status === "unpublished" ? "rgba(224,82,82,0.4)" : "rgba(237,232,223,0.12)"}`,
                background: cs.status === "unpublished" ? "rgba(224,82,82,0.1)" : "none",
                color: cs.status === "unpublished" ? "#E05252" : "#EDE8DF",
                cursor: cs.status === "unpublished" ? "default" : "pointer",
                opacity: cs.status === "unpublished" ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
            >Unpublish</button>

            {/* Duplicate + Delete */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => duplicateCase(cs)}
                title="Duplicate case study"
                style={{ background: "none", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#EDE8DF", display: "flex", alignItems: "center" }}
              >
                <Copy size={12} />
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmId === cs.id) {
                    onChange({ ...data, caseStudies: data.caseStudies.filter((c) => c.id !== cs.id) });
                    setDeleteConfirmId(null);
                    if (openId === cs.id) setOpenId(null);
                  } else {
                    setDeleteConfirmId(cs.id);
                  }
                }}
                title={deleteConfirmId === cs.id ? "Click again to confirm" : "Delete case study"}
                style={{
                  background: deleteConfirmId === cs.id ? "rgba(192,57,43,0.15)" : "none",
                  border: `1px solid ${deleteConfirmId === cs.id ? "rgba(192,57,43,0.4)" : "rgba(237,232,223,0.1)"}`,
                  borderRadius: 6,
                  padding: deleteConfirmId === cs.id ? "5px 10px" : "5px 8px",
                  cursor: "pointer",
                  color: deleteConfirmId === cs.id ? "#C0392B" : "#EDE8DF",
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.04em",
                  transition: "all 0.15s ease", whiteSpace: "nowrap",
                }}
              >
                <Trash2 size={12} />
                {deleteConfirmId === cs.id && "Delete?"}
              </button>
            </div>

            {/* Toggle chevron */}
            <div
              style={{ cursor: "pointer", flexShrink: 0, padding: "4px", color: "#EDE8DF" }}
              onClick={() => setOpenId(openId === cs.id ? null : cs.id)}
            >
              {openId === cs.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            </div>
          </div>

          {openId === cs.id && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(237,232,223,0.06)" }}>
              {/* Full case study toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={!!cs.fullCaseStudy}
                  onChange={(e) => updateCase(cs.id, { fullCaseStudy: e.target.checked, ...(e.target.checked ? {} : { fullCaseStudyLocked: false, fullCaseStudyPassword: undefined }) })}
                  style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
                  Create full case study
                </span>
              </label>

              {/* Lock case study toggle — independent of "Create full case study"; locks the project popup itself */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={!!cs.fullCaseStudyLocked}
                  onChange={(e) => updateCase(cs.id, { fullCaseStudyLocked: e.target.checked, ...(!e.target.checked ? { fullCaseStudyPassword: undefined } : {}) })}
                  style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
                  Lock case study
                </span>
              </label>
              {cs.fullCaseStudyLocked && (
                <div style={{ marginBottom: 12, marginLeft: 24 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                    Access password
                  </label>
                  <PasswordField
                    value={cs.fullCaseStudyPassword || ""}
                    onChange={(v) => updateCase(cs.id, { fullCaseStudyPassword: v || undefined })}
                  />
                </div>
              )}

              <div style={{ marginBottom: 24 }} />

              <ClientField
                mode={cs.clientMode ?? "custom"}
                clientValue={cs.client}
                companyId={cs.companyId}
                companies={companies}
                onModeChange={(m) => updateCase(cs.id, { clientMode: m })}
                onClientChange={(v) => updateCase(cs.id, { client: v })}
                onCompanyChange={(id) => updateCase(cs.id, { companyId: id })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CMSInput label="Title" value={cs.title} onChange={(v) => updateCase(cs.id, { title: v })} />
                <CMSUrlInput label="Live URL (optional)" value={cs.liveUrl || ""} onChange={(v) => updateCase(cs.id, { liveUrl: v || undefined })} />
              </div>
              {(() => {
                const dual = data.projects.find((p) => resolveLinkedCaseStudy(p, data.caseStudies)?.id === cs.id);
                return dual ? (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -8, marginBottom: 16, lineHeight: 1.5 }}>
                    This case study shares its page with the linked project &ldquo;{dual.name}&rdquo; — set its URL Path in the project&rsquo;s own editor instead.
                  </p>
                ) : (
                  <CMSSlugInput label="URL Path" value={cs.slug || ""} fallback={`cs-${cs.id}`} onChange={(v) => updateCase(cs.id, { slug: v || undefined })} />
                );
              })()}

              <ResponsiveRichTextEditor
                label="Summary"
                value={cs.summary}
                onChange={(v) => updateCase(cs.id, { summary: v })}
                mobileValue={cs.summaryMobile}
                onMobileChange={(v) => updateCase(cs.id, { summaryMobile: v })}
              />
              <CMSTextarea
                label="SEO Meta Description (optional — under ~155 characters; falls back to the linked project's own description if left blank)"
                value={cs.metaDescription || ""}
                onChange={(v) => updateCase(cs.id, { metaDescription: v || undefined })}
                rows={2}
              />

              <LinkedProjectField cs={cs} allCaseStudies={data.caseStudies} projects={data.projects} onLink={(projectId) => setLinkedProject(cs.id, projectId)} />

              {/* ── Images ──────────────────────────────────────── */}
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", letterSpacing: "0.1em", marginBottom: 8, marginTop: 4 }}>
                IMAGES
              </div>
              {/* Row 1 — Cover + Cover Image (Hover) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <ImagePicker
                  label="Cover image · 16:9 (shown in grid card AND on the full case study page)"
                  previewRatio="16/9"
                  value={cs.coverImageUrl}
                  position={cs.coverImagePosition}
                  scale={cs.coverImageScale}
                  onChange={(src) => updateCase(cs.id, { coverImageUrl: src })}
                  onPositionChange={(pos) => updateCase(cs.id, { coverImagePosition: pos })}
                  onScaleChange={(s) => updateCase(cs.id, { coverImageScale: s })}
                />
                <ImagePicker
                  label="Cover image (hover) · 16:9 — optional, replaces cover image on hover"
                  previewRatio="16/9"
                  value={cs.coverImageHoverUrl}
                  position={cs.coverImageHoverPosition}
                  scale={cs.coverImageHoverScale}
                  onChange={(src) => updateCase(cs.id, { coverImageHoverUrl: src })}
                  onPositionChange={(pos) => updateCase(cs.id, { coverImageHoverPosition: pos })}
                  onScaleChange={(s) => updateCase(cs.id, { coverImageHoverScale: s })}
                />
              </div>
              {/* Row 1b — Hero image, on its own row underneath the covers */}
              <div style={{ marginBottom: 16 }}>
                <ImagePicker
                  label="Hero image · 3:4 portrait (1200×1600)"
                  previewRatio="3/4"
                  allowTallScroll
                  value={cs.heroImageUrl}
                  position={cs.heroImagePosition}
                  scale={cs.heroImageScale}
                  onChange={(src) => updateCase(cs.id, { heroImageUrl: src || undefined })}
                  onPositionChange={(pos) => updateCase(cs.id, { heroImagePosition: pos })}
                  onScaleChange={(s) => updateCase(cs.id, { heroImageScale: s })}
                />
                {/* Auto-shown only when the hero image is tall enough to actually need
                    scrolling (see FeaturedProjects.tsx) — this overrides that off when it
                    still doesn't feel warranted, or forces it on. */}
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#8C9AA3", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                    Hide scroll indicator
                  </label>
                  <Switch
                    checked={!!cs.hideScrollIndicator}
                    onChange={(checked) => updateCase(cs.id, { hideScrollIndicator: checked })}
                  />
                </div>
              </div>
              {/* Row 2 — 3 Highlights */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 10, alignItems: "center" }}>
                <ImagePicker
                  label="Highlight 1 · 4:3 (800×600)"
                  previewRatio="4/3"
                  value={cs.img1Url}
                  position={cs.img1Position}
                  scale={cs.img1Scale}
                  onChange={(src) => updateCase(cs.id, { img1Url: src || undefined })}
                  onPositionChange={(pos) => updateCase(cs.id, { img1Position: pos })}
                  onScaleChange={(s) => updateCase(cs.id, { img1Scale: s })}
                />
                <HighlightSwapButton onSwap={() => updateCase(cs.id, swapCaseHighlights(cs, 1, 2))} />
                <ImagePicker
                  label="Highlight 2 · 4:3 (800×600)"
                  previewRatio="4/3"
                  value={cs.img2Url}
                  position={cs.img2Position}
                  scale={cs.img2Scale}
                  onChange={(src) => updateCase(cs.id, { img2Url: src || undefined })}
                  onPositionChange={(pos) => updateCase(cs.id, { img2Position: pos })}
                  onScaleChange={(s) => updateCase(cs.id, { img2Scale: s })}
                />
                <HighlightSwapButton onSwap={() => updateCase(cs.id, swapCaseHighlights(cs, 2, 3))} />
                <ImagePicker
                  label="Highlight 3 · 4:3 (800×600)"
                  previewRatio="4/3"
                  value={cs.img3Url}
                  position={cs.img3Position}
                  scale={cs.img3Scale}
                  onChange={(src) => updateCase(cs.id, { img3Url: src || undefined })}
                  onPositionChange={(pos) => updateCase(cs.id, { img3Position: pos })}
                  onScaleChange={(s) => updateCase(cs.id, { img3Scale: s })}
                />
              </div>

              <ResponsiveRichTextEditor
                label="Project Detail (rich text — shown between summary and outcomes)"
                value={cs.fullContent || ""}
                onChange={(v) => updateCase(cs.id, { fullContent: v })}
                mobileValue={cs.fullContentMobile}
                onMobileChange={(v) => updateCase(cs.id, { fullContentMobile: v })}
              />

              {cs.fullCaseStudy && (
                <div style={{ marginBottom: 8 }}>
                  <ImagePicker
                    label="Banner image · 2560×840px recommended (3:1 wide panoramic)"
                    previewRatio="3/1"
                    value={cs.fullCaseStudyBannerUrl}
                    onChange={(src) => updateCase(cs.id, { fullCaseStudyBannerUrl: src || undefined })}
                  />
                  <ResponsiveRichTextEditor
                    label="Full Case Study content (additional detail shown on the full case study page)"
                    value={cs.fullCaseStudyContent || ""}
                    onChange={(v) => updateCase(cs.id, { fullCaseStudyContent: v })}
                    mobileValue={cs.fullCaseStudyContentMobile}
                    onMobileChange={(v) => updateCase(cs.id, { fullCaseStudyContentMobile: v })}
                  />
                </div>
              )}

              <CMSArrayEditor label="Key Outcomes" items={cs.outcomes} onChange={(v) => updateCase(cs.id, { outcomes: v })} />
              <CMSChipEditor label="Tags" items={cs.tags} onChange={(v) => updateCase(cs.id, { tags: v })} />
              <CategoryToggleRow
                categories={data.projectCategories ?? []}
                selected={cs.categories ?? []}
                onChange={(next) => updateCase(cs.id, { categories: next })}
              />

              <ViewMoreEditor
                currentId={selfIdForCase(cs)}
                heading={cs.viewMoreHeading || ""}
                pinnedIds={cs.viewMorePinnedIds || []}
                category={cs.viewMoreCategory}
                sort={cs.viewMoreSort}
                allEntries={allEntries}
                allTags={allTags}
                onChange={(patch) => updateCase(cs.id, patch)}
              />
            </div>
          )}
        </CMSCard>
      ))}

      {(draftCaseStudies.length > 0 || standaloneProjects.length > 0) && (
        <>
          <CMSSectionHeading id="work-projects">Projects</CMSSectionHeading>

          <ListToolbar
            search={projSearch}
            onSearchChange={setProjSearch}
            sort={projSort}
            onSortChange={setProjSort}
            placeholder="Search projects…"
            resultCount={projResultCount}
            totalCount={projTotalCount}
          />
          {projSearch && projResultCount === 0 && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "rgba(140,154,163,0.5)", padding: "16px 4px" }}>
              No projects match &quot;{projSearch}&quot;.
            </p>
          )}
        </>
      )}

      {projectsListEntries.map((entry) => {
        if (entry.kind === "cs") {
          const cs = entry.cs;
          return (
            <CMSCard key={`cs-${cs.id}`} ref={cs.id === justAddedId ? newCardRef : undefined} style={caseStudyDirtyStyle(cs)}>
            <div className="w-full flex flex-col lg:flex-row lg:items-center gap-3" style={{ position: "sticky", top: 0, zIndex: 5, background: "#141D24", margin: "-20px -20px 0", padding: "20px 20px 14px", borderRadius: "12px 12px 0 0" }}>
              {/* Clickable title area — stacks above the action row on narrow screens (a long
                  title wrapping to several lines would otherwise squeeze against and vertically
                  center oddly beside it); back to sitting alongside it, right-aligned, at lg. */}
              <div
                className="text-left w-full lg:flex-1 min-w-0"
                style={{ cursor: "pointer" }}
                onClick={() => setOpenId(openId === cs.id ? null : cs.id)}
              >
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "var(--c-heading)", fontWeight: 400, margin: 0 }}>
                  {cs.title || "Untitled"}
                </p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", margin: 0 }}>
                  {cs.client}{agencySuffix(companies, cs.clientMode, cs.companyId)}
                  <span style={{ marginLeft: 8, opacity: 0.45 }}>· {cs.updatedAt ? relativeTime(cs.updatedAt) : "—"}</span>
                </p>
              </div>

              {/* Action row — underneath the title on narrow screens, back to the right of it at lg */}
              <div className="w-full lg:w-auto flex items-center gap-3 flex-wrap lg:flex-nowrap">
              <ViewPageButton id={selfIdForCase(cs)} />

              {/* Status badge — automatic, read-only */}
              {(() => {
                const st = cs.status || "published";
                const color = st === "updated" ? "#F59E0B" : st === "unpublished" ? "#E05252" : st === "saved" ? "#14ADB5" : "#4CAF80";
                const bg    = st === "updated" ? "rgba(245,158,11,0.1)" : st === "unpublished" ? "rgba(224,82,82,0.1)" : st === "saved" ? "rgba(20,173,181,0.1)" : "rgba(76,175,128,0.1)";
                const label = st === "updated" ? "Updated" : st === "unpublished" ? "Unpublished" : st === "saved" ? "Saved" : "Published";
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, background: bg, border: `1px solid ${color}50`, borderRadius: 20, padding: "4px 10px", flexShrink: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                );
              })()}

              {/* Save draft */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateCase(cs.id, { status: "saved" });
                  setSavedId(cs.id);
                  setTimeout(() => setSavedId((prev) => (prev === cs.id ? null : prev)), 1500);
                }}
                style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em",
                  padding: "5px 12px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap", cursor: "pointer",
                  border: savedId === cs.id ? "1px solid rgba(20,173,181,0.4)" : "1px solid rgba(237,232,223,0.15)",
                  background: savedId === cs.id ? "rgba(20,173,181,0.15)" : "rgba(237,232,223,0.04)",
                  color: savedId === cs.id ? "#14ADB5" : "#EDE8DF",
                  transition: "all 0.2s ease",
                }}
              >
                {savedId === cs.id ? "Saved ✓" : "Save"}
              </button>

              {/* Publish */}
              <button
                onClick={(e) => { e.stopPropagation(); updateCase(cs.id, { status: "published" }); }}
                disabled={cs.status === "published" || !cs.status}
                style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em",
                  padding: "5px 12px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap",
                  border: "1px solid rgba(76,175,128,0.4)",
                  background: (cs.status === "published" || !cs.status) ? "rgba(76,175,128,0.08)" : "rgba(76,175,128,0.18)",
                  color: "#4CAF80",
                  cursor: (cs.status === "published" || !cs.status) ? "default" : "pointer",
                  opacity: (cs.status === "published" || !cs.status) ? 0.4 : 1,
                  transition: "all 0.15s ease",
                }}
              >Publish</button>

              {/* Unpublish */}
              <button
                onClick={(e) => { e.stopPropagation(); updateCase(cs.id, { status: "unpublished" }); }}
                disabled={cs.status === "unpublished"}
                style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em",
                  padding: "5px 12px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap",
                  border: `1px solid ${cs.status === "unpublished" ? "rgba(224,82,82,0.4)" : "rgba(237,232,223,0.12)"}`,
                  background: cs.status === "unpublished" ? "rgba(224,82,82,0.1)" : "none",
                  color: cs.status === "unpublished" ? "#E05252" : "#EDE8DF",
                  cursor: cs.status === "unpublished" ? "default" : "pointer",
                  opacity: cs.status === "unpublished" ? 0.5 : 1,
                  transition: "all 0.15s ease",
                }}
              >Unpublish</button>

              {/* Duplicate + Delete */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => duplicateCase(cs)}
                  title="Duplicate case study"
                  style={{ background: "none", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#EDE8DF", display: "flex", alignItems: "center" }}
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirmId === cs.id) {
                      onChange({ ...data, caseStudies: data.caseStudies.filter((c) => c.id !== cs.id) });
                      setDeleteConfirmId(null);
                      if (openId === cs.id) setOpenId(null);
                    } else {
                      setDeleteConfirmId(cs.id);
                    }
                  }}
                  title={deleteConfirmId === cs.id ? "Click again to confirm" : "Delete case study"}
                  style={{
                    background: deleteConfirmId === cs.id ? "rgba(192,57,43,0.15)" : "none",
                    border: `1px solid ${deleteConfirmId === cs.id ? "rgba(192,57,43,0.4)" : "rgba(237,232,223,0.1)"}`,
                    borderRadius: 6,
                    padding: deleteConfirmId === cs.id ? "5px 10px" : "5px 8px",
                    cursor: "pointer",
                    color: deleteConfirmId === cs.id ? "#C0392B" : "#EDE8DF",
                    display: "flex", alignItems: "center", gap: 5,
                    fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.04em",
                    transition: "all 0.15s ease", whiteSpace: "nowrap",
                  }}
                >
                  <Trash2 size={12} />
                  {deleteConfirmId === cs.id && "Delete?"}
                </button>
              </div>

              {/* Toggle chevron */}
              <div
                style={{ cursor: "pointer", flexShrink: 0, padding: "4px", color: "#EDE8DF" }}
                onClick={() => setOpenId(openId === cs.id ? null : cs.id)}
              >
                {openId === cs.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              </div>
            </div>

            {openId === cs.id && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(237,232,223,0.06)" }}>
                {/* Full case study toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={!!cs.fullCaseStudy}
                    onChange={(e) => updateCase(cs.id, { fullCaseStudy: e.target.checked, ...(e.target.checked ? {} : { fullCaseStudyLocked: false, fullCaseStudyPassword: undefined }) })}
                    style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
                    Create full case study
                  </span>
                </label>

                {/* Lock case study toggle — independent of "Create full case study"; locks the project popup itself */}
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={!!cs.fullCaseStudyLocked}
                    onChange={(e) => updateCase(cs.id, { fullCaseStudyLocked: e.target.checked, ...(!e.target.checked ? { fullCaseStudyPassword: undefined } : {}) })}
                    style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
                    Lock case study
                  </span>
                </label>
                {cs.fullCaseStudyLocked && (
                  <div style={{ marginBottom: 12, marginLeft: 24 }}>
                    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                      Access password
                    </label>
                    <PasswordField
                      value={cs.fullCaseStudyPassword || ""}
                      onChange={(v) => updateCase(cs.id, { fullCaseStudyPassword: v || undefined })}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 24 }} />

                <ClientField
                  mode={cs.clientMode ?? "custom"}
                  clientValue={cs.client}
                  companyId={cs.companyId}
                  companies={companies}
                  onModeChange={(m) => updateCase(cs.id, { clientMode: m })}
                  onClientChange={(v) => updateCase(cs.id, { client: v })}
                  onCompanyChange={(id) => updateCase(cs.id, { companyId: id })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CMSInput label="Title" value={cs.title} onChange={(v) => updateCase(cs.id, { title: v })} />
                  <CMSUrlInput label="Live URL (optional)" value={cs.liveUrl || ""} onChange={(v) => updateCase(cs.id, { liveUrl: v || undefined })} />
                </div>
                {(() => {
                  const dual = data.projects.find((p) => resolveLinkedCaseStudy(p, data.caseStudies)?.id === cs.id);
                  return dual ? (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -8, marginBottom: 16, lineHeight: 1.5 }}>
                      This case study shares its page with the linked project &ldquo;{dual.name}&rdquo; — set its URL Path in the project&rsquo;s own editor instead.
                    </p>
                  ) : (
                    <CMSSlugInput label="URL Path" value={cs.slug || ""} fallback={`cs-${cs.id}`} onChange={(v) => updateCase(cs.id, { slug: v || undefined })} />
                  );
                })()}

                <ResponsiveRichTextEditor
                label="Summary"
                value={cs.summary}
                onChange={(v) => updateCase(cs.id, { summary: v })}
                mobileValue={cs.summaryMobile}
                onMobileChange={(v) => updateCase(cs.id, { summaryMobile: v })}
              />
                <CMSTextarea
                  label="SEO Meta Description (optional — under ~155 characters; falls back to the linked project's own description if left blank)"
                  value={cs.metaDescription || ""}
                  onChange={(v) => updateCase(cs.id, { metaDescription: v || undefined })}
                  rows={2}
                />

                <LinkedProjectField cs={cs} allCaseStudies={data.caseStudies} projects={data.projects} onLink={(projectId) => setLinkedProject(cs.id, projectId)} />

                {/* ── Images ──────────────────────────────────────── */}
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", letterSpacing: "0.1em", marginBottom: 8, marginTop: 4 }}>
                  IMAGES
                </div>
                {/* Row 1 — Cover + Cover Image (Hover) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <ImagePicker
                    label="Cover image · 16:9 (shown in grid card AND on the full case study page)"
                    previewRatio="16/9"
                    value={cs.coverImageUrl}
                    position={cs.coverImagePosition}
                    scale={cs.coverImageScale}
                    onChange={(src) => updateCase(cs.id, { coverImageUrl: src })}
                    onPositionChange={(pos) => updateCase(cs.id, { coverImagePosition: pos })}
                    onScaleChange={(s) => updateCase(cs.id, { coverImageScale: s })}
                  />
                  <ImagePicker
                    label="Cover image (hover) · 16:9 — optional, replaces cover image on hover"
                    previewRatio="16/9"
                    value={cs.coverImageHoverUrl}
                    position={cs.coverImageHoverPosition}
                    scale={cs.coverImageHoverScale}
                    onChange={(src) => updateCase(cs.id, { coverImageHoverUrl: src })}
                    onPositionChange={(pos) => updateCase(cs.id, { coverImageHoverPosition: pos })}
                    onScaleChange={(s) => updateCase(cs.id, { coverImageHoverScale: s })}
                  />
                </div>
                {/* Row 1b — Hero image, on its own row underneath the covers */}
                <div style={{ marginBottom: 16 }}>
                  <ImagePicker
                    label="Hero image · 3:4 portrait (1200×1600)"
                    previewRatio="3/4"
                    allowTallScroll
                    value={cs.heroImageUrl}
                    position={cs.heroImagePosition}
                    scale={cs.heroImageScale}
                    onChange={(src) => updateCase(cs.id, { heroImageUrl: src || undefined })}
                    onPositionChange={(pos) => updateCase(cs.id, { heroImagePosition: pos })}
                    onScaleChange={(s) => updateCase(cs.id, { heroImageScale: s })}
                  />
                  {/* Auto-shown only when the hero image is tall enough to actually need
                      scrolling (see FeaturedProjects.tsx) — this overrides that off when it
                      still doesn't feel warranted, or forces it on. */}
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#8C9AA3", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                      Hide scroll indicator
                    </label>
                    <Switch
                      checked={!!cs.hideScrollIndicator}
                      onChange={(checked) => updateCase(cs.id, { hideScrollIndicator: checked })}
                    />
                  </div>
                </div>
                {/* Row 2 — 3 Highlights */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 10, alignItems: "center" }}>
                  <ImagePicker
                    label="Highlight 1 · 4:3 (800×600)"
                    previewRatio="4/3"
                    value={cs.img1Url}
                    position={cs.img1Position}
                    scale={cs.img1Scale}
                    onChange={(src) => updateCase(cs.id, { img1Url: src || undefined })}
                    onPositionChange={(pos) => updateCase(cs.id, { img1Position: pos })}
                    onScaleChange={(s) => updateCase(cs.id, { img1Scale: s })}
                  />
                  <HighlightSwapButton onSwap={() => updateCase(cs.id, swapCaseHighlights(cs, 1, 2))} />
                  <ImagePicker
                    label="Highlight 2 · 4:3 (800×600)"
                    previewRatio="4/3"
                    value={cs.img2Url}
                    position={cs.img2Position}
                    scale={cs.img2Scale}
                    onChange={(src) => updateCase(cs.id, { img2Url: src || undefined })}
                    onPositionChange={(pos) => updateCase(cs.id, { img2Position: pos })}
                    onScaleChange={(s) => updateCase(cs.id, { img2Scale: s })}
                  />
                  <HighlightSwapButton onSwap={() => updateCase(cs.id, swapCaseHighlights(cs, 2, 3))} />
                  <ImagePicker
                    label="Highlight 3 · 4:3 (800×600)"
                    previewRatio="4/3"
                    value={cs.img3Url}
                    position={cs.img3Position}
                    scale={cs.img3Scale}
                    onChange={(src) => updateCase(cs.id, { img3Url: src || undefined })}
                    onPositionChange={(pos) => updateCase(cs.id, { img3Position: pos })}
                    onScaleChange={(s) => updateCase(cs.id, { img3Scale: s })}
                  />
                </div>

                <ResponsiveRichTextEditor
                  label="Project Detail (rich text — shown between summary and outcomes)"
                  value={cs.fullContent || ""}
                  onChange={(v) => updateCase(cs.id, { fullContent: v })}
                  mobileValue={cs.fullContentMobile}
                  onMobileChange={(v) => updateCase(cs.id, { fullContentMobile: v })}
                />

                {cs.fullCaseStudy && (
                  <div style={{ marginBottom: 8 }}>
                    <ImagePicker
                      label="Banner image · 2560×840px recommended (3:1 wide panoramic)"
                      previewRatio="3/1"
                      value={cs.fullCaseStudyBannerUrl}
                      onChange={(src) => updateCase(cs.id, { fullCaseStudyBannerUrl: src || undefined })}
                    />
                    <ResponsiveRichTextEditor
                      label="Full Case Study content (additional detail shown on the full case study page)"
                      value={cs.fullCaseStudyContent || ""}
                      onChange={(v) => updateCase(cs.id, { fullCaseStudyContent: v })}
                      mobileValue={cs.fullCaseStudyContentMobile}
                      onMobileChange={(v) => updateCase(cs.id, { fullCaseStudyContentMobile: v })}
                    />
                  </div>
                )}

                <CMSArrayEditor label="Key Outcomes" items={cs.outcomes} onChange={(v) => updateCase(cs.id, { outcomes: v })} />
                <CMSChipEditor label="Tags" items={cs.tags} onChange={(v) => updateCase(cs.id, { tags: v })} />
                <CategoryToggleRow
                  categories={data.projectCategories ?? []}
                  selected={cs.categories ?? []}
                  onChange={(next) => updateCase(cs.id, { categories: next })}
                />

                <ViewMoreEditor
                  currentId={selfIdForCase(cs)}
                  heading={cs.viewMoreHeading || ""}
                  pinnedIds={cs.viewMorePinnedIds || []}
                  category={cs.viewMoreCategory}
                  sort={cs.viewMoreSort}
                  allEntries={allEntries}
                  allTags={allTags}
                  onChange={(patch) => updateCase(cs.id, patch)}
                />
              </div>
            )}
            </CMSCard>
          );
        }
        const p = entry.p;
        return (
          <CMSCard key={`proj-${p.id}`} style={projectDirtyStyle(p)}>
            <div className="w-full flex flex-col lg:flex-row lg:items-center gap-3" style={{ position: "sticky", top: 0, zIndex: 5, background: "#141D24", margin: "-20px -20px 0", padding: "20px 20px 14px", borderRadius: "12px 12px 0 0" }}>
              {/* Clickable title area — stacks above the action row on narrow screens (a long
                  name wrapping to several lines would otherwise squeeze against and vertically
                  center oddly beside it); back to sitting alongside it, right-aligned, at lg. */}
              <div className="w-full lg:flex-1 min-w-0" style={{ cursor: "pointer" }} onClick={() => setOpenProjId(openProjId === p.id ? null : p.id)}>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "var(--c-heading)", fontWeight: 400, margin: 0 }}>{p.name}</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", margin: 0 }}>
                  {p.client}{agencySuffix(companies, p.clientMode, p.companyId)}
                  <span style={{ marginLeft: 8, opacity: 0.45 }}>· {p.updatedAt ? relativeTime(p.updatedAt) : "—"}</span>
                </p>
              </div>

              {/* Action row — underneath the title on narrow screens, back to the right of it at lg */}
              <div className="w-full lg:w-auto flex items-center gap-3 flex-wrap lg:flex-nowrap">
              <ViewPageButton id={projectUrlSlug(p)} />
              {/* Status badge */}
              {(() => {
                const st = p.status || "published";
                const color = st === "updated" ? "#F59E0B" : st === "unpublished" ? "#E05252" : "#4CAF80";
                const bg    = st === "updated" ? "rgba(245,158,11,0.1)" : st === "unpublished" ? "rgba(224,82,82,0.1)" : "rgba(76,175,128,0.1)";
                const label = st === "updated" ? "Updated" : st === "unpublished" ? "Unpublished" : "Published";
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, background: bg, border: `1px solid ${color}50`, borderRadius: 20, padding: "4px 10px", flexShrink: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                );
              })()}
              {/* Save draft — first, matching case study order */}
              <button
                onClick={(e) => { e.stopPropagation(); updateProject(p.id, { status: "saved" }); setSavedProjId(p.id); setTimeout(() => setSavedProjId((prev) => (prev === p.id ? null : prev)), 1500); }}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em", padding: "5px 12px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap", cursor: "pointer", border: `1px solid ${savedProjId === p.id ? "rgba(20,173,181,0.4)" : "rgba(237,232,223,0.15)"}`, background: savedProjId === p.id ? "rgba(20,173,181,0.12)" : "rgba(237,232,223,0.04)", color: savedProjId === p.id ? "#14ADB5" : "#EDE8DF", transition: "all 0.2s ease" }}
              >{savedProjId === p.id ? "Saved ✓" : "Save"}</button>
              <button
                onClick={(e) => { e.stopPropagation(); updateProject(p.id, { status: "published" }); }}
                disabled={p.status === "published" || !p.status}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em", padding: "5px 12px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap", border: "1px solid rgba(76,175,128,0.4)", background: (p.status === "published" || !p.status) ? "rgba(76,175,128,0.08)" : "rgba(76,175,128,0.18)", color: "#4CAF80", cursor: (p.status === "published" || !p.status) ? "default" : "pointer", opacity: (p.status === "published" || !p.status) ? 0.4 : 1, transition: "all 0.15s ease" }}
              >Publish</button>
              <button
                onClick={(e) => { e.stopPropagation(); updateProject(p.id, { status: "unpublished" }); }}
                disabled={p.status === "unpublished"}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em", padding: "5px 12px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap", border: `1px solid ${p.status === "unpublished" ? "rgba(224,82,82,0.4)" : "rgba(237,232,223,0.12)"}`, background: p.status === "unpublished" ? "rgba(224,82,82,0.1)" : "none", color: p.status === "unpublished" ? "#E05252" : "#EDE8DF", cursor: p.status === "unpublished" ? "default" : "pointer", opacity: p.status === "unpublished" ? 0.5 : 1, transition: "all 0.15s ease" }}
              >Unpublish</button>
              {/* Duplicate */}
              <button
                onClick={(e) => { e.stopPropagation(); duplicateProject(p); }}
                title="Duplicate project"
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(237,232,223,0.1)", background: "none", color: "#EDE8DF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <Copy size={12} />
              </button>
              {/* Delete with confirm */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (deleteConfirmProjId === p.id) {
                    onChange({
                      ...data,
                      projects: data.projects.filter((x) => x.id !== p.id),
                      deletedProjectIds: [...(data.deletedProjectIds ?? []), p.id],
                    });
                    setDeleteConfirmProjId(null);
                  } else {
                    setDeleteConfirmProjId(p.id);
                  }
                }}
                title={deleteConfirmProjId === p.id ? "Click again to confirm" : "Delete project"}
                style={{ height: 28, borderRadius: 6, border: `1px solid ${deleteConfirmProjId === p.id ? "rgba(192,57,43,0.4)" : "rgba(237,232,223,0.1)"}`, background: deleteConfirmProjId === p.id ? "rgba(192,57,43,0.15)" : "none", color: deleteConfirmProjId === p.id ? "#C0392B" : "#EDE8DF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0, padding: deleteConfirmProjId === p.id ? "5px 10px" : "5px 8px", transition: "all 0.15s ease" }}
              >
                <Trash2 size={12} />
                {deleteConfirmProjId === p.id && "Delete?"}
              </button>
              <div style={{ cursor: "pointer", flexShrink: 0, padding: "4px", color: "#EDE8DF" }} onClick={() => setOpenProjId(openProjId === p.id ? null : p.id)}>
                {openProjId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              </div>
            </div>

            {openProjId === p.id && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(237,232,223,0.06)" }}>
                {/* Full case study toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={!!p.fullCaseStudy}
                    onChange={(e) => updateProject(p.id, { fullCaseStudy: e.target.checked, ...(e.target.checked ? {} : { fullCaseStudyLocked: false, fullCaseStudyPassword: undefined }) })}
                    style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
                    Create full case study
                  </span>
                </label>

                {/* Lock case study toggle — independent of "Create full case study"; locks the project popup itself */}
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={!!p.fullCaseStudyLocked}
                    onChange={(e) => updateProject(p.id, { fullCaseStudyLocked: e.target.checked, ...(!e.target.checked ? { fullCaseStudyPassword: undefined } : {}) })}
                    style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
                    Lock case study
                  </span>
                </label>
                {p.fullCaseStudyLocked && (
                  <div style={{ marginBottom: 12, marginLeft: 24 }}>
                    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                      Access password
                    </label>
                    <PasswordField
                      value={p.fullCaseStudyPassword || ""}
                      onChange={(v) => updateProject(p.id, { fullCaseStudyPassword: v || undefined })}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 24 }} />

                <ClientField
                  mode={p.clientMode ?? "custom"}
                  clientValue={p.client}
                  companyId={p.companyId}
                  companies={companies}
                  onModeChange={(m) => updateProject(p.id, { clientMode: m })}
                  onClientChange={(v) => updateProject(p.id, { client: v })}
                  onCompanyChange={(id) => updateProject(p.id, { companyId: id })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CMSInput label="Name" value={p.name} onChange={(v) => updateProject(p.id, { name: v })} />
                  <CMSUrlInput label="Live URL (optional)" value={p.live || ""} onChange={(v) => updateProject(p.id, { live: v || null })} />
                </div>
                <CMSSlugInput label="URL Path" value={p.slug || ""} fallback={p.id} onChange={(v) => updateProject(p.id, { slug: v || undefined })} />
                <ResponsiveRichTextEditor
                  label="Description"
                  value={p.desc}
                  onChange={(v) => updateProject(p.id, { desc: v })}
                  mobileValue={p.descMobile}
                  onMobileChange={(v) => updateProject(p.id, { descMobile: v })}
                />
                <CMSTextarea
                  label="SEO Meta Description (optional — under ~155 characters, complete sentence; falls back to an auto-truncated Description above if left blank)"
                  value={p.metaDescription || ""}
                  onChange={(v) => updateProject(p.id, { metaDescription: v || undefined })}
                  rows={2}
                />

                {(() => {
                  const autoMatch = resolveLinkedCaseStudy({ ...p, linkedCaseStudyId: undefined }, data.caseStudies);
                  return (
                    <div className="flex flex-col mb-4">
                      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                        Linked Case Study (optional)
                      </label>
                      <select
                        value={p.linkedCaseStudyId ?? ""}
                        onChange={(e) => updateProject(p.id, { linkedCaseStudyId: e.target.value ? Number(e.target.value) : undefined })}
                        style={{
                          width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "8px",
                          padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#EDE8DF", fontWeight: 300, outline: "none",
                          ...selectArrowStyle,
                        }}
                      >
                        <option value="">{autoMatch ? `None set — currently auto-matched by title to "${autoMatch.title}"` : "None"}</option>
                        {data.caseStudies.map((cs) => (
                          <option key={cs.id} value={cs.id}>{cs.title}</option>
                        ))}
                      </select>
                      {autoMatch && !p.linkedCaseStudyId && (
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8C9AA3", marginTop: 6, lineHeight: 1.5 }}>
                          Renaming either title could silently break this auto-match — pick it explicitly above to make the link permanent.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* ── Images ──────────────────────────────────────── */}
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, marginTop: 4 }}>IMAGES</div>
                {/* Row 1 — Cover + Cover Image (Hover) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <ImagePicker
                    label="Cover image · 16:9 (shown in grid card)"
                    previewRatio="16/9"
                    value={p.coverImageUrl}
                    position={p.coverImagePosition}
                    scale={p.coverImageScale}
                    onChange={(src) => updateProject(p.id, { coverImageUrl: src })}
                    onPositionChange={(pos) => updateProject(p.id, { coverImagePosition: pos })}
                    onScaleChange={(s) => updateProject(p.id, { coverImageScale: s })}
                  />
                  <ImagePicker
                    label="Cover image (hover) · 16:9 — optional, replaces cover image on hover"
                    previewRatio="16/9"
                    value={p.coverImageHoverUrl}
                    position={p.coverImageHoverPosition}
                    scale={p.coverImageHoverScale}
                    onChange={(src) => updateProject(p.id, { coverImageHoverUrl: src })}
                    onPositionChange={(pos) => updateProject(p.id, { coverImageHoverPosition: pos })}
                    onScaleChange={(s) => updateProject(p.id, { coverImageHoverScale: s })}
                  />
                </div>
                {/* Row 1b — Hero image, on its own row underneath the covers */}
                <div style={{ marginBottom: 16 }}>
                  <ImagePicker
                    label="Hero image · 3:4 portrait (1200×1600)"
                    previewRatio="3/4"
                    allowTallScroll
                    value={p.heroImageUrl}
                    position={p.heroImagePosition}
                    scale={p.heroImageScale}
                    onChange={(src) => updateProject(p.id, { heroImageUrl: src })}
                    onPositionChange={(pos) => updateProject(p.id, { heroImagePosition: pos })}
                    onScaleChange={(s) => updateProject(p.id, { heroImageScale: s })}
                  />
                  {/* Auto-shown only when the hero image is tall enough to actually need
                      scrolling (see FeaturedProjects.tsx) — this overrides that off when it
                      still doesn't feel warranted, or forces it on. */}
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#8C9AA3", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                      Hide scroll indicator
                    </label>
                    <Switch
                      checked={!!p.hideScrollIndicator}
                      onChange={(checked) => updateProject(p.id, { hideScrollIndicator: checked })}
                    />
                  </div>
                </div>
                {/* Row 2 — 3 Highlights */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 10, marginBottom: 16, alignItems: "center" }}>
                  <ImagePicker
                    label="Highlight 1 · 4:3 (800×600)"
                    previewRatio="4/3"
                    value={p.imgs[1] || undefined}
                    position={p.img1Position}
                    scale={p.img1Scale}
                    onChange={(src) => { const next = [...p.imgs]; while (next.length < 2) next.push(""); next[1] = src || ""; updateProject(p.id, { imgs: trimTrailingEmpty(next) }); }}
                    onPositionChange={(pos) => updateProject(p.id, { img1Position: pos })}
                    onScaleChange={(s) => updateProject(p.id, { img1Scale: s })}
                  />
                  <HighlightSwapButton onSwap={() => updateProject(p.id, swapProjectHighlights(p, 1, 2))} />
                  <ImagePicker
                    label="Highlight 2 · 4:3 (800×600)"
                    previewRatio="4/3"
                    value={p.imgs[2] || undefined}
                    position={p.img2Position}
                    scale={p.img2Scale}
                    onChange={(src) => { const next = [...p.imgs]; while (next.length < 3) next.push(""); next[2] = src || ""; updateProject(p.id, { imgs: trimTrailingEmpty(next) }); }}
                    onPositionChange={(pos) => updateProject(p.id, { img2Position: pos })}
                    onScaleChange={(s) => updateProject(p.id, { img2Scale: s })}
                  />
                  <HighlightSwapButton onSwap={() => updateProject(p.id, swapProjectHighlights(p, 2, 3))} />
                  <ImagePicker
                    label="Highlight 3 · 4:3 (800×600)"
                    previewRatio="4/3"
                    value={p.imgs[3] || undefined}
                    position={p.img3Position}
                    scale={p.img3Scale}
                    onChange={(src) => { const next = [...p.imgs]; while (next.length < 4) next.push(""); next[3] = src || ""; updateProject(p.id, { imgs: trimTrailingEmpty(next) }); }}
                    onPositionChange={(pos) => updateProject(p.id, { img3Position: pos })}
                    onScaleChange={(s) => updateProject(p.id, { img3Scale: s })}
                  />
                </div>

                <ResponsiveRichTextEditor
                  label="Project Detail (rich text — shown between summary and outcomes)"
                  value={p.fullContent || ""}
                  onChange={(v) => updateProject(p.id, { fullContent: v })}
                  mobileValue={p.fullContentMobile}
                  onMobileChange={(v) => updateProject(p.id, { fullContentMobile: v })}
                />

                {p.fullCaseStudy && (
                  <div style={{ marginBottom: 8 }}>
                    <ImagePicker
                      label="Banner image · 2560×840px recommended (3:1 wide panoramic)"
                      previewRatio="3/1"
                      value={p.fullCaseStudyBannerUrl}
                      onChange={(src) => updateProject(p.id, { fullCaseStudyBannerUrl: src || undefined })}
                    />
                    <ResponsiveRichTextEditor
                      label="Full Case Study content (additional detail shown on the full case study page)"
                      value={p.fullCaseStudyContent || ""}
                      onChange={(v) => updateProject(p.id, { fullCaseStudyContent: v })}
                      mobileValue={p.fullCaseStudyContentMobile}
                      onMobileChange={(v) => updateProject(p.id, { fullCaseStudyContentMobile: v })}
                    />
                  </div>
                )}

                <CMSArrayEditor label="Key Outcomes" items={p.outcomes} onChange={(v) => updateProject(p.id, { outcomes: v })} />
                <CMSChipEditor label="Tags" items={p.tags} onChange={(v) => updateProject(p.id, { tags: v })} />
                <CategoryToggleRow
                  categories={data.projectCategories ?? []}
                  selected={p.categories ?? []}
                  onChange={(next) => updateProject(p.id, { categories: next })}
                />

                <ViewMoreEditor
                  currentId={p.id}
                  heading={p.viewMoreHeading || ""}
                  pinnedIds={p.viewMorePinnedIds || []}
                  category={p.viewMoreCategory}
                  sort={p.viewMoreSort}
                  allEntries={allEntries}
                  allTags={allTags}
                  onChange={(patch) => updateProject(p.id, patch)}
                />
              </div>
            )}
          </CMSCard>
        );
      })}
    </div>
  );
}
