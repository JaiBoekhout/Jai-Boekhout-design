"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown, X, Eye, EyeOff, Upload, FileText, Loader2 } from "lucide-react";
import { CMSInput, CMSUrlInput, CMSTextarea, CMSArrayEditor, CMSChipEditor, CMSSectionHeading, CMSCard, selectArrowStyle, useDragReorder, DragHandle } from "@/components/CMSFields";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImagePicker } from "@/components/ImagePicker";
import { Switch } from "@/components/SiteKit";
import { STAT_ICON_OPTIONS } from "@/lib/statIcons";
import type { CMSEvaluate, CMSClient, CMSCompany, CMSProject, CMSExperience } from "@/store/contentStore";

interface Props {
  data: CMSEvaluate;
  companies: CMSCompany[];
  projects: CMSProject[];
  onChange: (data: CMSEvaluate) => void;
}

// Reorderable/hideable list of projects auto-matched to an experience entry's linked company
// (by CMSProject.companyId), rendered underneath its Key Skills — same up/down + visibility
// pattern used for Process Steps, layered as an explicit order/hidden override on top of the
// auto-matched set so a newly-tagged project just appends rather than needing to be re-picked.
// Row list shared by both modes below — reorder (up/down), hide/show, and an optional remove
// (only meaningful in manual mode; auto-matched entries reappear on their own if "removed").
function ProjectOrderRows({
  items, onMove, onToggleHidden, onRemove, onReorder,
}: {
  items: { id: string; name: string; hidden: boolean }[];
  onMove: (idx: number, dir: -1 | 1) => void;
  onToggleHidden: (idx: number) => void;
  onRemove?: (idx: number) => void;
  onReorder: (next: { id: string; name: string; hidden: boolean }[]) => void;
}) {
  const { dragHandleProps, dropTargetProps, cardStyle } = useDragReorder(items, onReorder);
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", ...cardStyle(idx), opacity: item.hidden ? 0.5 : cardStyle(idx).opacity }}
          {...dropTargetProps(idx)}
        >
          <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
            <DragHandle {...dragHandleProps(idx)} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EDE8DF", fontWeight: 300 }}>{item.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMove(idx, -1)}
              disabled={idx === 0}
              className="hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
            >
              <ArrowUp size={13} />
            </button>
            <button
              onClick={() => onMove(idx, 1)}
              disabled={idx === items.length - 1}
              className="hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: idx === items.length - 1 ? "default" : "pointer", color: idx === items.length - 1 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
            >
              <ArrowDown size={13} />
            </button>
            <button
              onClick={() => onToggleHidden(idx)}
              title={item.hidden ? "Show on public page" : "Hide from public page"}
              className="hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px", marginLeft: "2px" }}
            >
              {item.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            {onRemove && (
              <button
                onClick={() => onRemove(idx)}
                title="Remove from this list"
                className="hover:opacity-60 transition-opacity"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px" }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Shared "List / Card" display toggle + single-card picker, rendered underneath either mode's
// project rows below. Card mode shows exactly one project (as a rich image card matching the
// Work page's grid, built in ExperienceRecruiter.tsx) so it needs its own single-select — a
// reorderable list has an obvious order, but "which one card" doesn't follow from that alone.
function ProjectsDisplayModeEditor({
  exp, visibleItems, onChange,
}: {
  exp: CMSExperience;
  visibleItems: { id: string; name: string }[];
  onChange: (patch: Partial<CMSExperience>) => void;
}) {
  const mode = exp.projectsDisplayMode ?? "list";
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between" style={{ marginBottom: mode === "card" ? 8 : 0 }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Display
        </label>
        <Switch
          checked={mode === "card"}
          onChange={(checked) => onChange({ projectsDisplayMode: checked ? "card" : "list" })}
          label={mode === "card" ? "Card" : "List"}
        />
      </div>
      {mode === "card" && (
        visibleItems.length > 0 ? (
          <select
            value={visibleItems.some((it) => it.id === exp.projectsFeaturedId) ? exp.projectsFeaturedId : ""}
            onChange={(e) => onChange({ projectsFeaturedId: e.target.value || undefined })}
            style={{
              width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "8px",
              padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#EDE8DF", fontWeight: 300, outline: "none",
              ...selectArrowStyle,
            }}
          >
            <option value="" disabled>Select which project to feature…</option>
            {visibleItems.map((it) => (
              <option key={it.id} value={it.id}>{it.name}</option>
            ))}
          </select>
        ) : (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", margin: 0 }}>
            No visible projects to feature yet — add or unhide one above.
          </p>
        )
      )}
    </div>
  );
}

function ExperienceProjectsEditor({
  exp, projects, onChange,
}: {
  exp: CMSExperience;
  projects: CMSProject[];
  onChange: (patch: Partial<CMSExperience>) => void;
}) {
  const order = exp.projectOrder ?? [];

  // No company linked — nothing to auto-match, so projectOrder is a manually curated list
  // instead of an order/hide override. Lets an employer that isn't tracked as an "agency"
  // (a direct job, not client work through an employer) still credit specific projects.
  if (!exp.companyId) {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const items = order
      .map((ref) => (byId.has(ref.id) ? { id: ref.id, name: byId.get(ref.id)!.name, hidden: !!ref.hidden } : null))
      .filter((item): item is { id: string; name: string; hidden: boolean } => !!item);
    const addedIds = new Set(items.map((it) => it.id));
    const availableToAdd = projects.filter((p) => !addedIds.has(p.id));

    function commit(next: { id: string; name: string; hidden: boolean }[]) {
      onChange({ projectOrder: next.map(({ id, hidden }) => ({ id, hidden: hidden || undefined })) });
    }

    return (
      <div className="mb-4">
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
          Projects (picked manually — no agency linked)
        </label>
        {items.length > 0 && (
          <div className="mb-3">
            <ProjectOrderRows
              items={items}
              onMove={(idx, dir) => {
                const j = idx + dir;
                if (j < 0 || j >= items.length) return;
                const next = [...items];
                [next[idx], next[j]] = [next[j], next[idx]];
                commit(next);
              }}
              onToggleHidden={(idx) => {
                const next = [...items];
                next[idx] = { ...next[idx], hidden: !next[idx].hidden };
                commit(next);
              }}
              onRemove={(idx) => commit(items.filter((_, i) => i !== idx))}
              onReorder={commit}
            />
          </div>
        )}
        {availableToAdd.length > 0 ? (
          <select
            value=""
            onChange={(e) => { if (e.target.value) commit([...items, { id: e.target.value, name: "", hidden: false }]); }}
            style={{
              width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "8px",
              padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#EDE8DF", fontWeight: 300, outline: "none",
              ...selectArrowStyle,
            }}
          >
            <option value="" disabled>+ Add a project…</option>
            {availableToAdd.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : projects.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", margin: 0 }}>No projects exist yet — add one in the Work tab.</p>
        ) : (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", margin: 0 }}>Every project has been added.</p>
        )}
        <ProjectsDisplayModeEditor
          exp={exp}
          visibleItems={items.filter((it) => !it.hidden)}
          onChange={onChange}
        />
      </div>
    );
  }

  const matches = projects.filter((p) => p.companyId === exp.companyId);
  if (matches.length === 0) {
    return (
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginBottom: 16 }}>
        No projects tagged with this company yet — in the Work tab, set a project&apos;s Client / Type switch to
        &quot;Agency&quot; and pick this company.
      </p>
    );
  }

  const byId = new Map(matches.map((p) => [p.id, p]));
  const seen = new Set(order.map((r) => r.id));
  const effective = [
    ...order.filter((r) => byId.has(r.id)).map((r) => ({ id: r.id, hidden: !!r.hidden, name: byId.get(r.id)!.name })),
    ...matches.filter((p) => !seen.has(p.id)).map((p) => ({ id: p.id, hidden: false, name: p.name })),
  ];

  function commitMatched(next: typeof effective) {
    onChange({ projectOrder: next.map(({ id, hidden }) => ({ id, hidden: hidden || undefined })) });
  }

  return (
    <div className="mb-4">
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
        Projects (from this company)
      </label>
      <ProjectOrderRows
        items={effective}
        onMove={(idx, dir) => {
          const j = idx + dir;
          if (j < 0 || j >= effective.length) return;
          const next = [...effective];
          [next[idx], next[j]] = [next[j], next[idx]];
          commitMatched(next);
        }}
        onToggleHidden={(idx) => {
          const next = [...effective];
          next[idx] = { ...next[idx], hidden: !next[idx].hidden };
          commitMatched(next);
        }}
        onReorder={commitMatched}
      />
      <ProjectsDisplayModeEditor
        exp={exp}
        visibleItems={effective.filter((it) => !it.hidden)}
        onChange={onChange}
      />
    </div>
  );
}

function StatIconPicker({ value, onChange }: { value: string | undefined; onChange: (icon: string | undefined) => void }) {
  const Selected = value ? STAT_ICON_OPTIONS.find((o) => o.name === value)?.Icon : undefined;
  return (
    <div className="mb-4">
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
        Icon (optional)
      </label>
      <div className="flex items-center gap-2">
        <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", color: "#14ADB5" }}>
          {Selected ? <Selected size={15} /> : <X size={13} style={{ color: "#6B7E8A" }} />}
        </div>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          style={{
            width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "8px",
            padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#EDE8DF", fontWeight: 300, outline: "none",
            ...selectArrowStyle,
          }}
        >
          <option value="">No icon</option>
          {STAT_ICON_OPTIONS.map(({ name }) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Resume PDF — separate from the general Media Library (see app/api/resume/upload) since it's
// a single file for one field, not something that belongs in an image/video browsing grid.
function ResumeUpload({ value, onChange }: { value: string | undefined; onChange: (url: string | undefined) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media?action=resume", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");
      onChange(json.src);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col mb-4">
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
        Resume / CV (PDF)
      </label>
      {value ? (
        <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)" }}>
          <FileText size={16} style={{ color: "#14ADB5", flexShrink: 0 }} />
          <a href={value} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EDE8DF", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            View current resume
          </a>
          <label className="hover:opacity-70 transition-opacity" style={{ cursor: "pointer", color: "#8C9AA3", fontFamily: "'DM Mono', monospace", fontSize: 11, flexShrink: 0 }}>
            {uploading ? <Loader2 size={13} className="animate-spin" /> : "Replace"}
            <input type="file" accept="application/pdf" style={{ display: "none" }} disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </label>
          <button onClick={() => onChange(undefined)} className="hover:opacity-60 transition-opacity" style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: 0, flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>
      ) : (
        <label
          className="flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
          style={{ background: "rgba(20,173,181,0.08)", border: "1px dashed rgba(20,173,181,0.3)", borderRadius: "10px", padding: "16px", cursor: uploading ? "default" : "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.06em" }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Uploading…" : "Upload Resume PDF"}
          <input type="file" accept="application/pdf" style={{ display: "none" }} disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </label>
      )}
      {error && (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#C0392B", marginTop: "6px" }}>{error}</span>
      )}
    </div>
  );
}

export function EvaluateSection({ data, companies, projects, onChange }: Props) {
  const [openExp, setOpenExp] = useState<number | null>(null);
  const statsDrag = useDragReorder(data.stats, (v) => onChange({ ...data, stats: v }));
  const skillsDrag = useDragReorder(data.skills, (v) => onChange({ ...data, skills: v }));
  const clientsDrag = useDragReorder(data.clients ?? [], (v) => onChange({ ...data, clients: v }));
  const experienceDrag = useDragReorder(data.experience, (v) => onChange({ ...data, experience: v }));
  const qualificationsDrag = useDragReorder(data.qualifications, (v) => onChange({ ...data, qualifications: v }));
  const testimonialsDrag = useDragReorder(data.testimonials, (v) => onChange({ ...data, testimonials: v }));

  return (
    <div>
      <CMSSectionHeading>Hero</CMSSectionHeading>
      <RichTextEditor label="Hero Statement" value={data.heroStatement} onChange={(v) => onChange({ ...data, heroStatement: v })} />

      <CMSSectionHeading>Who I Am</CMSSectionHeading>
      <CMSInput label="Section Heading (public page)" value={data.bioHeading ?? "About Me"} onChange={(v) => onChange({ ...data, bioHeading: v })} />
      <RichTextEditor label="Bio" value={data.bio} onChange={(v) => onChange({ ...data, bio: v })} />
      <CMSInput label="Industries — Section Heading (public page)" value={data.industriesHeading ?? "Industries"} onChange={(v) => onChange({ ...data, industriesHeading: v })} />
      <CMSChipEditor label="Industries" items={data.industries} onChange={(v) => onChange({ ...data, industries: v })} />

      <CMSSectionHeading>At A Glance</CMSSectionHeading>
      <CMSInput label="Section Heading (public page)" value={data.statsHeading ?? "At a Glance"} onChange={(v) => onChange({ ...data, statsHeading: v })} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
      {data.stats.map((stat, i) => (
        <CMSCard key={i} style={statsDrag.cardStyle(i)} {...statsDrag.dropTargetProps(i)}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <DragHandle {...statsDrag.dragHandleProps(i)} />
            <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (i === 0) return;
                const s = [...data.stats];
                [s[i - 1], s[i]] = [s[i], s[i - 1]];
                onChange({ ...data, stats: s });
              }}
              disabled={i === 0}
              className="hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
            >
              <ArrowUp size={13} />
            </button>
            <button
              onClick={() => {
                if (i === data.stats.length - 1) return;
                const s = [...data.stats];
                [s[i], s[i + 1]] = [s[i + 1], s[i]];
                onChange({ ...data, stats: s });
              }}
              disabled={i === data.stats.length - 1}
              className="hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: i === data.stats.length - 1 ? "default" : "pointer", color: i === data.stats.length - 1 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
            >
              <ArrowDown size={13} />
            </button>
            <button
              onClick={() => { const s = data.stats.filter((_, idx) => idx !== i); onChange({ ...data, stats: s }); }}
              className="hover:opacity-60 transition-opacity"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px", marginLeft: "2px" }}
            >
              <Trash2 size={13} />
            </button>
            </div>
          </div>
          <div className="flex flex-col">
            <CMSInput label="Value" value={stat.value} onChange={(v) => { const s = [...data.stats]; s[i] = { ...s[i], value: v }; onChange({ ...data, stats: s }); }} />
            <CMSInput label="Label" value={stat.label} onChange={(v) => { const s = [...data.stats]; s[i] = { ...s[i], label: v }; onChange({ ...data, stats: s }); }} />
            <CMSInput label="Sub-label (opt)" value={stat.sub || ""} onChange={(v) => { const s = [...data.stats]; s[i] = { ...s[i], sub: v || undefined }; onChange({ ...data, stats: s }); }} />
          </div>
          <StatIconPicker value={stat.icon} onChange={(icon) => { const s = [...data.stats]; s[i] = { ...s[i], icon }; onChange({ ...data, stats: s }); }} />
        </CMSCard>
      ))}
      </div>
      <button
        onClick={() => onChange({ ...data, stats: [...data.stats, { id: `stat-${Date.now()}`, value: "0", label: "New Stat" }] })}
        className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
        style={{ background: "rgba(20,173,181,0.08)", border: "1px solid rgba(20,173,181,0.25)", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.06em" }}
      >
        <Plus size={13} /> Add Stat
      </button>

      <CMSSectionHeading>Resume</CMSSectionHeading>
      <ResumeUpload value={data.resumeUrl} onChange={(url) => onChange({ ...data, resumeUrl: url })} />

      <CMSSectionHeading>Core Strengths</CMSSectionHeading>
      <CMSInput label="Section Heading (public page)" value={data.skillsHeading ?? "Core Strengths"} onChange={(v) => onChange({ ...data, skillsHeading: v })} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
      {data.skills.map((group, i) => (
        <CMSCard key={i} style={skillsDrag.cardStyle(i)} {...skillsDrag.dropTargetProps(i)}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <DragHandle {...skillsDrag.dragHandleProps(i)} />
            <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (i === 0) return;
                const s = [...data.skills];
                [s[i - 1], s[i]] = [s[i], s[i - 1]];
                onChange({ ...data, skills: s });
              }}
              disabled={i === 0}
              className="hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
            >
              <ArrowUp size={13} />
            </button>
            <button
              onClick={() => {
                if (i === data.skills.length - 1) return;
                const s = [...data.skills];
                [s[i], s[i + 1]] = [s[i + 1], s[i]];
                onChange({ ...data, skills: s });
              }}
              disabled={i === data.skills.length - 1}
              className="hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: i === data.skills.length - 1 ? "default" : "pointer", color: i === data.skills.length - 1 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
            >
              <ArrowDown size={13} />
            </button>
            <button
              onClick={() => { const s = data.skills.filter((_, idx) => idx !== i); onChange({ ...data, skills: s }); }}
              className="hover:opacity-60 transition-opacity"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px", marginLeft: "2px" }}
            >
              <Trash2 size={13} />
            </button>
            </div>
          </div>
          <CMSInput label="Category Name" value={group.title} onChange={(v) => { const s = [...data.skills]; s[i] = { ...s[i], title: v }; onChange({ ...data, skills: s }); }} />
          <CMSChipEditor label="Skills" items={group.skills} onChange={(v) => { const s = [...data.skills]; s[i] = { ...s[i], skills: v }; onChange({ ...data, skills: s }); }} />
        </CMSCard>
      ))}
      </div>
      <button
        onClick={() => onChange({ ...data, skills: [...data.skills, { title: "New Category", skills: [] }] })}
        className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
        style={{ background: "rgba(20,173,181,0.08)", border: "1px solid rgba(20,173,181,0.25)", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.06em" }}
      >
        <Plus size={13} /> Add Category
      </button>

      <CMSSectionHeading>Clients & Companies</CMSSectionHeading>
      <CMSInput label="Section Heading (shown on both the Evaluate and Work pages)" value={data.clientsHeading ?? "Clients & Companies"} onChange={(v) => onChange({ ...data, clientsHeading: v })} />

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer", userSelect: "none" }}>
        <input
          type="checkbox"
          checked={!!data.clientsHidden}
          onChange={(e) => onChange({ ...data, clientsHidden: e.target.checked })}
          style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
        />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
          Hide this section (Evaluate and Work pages)
        </span>
      </label>

      {/* Speed control */}
      <div className="flex flex-col mb-6 p-4 rounded-xl" style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.06)" }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>
          Slider Speed — {data.clientSliderSpeed ?? 60}s per loop &nbsp;·&nbsp; higher = slower
        </label>
        <input
          type="range"
          min={20}
          max={120}
          step={5}
          value={data.clientSliderSpeed ?? 60}
          onChange={(e) => onChange({ ...data, clientSliderSpeed: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "#14ADB5" }}
        />
        <div className="flex justify-between mt-1">
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF" }}>20s (fast)</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF" }}>120s (slow)</span>
        </div>
      </div>

      {/* Client cards — 2 column grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(data.clients ?? []).map((client, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.06)", ...clientsDrag.cardStyle(i) }} {...clientsDrag.dropTargetProps(i)}>

            {/* Row assignment + reorder + delete */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DragHandle {...clientsDrag.dragHandleProps(i)} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", letterSpacing: "0.08em" }}>ROW</span>
                {([1, 2] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => { const c = [...(data.clients ?? [])]; c[i] = { ...c[i], row: r }; onChange({ ...data, clients: c }); }}
                    style={{
                      background: (client.row ?? 1) === r ? "rgba(20,173,181,0.15)" : "transparent",
                      border: `1px solid ${(client.row ?? 1) === r ? "rgba(20,173,181,0.4)" : "rgba(237,232,223,0.08)"}`,
                      borderRadius: "6px",
                      padding: "2px 10px",
                      cursor: "pointer",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px",
                      color: (client.row ?? 1) === r ? "#14ADB5" : "#EDE8DF",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (i === 0) return;
                    const c = [...(data.clients ?? [])];
                    [c[i - 1], c[i]] = [c[i], c[i - 1]];
                    onChange({ ...data, clients: c });
                  }}
                  disabled={i === 0}
                  className="hover:opacity-70 transition-opacity"
                  style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  onClick={() => {
                    const clients = data.clients ?? [];
                    if (i === clients.length - 1) return;
                    const c = [...clients];
                    [c[i], c[i + 1]] = [c[i + 1], c[i]];
                    onChange({ ...data, clients: c });
                  }}
                  disabled={i === (data.clients ?? []).length - 1}
                  className="hover:opacity-70 transition-opacity"
                  style={{ background: "none", border: "none", cursor: i === (data.clients ?? []).length - 1 ? "default" : "pointer", color: i === (data.clients ?? []).length - 1 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  onClick={() => { const c = (data.clients ?? []).filter((_, idx) => idx !== i); onChange({ ...data, clients: c }); }}
                  className="hover:opacity-60 transition-opacity"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px", marginLeft: "2px" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <CMSInput
              label="Company Name"
              value={client.name}
              onChange={(v) => { const c = [...(data.clients ?? [])]; c[i] = { ...c[i], name: v }; onChange({ ...data, clients: c }); }}
            />
            <ImagePicker
              label="Logo"
              previewRatio="3/1"
              previewFit="contain"
              previewBackground="#fff"
              value={client.logoUrl}
              onChange={(url) => { const c = [...(data.clients ?? [])]; c[i] = { ...c[i], logoUrl: url || undefined }; onChange({ ...data, clients: c }); }}
            />
            <CMSUrlInput
              label="Website URL (optional)"
              value={client.url ?? ""}
              onChange={(v) => { const c = [...(data.clients ?? [])]; c[i] = { ...c[i], url: v || undefined }; onChange({ ...data, clients: c }); }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => { const c = [...(data.clients ?? []), { name: "New Client", row: 1 } as CMSClient]; onChange({ ...data, clients: c }); }}
        className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
        style={{ background: "rgba(20,173,181,0.08)", border: "1px solid rgba(20,173,181,0.25)", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.06em" }}
      >
        <Plus size={13} /> Add Client
      </button>

      <CMSSectionHeading>Professional Experience</CMSSectionHeading>
      <CMSInput label="Section Heading (public page)" value={data.experienceHeading ?? "Professional Experience"} onChange={(v) => onChange({ ...data, experienceHeading: v })} />
      {data.experience.map((exp, i) => (
        <CMSCard key={i} style={experienceDrag.cardStyle(i)} {...experienceDrag.dropTargetProps(i)}>
          <div className="w-full flex items-center justify-between gap-2">
            <button
              className="flex-1 min-w-0 flex items-center justify-between"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onClick={() => setOpenExp(openExp === i ? null : i)}
            >
              <div className="text-left">
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "var(--c-heading)", fontWeight: 400 }}>{exp.org}</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF" }}>{exp.period}</p>
              </div>
              {openExp === i ? <ChevronUp size={14} style={{ color: "#EDE8DF" }} /> : <ChevronDown size={14} style={{ color: "#EDE8DF" }} />}
            </button>
            <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
              <DragHandle {...experienceDrag.dragHandleProps(i)} />
              <button
                onClick={() => {
                  if (i === 0) return;
                  const e = [...data.experience];
                  [e[i - 1], e[i]] = [e[i], e[i - 1]];
                  onChange({ ...data, experience: e });
                  setOpenExp((cur) => (cur === i ? i - 1 : cur === i - 1 ? i : cur));
                }}
                disabled={i === 0}
                className="hover:opacity-70 transition-opacity"
                style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
              >
                <ArrowUp size={13} />
              </button>
              <button
                onClick={() => {
                  if (i === data.experience.length - 1) return;
                  const e = [...data.experience];
                  [e[i], e[i + 1]] = [e[i + 1], e[i]];
                  onChange({ ...data, experience: e });
                  setOpenExp((cur) => (cur === i ? i + 1 : cur === i + 1 ? i : cur));
                }}
                disabled={i === data.experience.length - 1}
                className="hover:opacity-70 transition-opacity"
                style={{ background: "none", border: "none", cursor: i === data.experience.length - 1 ? "default" : "pointer", color: i === data.experience.length - 1 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
              >
                <ArrowDown size={13} />
              </button>
              <button
                onClick={() => {
                  const e = data.experience.filter((_, idx) => idx !== i);
                  onChange({ ...data, experience: e });
                  setOpenExp((cur) => (cur === i ? null : cur));
                }}
                className="hover:opacity-60 transition-opacity"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px", marginLeft: "2px" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {openExp === i && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(237,232,223,0.06)" }}>
              <CMSInput label="Organisation" value={exp.org} onChange={(v) => { const e = [...data.experience]; e[i] = { ...e[i], org: v }; onChange({ ...data, experience: e }); }} />
              <CMSInput label="Period" value={exp.period} onChange={(v) => { const e = [...data.experience]; e[i] = { ...e[i], period: v }; onChange({ ...data, experience: e }); }} />
              <CMSInput label="Role" value={exp.role} onChange={(v) => { const e = [...data.experience]; e[i] = { ...e[i], role: v }; onChange({ ...data, experience: e }); }} />
              <RichTextEditor label="Description (optional)" value={exp.description ?? ""} onChange={(v) => { const e = [...data.experience]; e[i] = { ...e[i], description: v || undefined }; onChange({ ...data, experience: e }); }} />
              <CMSArrayEditor label="Highlights" items={exp.highlights} onChange={(v) => { const e = [...data.experience]; e[i] = { ...e[i], highlights: v }; onChange({ ...data, experience: e }); }} />
              <CMSChipEditor label="Key Skills" items={exp.tags} onChange={(v) => { const e = [...data.experience]; e[i] = { ...e[i], tags: v }; onChange({ ...data, experience: e }); }} />

              <div className="mb-4">
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  Company / Agency (optional)
                </label>
                <select
                  value={exp.companyId ?? ""}
                  onChange={(ev) => { const e = [...data.experience]; e[i] = { ...e[i], companyId: ev.target.value || undefined }; onChange({ ...data, experience: e }); }}
                  style={{ width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "8px", padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#EDE8DF", fontWeight: 300, outline: "none", ...selectArrowStyle }}
                >
                  <option value="">None</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8C9AA3", marginTop: 6 }}>
                  Links this job to a Companies entry so its projects (tagged "Agency" in the Work tab) can show below.
                </p>
              </div>

              <ExperienceProjectsEditor
                exp={exp}
                projects={projects}
                onChange={(patch) => { const e = [...data.experience]; e[i] = { ...e[i], ...patch }; onChange({ ...data, experience: e }); }}
              />
            </div>
          )}
        </CMSCard>
      ))}
      <button
        onClick={() => {
          const e = [...data.experience, { org: "New Organisation", period: "", role: "", highlights: [], tags: [] }];
          onChange({ ...data, experience: e });
          setOpenExp(e.length - 1);
        }}
        className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
        style={{ background: "rgba(20,173,181,0.08)", border: "1px solid rgba(20,173,181,0.25)", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.06em" }}
      >
        <Plus size={13} /> Add Experience
      </button>

      <CMSSectionHeading>Education & Qualifications</CMSSectionHeading>
      <CMSInput label="Section Heading (public page)" value={data.qualificationsHeading ?? "Education & Qualifications"} onChange={(v) => onChange({ ...data, qualificationsHeading: v })} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        {data.qualifications.map((q, i) => (
          <CMSCard key={i} style={qualificationsDrag.cardStyle(i)} {...qualificationsDrag.dropTargetProps(i)}>
            <div className="flex items-center justify-between gap-1 mb-2">
              <DragHandle {...qualificationsDrag.dragHandleProps(i)} />
              <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (i === 0) return;
                  const qs = [...data.qualifications];
                  [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
                  onChange({ ...data, qualifications: qs });
                }}
                disabled={i === 0}
                className="hover:opacity-70 transition-opacity"
                style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
              >
                <ArrowUp size={13} />
              </button>
              <button
                onClick={() => {
                  if (i === data.qualifications.length - 1) return;
                  const qs = [...data.qualifications];
                  [qs[i], qs[i + 1]] = [qs[i + 1], qs[i]];
                  onChange({ ...data, qualifications: qs });
                }}
                disabled={i === data.qualifications.length - 1}
                className="hover:opacity-70 transition-opacity"
                style={{ background: "none", border: "none", cursor: i === data.qualifications.length - 1 ? "default" : "pointer", color: i === data.qualifications.length - 1 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
              >
                <ArrowDown size={13} />
              </button>
              <button
                onClick={() => { const qs = data.qualifications.filter((_, idx) => idx !== i); onChange({ ...data, qualifications: qs }); }}
                className="hover:opacity-60 transition-opacity"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px", marginLeft: "2px" }}
              >
                <Trash2 size={13} />
              </button>
              </div>
            </div>
            <CMSInput label="Qualification Title" value={q.title} onChange={(v) => { const qs = [...data.qualifications]; qs[i] = { ...qs[i], title: v }; onChange({ ...data, qualifications: qs }); }} />
            <div className="grid grid-cols-2 gap-3">
              <CMSInput label="Institution" value={q.org || ""} onChange={(v) => { const qs = [...data.qualifications]; qs[i] = { ...qs[i], org: v || null }; onChange({ ...data, qualifications: qs }); }} />
              <CMSInput label="Year" value={q.year ?? ""} onChange={(v) => { const qs = [...data.qualifications]; qs[i] = { ...qs[i], year: v || undefined }; onChange({ ...data, qualifications: qs }); }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CMSInput label="Major (optional)" value={q.major ?? ""} onChange={(v) => { const qs = [...data.qualifications]; qs[i] = { ...qs[i], major: v || undefined }; onChange({ ...data, qualifications: qs }); }} />
              <CMSInput label="Minor (optional)" value={q.minor ?? ""} onChange={(v) => { const qs = [...data.qualifications]; qs[i] = { ...qs[i], minor: v || undefined }; onChange({ ...data, qualifications: qs }); }} />
            </div>
          </CMSCard>
        ))}
      </div>
      <button
        onClick={() => onChange({ ...data, qualifications: [...data.qualifications, { title: "New Qualification", org: null }] })}
        className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
        style={{ background: "rgba(20,173,181,0.08)", border: "1px solid rgba(20,173,181,0.25)", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.06em" }}
      >
        <Plus size={13} /> Add Qualification
      </button>
      <CMSChipEditor label="Additional Background" items={data.additional} onChange={(v) => onChange({ ...data, additional: v })} />

      <CMSSectionHeading>Testimonials</CMSSectionHeading>
      <CMSInput label="Section Heading (public page)" value={data.testimonialsHeading ?? "Why Teams Like Working With Me"} onChange={(v) => onChange({ ...data, testimonialsHeading: v })} />
      {data.testimonials.map((t, i) => (
        <CMSCard key={i} style={testimonialsDrag.cardStyle(i)} {...testimonialsDrag.dropTargetProps(i)}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <DragHandle {...testimonialsDrag.dragHandleProps(i)} />
            <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (i === 0) return;
                const ts = [...data.testimonials];
                [ts[i - 1], ts[i]] = [ts[i], ts[i - 1]];
                onChange({ ...data, testimonials: ts });
              }}
              disabled={i === 0}
              className="hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
            >
              <ArrowUp size={13} />
            </button>
            <button
              onClick={() => {
                if (i === data.testimonials.length - 1) return;
                const ts = [...data.testimonials];
                [ts[i], ts[i + 1]] = [ts[i + 1], ts[i]];
                onChange({ ...data, testimonials: ts });
              }}
              disabled={i === data.testimonials.length - 1}
              className="hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: i === data.testimonials.length - 1 ? "default" : "pointer", color: i === data.testimonials.length - 1 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
            >
              <ArrowDown size={13} />
            </button>
            <button
              onClick={() => { const ts = data.testimonials.filter((_, idx) => idx !== i); onChange({ ...data, testimonials: ts }); }}
              className="hover:opacity-60 transition-opacity"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px", marginLeft: "2px" }}
            >
              <Trash2 size={13} />
            </button>
            </div>
          </div>
          <CMSInput label="Name" value={t.name} onChange={(v) => { const ts = [...data.testimonials]; ts[i] = { ...ts[i], name: v }; onChange({ ...data, testimonials: ts }); }} />
          <RichTextEditor label="Quote" value={t.quote} onChange={(v) => { const ts = [...data.testimonials]; ts[i] = { ...ts[i], quote: v }; onChange({ ...data, testimonials: ts }); }} />
          <CMSChipEditor label="Highlights" items={t.highlights} onChange={(v) => { const ts = [...data.testimonials]; ts[i] = { ...ts[i], highlights: v }; onChange({ ...data, testimonials: ts }); }} />
        </CMSCard>
      ))}
      <button
        onClick={() => onChange({ ...data, testimonials: [...data.testimonials, { name: "New Testimonial", quote: "", highlights: [] }] })}
        className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
        style={{ background: "rgba(20,173,181,0.08)", border: "1px solid rgba(20,173,181,0.25)", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.06em" }}
      >
        <Plus size={13} /> Add Testimonial
      </button>

      <CMSSectionHeading>Beyond Design</CMSSectionHeading>

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer", userSelect: "none" }}>
        <input
          type="checkbox"
          checked={!!data.beyondDesignHidden}
          onChange={(e) => onChange({ ...data, beyondDesignHidden: e.target.checked })}
          style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
        />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
          Hide this section (Evaluate page)
        </span>
      </label>

      {!data.beyondDesignHidden && (
        <>
          <CMSInput label="Section Heading (public page)" value={data.beyondDesignHeading ?? "Beyond Design"} onChange={(v) => onChange({ ...data, beyondDesignHeading: v })} />
          <RichTextEditor label="Personal Note" value={data.beyondDesign} onChange={(v) => onChange({ ...data, beyondDesign: v })} />
        </>
      )}
    </div>
  );
}
