"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Menu, Home as HomeIcon, Briefcase, User, GitBranch, BookOpen, Image, Save, LogOut, Check, Inbox, Trash2, Palette, AlertTriangle, Download, Upload, History as HistoryIcon } from "lucide-react";
import { useContentStore, getAllLinkableProjects } from "@/store/contentStore";
import type { CMSContent } from "@/store/contentStore";
import { WorkSection } from "@/components/WorkSection";
import { EvaluateSection } from "@/components/EvaluateSection";
import { ProcessSection } from "@/components/ProcessSection";
import { StorySection } from "@/components/StorySection";
import { MediaSection } from "@/components/MediaSection";
import { HistorySection } from "@/components/HistorySection";
import { DesignSystemSection, DESIGN_SYSTEM_SECTIONS } from "@/components/DesignSystemSection";
import { CMSInput, CMSSectionHeading, CMSCard } from "@/components/CMSFields";
import { ResponsiveRichTextEditor } from "@/components/ResponsiveRichTextEditor";
import { deleteEnquiryAction, clearEnquiriesAction } from "@/app/actions/contact";
import type { Enquiry } from "@/app/actions/contact";

type Tab = "home" | "work" | "evaluate" | "process" | "story" | "enquiry" | "media" | "design" | "history";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size: number; color?: string }> }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "work", label: "Work", icon: Briefcase },
  { id: "evaluate", label: "Evaluate", icon: User },
  { id: "process", label: "Process", icon: GitBranch },
  { id: "story", label: "Story", icon: BookOpen },
  { id: "enquiry", label: "Enquiries", icon: Inbox },
  { id: "media", label: "Media Library", icon: Image },
  { id: "design", label: "Design System", icon: Palette },
  { id: "history", label: "History", icon: HistoryIcon },
];

const HOME_CARD_LABELS: { id: "work" | "recruit" | "process" | "story"; label: string }[] = [
  { id: "work", label: "Card 1 — Work" },
  { id: "recruit", label: "Card 2 — Evaluate" },
  { id: "process", label: "Card 3 — Process" },
  { id: "story", label: "Card 4 — Story" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// The CMS chrome (sidebar, cards, buttons) is hardcoded dark and was never designed to follow
// the public site's light/dark toggle — but its text colors read the same shared --c-heading/
// --c-text-* tokens the public site uses, so switching the site to light mode (a document-root
// data-theme attribute — see store/themeStore.tsx) silently flipped this panel's text to
// near-black while its hardcoded backgrounds stayed dark, making titles unreadable. Re-declaring
// the dark values here pins the whole panel regardless of the site-wide toggle.
const ADMIN_DARK_VARS = {
  "--c-bg": "#0F1519",
  "--c-bg-card": "#1A2128",
  "--c-bg-deep": "#141D24",
  "--c-bg-deeper": "#0C1117",
  "--c-bg-glass": "rgba(13, 12, 10, 0.9)",
  "--c-heading": "#F5F1EA",
  "--c-quote-emphasis": "#EDE8DF",
  "--c-text": "#EDE8DF",
  "--c-text-muted": "#EDE8DF",
  "--c-text-body": "#A8B4BC",
  "--c-text-dim": "#EDE8DF",
  "--c-teal": "#14ADB5",
  "--c-teal-rgb": "20, 173, 181",
  "--c-border": "rgba(237, 232, 223, 0.08)",
  "--c-border-soft": "rgba(237, 232, 223, 0.06)",
  "--c-border-xs": "rgba(237, 232, 223, 0.05)",
  "--c-border-med": "rgba(237, 232, 223, 0.12)",
  "--c-divider": "#989793",
  "--c-text-30": "rgba(152, 151, 147, 0.7)",
  "--c-text-40": "#989793",
  "--c-text-50": "#989793",
  "--c-text-70": "rgba(237, 232, 223, 0.75)",
  "--c-text-80": "rgba(237, 232, 223, 0.85)",
  "--c-surface-3": "rgba(237, 232, 223, 0.03)",
  "--c-surface-4": "rgba(237, 232, 223, 0.04)",
  "--c-surface-10": "rgba(237, 232, 223, 0.1)",
} as React.CSSProperties;

export function AdminCMS({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  // Mobile only — the sidebar is a fixed narrow icon rail by default (see the sidebar's own
  // md:static/md:w-[220px] overrides, which make this state irrelevant at desktop widths) and
  // expands into a full-label overlay above the content when true, closing again once a tab is
  // picked or the backdrop is tapped.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [pendingPersist, setPendingPersist] = useState(false);
  const { content, updateContent, persistContent, isDirty } = useContentStore();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [confirmDeleteEnquiryId, setConfirmDeleteEnquiryId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<CMSContent | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // At least one project/case study has been saved as a draft (via its own "Save" button)
  // but never published — surfaced on the global Save Changes button as a reminder.
  const hasUnpublishedDraft = [...content.work.projects, ...content.work.caseStudies].some(
    (item) => item.status === "saved"
  );

  const fetchEnquiries = useCallback(async () => {
    setEnquiriesLoading(true);
    try {
      const res = await fetch("/api/enquiries");
      if (res.ok) {
        const data = await res.json();
        setEnquiries(data.enquiries ?? []);
      }
    } catch { /* silent */ }
    finally { setEnquiriesLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "enquiry") fetchEnquiries();
  }, [activeTab, fetchEnquiries]);

  // Auto-persist after image selection — waits for React to apply the content update first
  useEffect(() => {
    const handler = () => setPendingPersist(true);
    window.addEventListener("cms_image_selected", handler);
    return () => window.removeEventListener("cms_image_selected", handler);
  }, []);

  useEffect(() => {
    if (pendingPersist) {
      persistContent().then((ok) => {
        if (!ok) {
          setSaveError(true);
          setTimeout(() => setSaveError(false), 5000);
        }
      });
      setPendingPersist(false);
    }
  }, [content, pendingPersist]);

  // Content only reaches Postgres via Save/Logout (or the image-select side effect above) —
  // closing or reloading the tab directly would otherwise discard dirty in-memory edits with
  // no warning at all. Native confirm dialogs can't show custom text, but the browser's own
  // generic "leave site?" prompt is still far better than silent data loss.
  useEffect(() => {
    if (!isOpen || !isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isOpen, isDirty]);

  async function handleSave() {
    const ok = await persistContent();
    if (ok) {
      setSaveError(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setSaved(false);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 5000);
    }
  }

  // Content lives in Postgres now, but there's still no version history beyond the last-20-saves
  // list (see HistorySection) and no built-in disaster recovery — this plain JSON export is the
  // admin's own safety net to keep somewhere safe themselves.
  function handleDownloadBackup() {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleRestoreFileSelected(file: File) {
    setRestoreError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        // Loose shape check rather than a full schema validation — just enough to catch
        // "wrong file entirely" before it overwrites everything currently in the CMS.
        if (!parsed || typeof parsed !== "object" || !parsed.work || !parsed.designSystem || !parsed.homepage) {
          setRestoreError("That doesn't look like a portfolio backup file — expected the JSON downloaded from this same panel.");
          return;
        }
        setPendingRestore(parsed as CMSContent);
      } catch {
        setRestoreError("Couldn't read that file as JSON.");
      }
    };
    reader.readAsText(file);
  }

  function confirmRestore() {
    if (!pendingRestore) return;
    updateContent(pendingRestore);
    setPendingRestore(null);
    // Same "wait for the state update to land, then persist" pattern as the image-select
    // auto-persist above — persistContent() would otherwise close over the pre-restore content.
    setPendingPersist(true);
    setRestored(true);
    setTimeout(() => setRestored(false), 2500);
  }

  // Cmd/Ctrl+S saves instead of triggering the browser's native "Save Page" dialog
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  async function handleLogout() {
    // Don't close over a failed save — that's how an edit quietly disappears. Surface the
    // same error toast as the Save button and let the admin stay put and retry.
    const ok = await persistContent();
    if (!ok) {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 5000);
      return;
    }
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex"
          style={{ background: "rgba(6, 9, 12, 0.6)", backdropFilter: "blur(4px)", ...ADMIN_DARK_VARS }}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="ml-auto flex h-full"
            style={{ width: "100vw" }}
          >
            {/* Sidebar — fixed at every width so the collapsed rail never scrolls away, but only
                actually overlays anything below md: (md:static hands it back to the flex layout
                at desktop, where it's always the full 220px version it's always been). Collapsed
                mobile state is a 64px icon-only rail; tapping the menu button expands it to 256px
                with full labels, floating over the content underneath rather than squeezing it —
                the content's own md:ml-0/ml-16 offset (below) only ever reserves space for the
                collapsed rail width, so the expanded width genuinely overlaps it. */}
            <div
              className={`flex flex-col h-full flex-shrink-0 fixed inset-y-0 left-0 z-30 md:static md:inset-auto overflow-hidden transition-[width] duration-300 ease-out ${mobileNavOpen ? "w-64" : "w-16"} md:w-[220px]`}
              style={{ background: "#0C1117", borderRight: "1px solid rgba(237,232,223,0.06)" }}
            >
              {/* Header */}
              <div className="px-4 md:px-5 py-6 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(237,232,223,0.06)" }}>
                <button
                  onClick={() => setMobileNavOpen((v) => !v)}
                  aria-label={mobileNavOpen ? "Collapse menu" : "Expand menu"}
                  className="md:hidden flex-shrink-0"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: 0 }}
                >
                  {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                <div className={mobileNavOpen ? "block" : "hidden md:block"}>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#EDE8DF", fontWeight: 400, whiteSpace: "nowrap" }}>CMS</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", letterSpacing: "0.06em", marginTop: "2px", whiteSpace: "nowrap" }}>
                    Jai Boekhout · Portfolio
                  </p>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <div key={tab.id}>
                      <button
                        onClick={() => { setActiveTab(tab.id); setMobileNavOpen(false); }}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors w-full ${mobileNavOpen ? "" : "justify-center md:justify-start"}`}
                        style={{
                          background: active ? "rgba(20,173,181,0.1)" : "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Icon size={14} color={active ? "#14ADB5" : "#FFFFFF"} />
                        <span
                          className={mobileNavOpen ? "inline" : "hidden md:inline"}
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "13px",
                            color: active ? "#14ADB5" : "#FFFFFF",
                            fontWeight: active ? 400 : 300,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tab.label}
                        </span>
                      </button>
                      {tab.id === "design" && active && (
                        <div className={`${mobileNavOpen ? "flex" : "hidden md:flex"} flex-col gap-0.5 mt-1 mb-1`} style={{ paddingLeft: "29px" }}>
                          {DESIGN_SYSTEM_SECTIONS.map((section) => (
                            <button
                              key={section.id}
                              onClick={() => {
                                setActiveTab("design");
                                setMobileNavOpen(false);
                                requestAnimationFrame(() => {
                                  document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                });
                              }}
                              className="text-left rounded-md px-2 py-1.5 transition-colors hover:opacity-80"
                              style={{ background: "none", border: "none", cursor: "pointer" }}
                            >
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#8C9AA3", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                                {section.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* Footer actions */}
              <div className="px-3 pb-5 flex flex-col gap-2 overflow-x-hidden" style={{ borderTop: "1px solid rgba(237,232,223,0.06)", paddingTop: "16px" }}>
                <button
                  onClick={handleSave}
                  title={
                    saveError
                      ? "Save failed — see the error below"
                      : saved
                      ? undefined
                      : isDirty && hasUnpublishedDraft
                      ? "You have unsaved changes, and some projects are saved but not published yet"
                      : isDirty
                      ? "You have unsaved changes"
                      : hasUnpublishedDraft
                      ? "Some projects are saved but not published yet"
                      : undefined
                  }
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 w-full transition-all ${mobileNavOpen ? "" : "justify-center md:justify-start"}`}
                  style={{
                    background: saveError ? "#C0392B" : saved ? "rgba(20,173,181,0.15)" : (isDirty || hasUnpublishedDraft) ? "#F59E0B" : "#14ADB5",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {saveError ? <X size={13} style={{ color: "#EDE8DF" }} /> : saved ? <Check size={13} style={{ color: "#14ADB5" }} /> : <Save size={13} style={{ color: "#0C1117" }} />}
                  <span className={mobileNavOpen ? "inline" : "hidden md:inline"} style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: saveError ? "#EDE8DF" : saved ? "#14ADB5" : "#0C1117", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                    {saveError ? "Save failed" : saved ? "Saved!" : "Save Changes"}
                  </span>
                </button>
                {saveError && (
                  <div
                    role="alert"
                    className={mobileNavOpen ? "block" : "hidden md:block"}
                    style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: "8px", padding: "10px 12px" }}
                  >
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11.5px", color: "#EDE8DF", lineHeight: 1.5, margin: 0 }}>
                      Your changes are still here, but nothing was written to storage. This usually means the browser&apos;s storage is full — try removing a few unused images or large rich text blocks, then save again.
                    </p>
                  </div>
                )}

                {/* Content lives in Postgres now — Backup/Restore is just the admin's own
                    disaster-recovery safety net, not the primary persistence path anymore.
                    Stacked vertically when the rail is collapsed (side by side has no room at
                    64px wide); back to a row once expanded or at desktop widths. */}
                <div className={mobileNavOpen ? "flex gap-2" : "flex flex-col gap-2 md:flex-row"}>
                  <button
                    onClick={handleDownloadBackup}
                    title="Download everything in this CMS as a JSON backup file"
                    className="flex items-center justify-center gap-1.5 rounded-lg py-2 transition-opacity hover:opacity-70"
                    style={{ flex: 1, background: "rgba(237,232,223,0.05)", border: "1px solid rgba(237,232,223,0.1)", cursor: "pointer" }}
                  >
                    <Download size={12} style={{ color: "#EDE8DF" }} />
                    <span className={mobileNavOpen ? "inline" : "hidden md:inline"} style={{ fontFamily: "'DM Mono', monospace", fontSize: "10.5px", color: "#EDE8DF", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Backup</span>
                  </button>
                  <button
                    onClick={() => restoreInputRef.current?.click()}
                    title="Restore from a previously downloaded backup file"
                    className="flex items-center justify-center gap-1.5 rounded-lg py-2 transition-opacity hover:opacity-70"
                    style={{ flex: 1, background: "rgba(237,232,223,0.05)", border: "1px solid rgba(237,232,223,0.1)", cursor: "pointer" }}
                  >
                    <Upload size={12} style={{ color: "#EDE8DF" }} />
                    <span className={mobileNavOpen ? "inline" : "hidden md:inline"} style={{ fontFamily: "'DM Mono', monospace", fontSize: "10.5px", color: "#EDE8DF", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Restore</span>
                  </button>
                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept="application/json"
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestoreFileSelected(f); e.target.value = ""; }}
                  />
                </div>
                {restoreError && (
                  <p role="alert" className={mobileNavOpen ? "block" : "hidden md:block"} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#E05252", lineHeight: 1.5, margin: 0 }}>
                    {restoreError}
                  </p>
                )}
                {restored && (
                  <p className={mobileNavOpen ? "block" : "hidden md:block"} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#14ADB5", lineHeight: 1.5, margin: 0 }}>
                    ✓ Restored and saved
                  </p>
                )}

                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 w-full transition-opacity hover:opacity-70 ${mobileNavOpen ? "" : "justify-center md:justify-start"}`}
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <LogOut size={13} style={{ color: "#EDE8DF" }} />
                  <span className={mobileNavOpen ? "inline" : "hidden md:inline"} style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#EDE8DF", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                    Log Out
                  </span>
                </button>
              </div>
            </div>

            {/* Backdrop — mobile only, closes the expanded drawer without changing tab */}
            {mobileNavOpen && (
              <div
                className="md:hidden fixed inset-0 z-20"
                style={{ background: "rgba(6, 9, 12, 0.6)" }}
                onClick={() => setMobileNavOpen(false)}
              />
            )}

            {/* Main content — ml-16 reserves space for the always-fixed collapsed rail (see
                sidebar above); md:ml-0 hands that back once the sidebar returns to its normal
                static, in-flow desktop layout. */}
            <div
              className="flex-1 flex flex-col h-full overflow-hidden ml-16 md:ml-0"
              style={{ background: "#0F1519" }}
            >
              {/* Top bar */}
              <div
                className="flex items-center justify-between px-4 md:px-8 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(237,232,223,0.06)" }}
              >
                <div>
                  <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "18px", color: "#EDE8DF", fontWeight: 400 }}>
                    {TABS.find((t) => t.id === activeTab)?.label}
                  </h2>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", letterSpacing: "0.08em" }}>
                    Changes save directly to the live site
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="transition-opacity hover:opacity-60"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable content. Top padding lives on the INNER wrapper, not this scrolling
                  element itself — a sticky child's `top:0` clamps against this element's own
                  padding edge, so padding-top here would leave an uncovered gap between the top
                  bar and a clamped sticky header, letting already-scrolled-past content show
                  through it as you scroll. Padding on a plain inner div has no such effect. */}
              <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6">
              <div className="pt-6">
                {activeTab === "home" && (
                  <>
                    <CMSSectionHeading>Global Settings</CMSSectionHeading>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <CMSInput label="Email" value={content.global.email} onChange={(v) => updateContent({ global: { ...content.global, email: v } })} />
                      <CMSInput label="Phone" value={content.global.phone} onChange={(v) => updateContent({ global: { ...content.global, phone: v } })} />
                      <CMSInput label="Location" value={content.global.location} onChange={(v) => updateContent({ global: { ...content.global, location: v } })} />
                      <CMSInput label="Tagline" value={content.global.tagline} onChange={(v) => updateContent({ global: { ...content.global, tagline: v } })} />
                    </div>
                    <CMSSectionHeading>Homepage</CMSSectionHeading>
                    <ResponsiveRichTextEditor
                      label="Headline"
                      value={content.homepage.headline}
                      onChange={(v) => updateContent({ homepage: { ...content.homepage, headline: v } })}
                      mobileValue={content.homepage.headlineMobile}
                      onMobileChange={(v) => updateContent({ homepage: { ...content.homepage, headlineMobile: v } })}
                      previewStyle="font-family: var(--font-heading); font-size: clamp(52px, 8vw, 96px); color: var(--foreground); line-height: 1.05; font-weight: 400; letter-spacing: -0.02em; text-align: center;"
                    />
                    <ResponsiveRichTextEditor
                      label="Sub-headline"
                      value={content.homepage.subheadline}
                      onChange={(v) => updateContent({ homepage: { ...content.homepage, subheadline: v } })}
                      mobileValue={content.homepage.subheadlineMobile}
                      onMobileChange={(v) => updateContent({ homepage: { ...content.homepage, subheadlineMobile: v } })}
                      previewStyle="font-family: var(--font-body); font-size: clamp(16px, 2vw, 20px); color: var(--muted-foreground); line-height: 1.6; font-weight: 300; text-align: center;"
                    />
                    <ResponsiveRichTextEditor
                      label="Question"
                      value={content.homepage.question}
                      onChange={(v) => updateContent({ homepage: { ...content.homepage, question: v } })}
                      mobileValue={content.homepage.questionMobile}
                      onMobileChange={(v) => updateContent({ homepage: { ...content.homepage, questionMobile: v } })}
                      previewStyle="font-family: var(--font-heading); font-style: italic; font-size: 32px; color: var(--c-teal); text-align: center;"
                    />
                    <ResponsiveRichTextEditor
                      label="Footer Note (shown after the location, e.g. Adelaide, Australia · [this])"
                      value={content.homepage.footerNote}
                      onChange={(v) => updateContent({ homepage: { ...content.homepage, footerNote: v } })}
                      mobileValue={content.homepage.footerNoteMobile}
                      onMobileChange={(v) => updateContent({ homepage: { ...content.homepage, footerNoteMobile: v } })}
                      previewStyle="font-family: var(--font-mono); font-size: 10px; color: var(--c-text-dim); letter-spacing: 0.1em; text-transform: uppercase; text-align: center;"
                    />

                    <CMSSectionHeading>Homepage Cards</CMSSectionHeading>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -12, marginBottom: 16, lineHeight: 1.5 }}>
                      The 4 clickable cards on the homepage. Question and description are editable per card — the button label (e.g. &quot;Show me your work&quot;) stays fixed.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
                      {HOME_CARD_LABELS.map(({ id, label }) => (
                        <CMSCard key={id}>
                          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "var(--c-heading)", fontWeight: 400, marginBottom: 14 }}>
                            {label}
                          </p>
                          <ResponsiveRichTextEditor
                            label="Question"
                            value={content.homepage.cards[id].question}
                            onChange={(v) => updateContent({ homepage: { ...content.homepage, cards: { ...content.homepage.cards, [id]: { ...content.homepage.cards[id], question: v } } } })}
                            mobileValue={content.homepage.cards[id].questionMobile}
                            onMobileChange={(v) => updateContent({ homepage: { ...content.homepage, cards: { ...content.homepage.cards, [id]: { ...content.homepage.cards[id], questionMobile: v } } } })}
                            previewStyle="font-family: var(--font-heading); font-size: clamp(16px, 1.5vw, 20px); color: var(--foreground); line-height: 1.3; font-weight: 400;"
                          />
                          <ResponsiveRichTextEditor
                            label="Description"
                            value={content.homepage.cards[id].description}
                            onChange={(v) => updateContent({ homepage: { ...content.homepage, cards: { ...content.homepage.cards, [id]: { ...content.homepage.cards[id], description: v } } } })}
                            mobileValue={content.homepage.cards[id].descriptionMobile}
                            onMobileChange={(v) => updateContent({ homepage: { ...content.homepage, cards: { ...content.homepage.cards, [id]: { ...content.homepage.cards[id], descriptionMobile: v } } } })}
                            previewStyle="font-family: var(--font-body); font-size: 13px; color: var(--muted-foreground); line-height: 1.6; font-weight: 300;"
                          />
                        </CMSCard>
                      ))}
                    </div>

                    {/* Lives here rather than under Evaluate because PathCTA (this same
                        heading/body pair) renders at the bottom of all 4 experience pages, not
                        just Evaluate — Home better reflects that it's site-wide, not page-specific. */}
                    <CMSSectionHeading>Contact CTA</CMSSectionHeading>
                    <ResponsiveRichTextEditor
                      label="CTA Heading"
                      value={content.evaluate.ctaHeading}
                      onChange={(v) => updateContent({ evaluate: { ...content.evaluate, ctaHeading: v } })}
                      mobileValue={content.evaluate.ctaHeadingMobile}
                      onMobileChange={(v) => updateContent({ evaluate: { ...content.evaluate, ctaHeadingMobile: v } })}
                    />
                    <ResponsiveRichTextEditor
                      label="CTA Body"
                      value={content.evaluate.ctaBody}
                      onChange={(v) => updateContent({ evaluate: { ...content.evaluate, ctaBody: v } })}
                      mobileValue={content.evaluate.ctaBodyMobile}
                      onMobileChange={(v) => updateContent({ evaluate: { ...content.evaluate, ctaBodyMobile: v } })}
                    />
                  </>
                )}
                {activeTab === "work" && (
                  <WorkSection
                    data={content.work}
                    companies={content.companies}
                    evaluateStats={content.evaluate.stats}
                    onChange={(v) => {
                      updateContent({ work: v });
                      // Persist immediately on deletion so it survives page refresh
                      const deleted =
                        v.projects.length < content.work.projects.length ||
                        v.caseStudies.length < content.work.caseStudies.length;
                      if (deleted) persistContent({ work: v });
                    }}
                  />
                )}
                {activeTab === "evaluate" && (
                  <EvaluateSection
                    data={content.evaluate}
                    companies={content.companies}
                    projects={getAllLinkableProjects(content)}
                    onChange={(v) => updateContent({ evaluate: v })}
                  />
                )}
                {activeTab === "process" && (
                  <ProcessSection data={content.process} onChange={(v) => updateContent({ process: v })} />
                )}
                {activeTab === "story" && (
                  <StorySection data={content.story} onChange={(v) => updateContent({ story: v })} />
                )}
                {activeTab === "enquiry" && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#EDE8DF", letterSpacing: "0.06em" }}>
                        {enquiriesLoading ? "Loading…" : `${enquiries.length} enquir${enquiries.length === 1 ? "y" : "ies"}`}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={fetchEnquiries}
                          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                          style={{ background: "none", border: "1px solid rgba(237,232,223,0.1)", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.04em" }}
                        >
                          Refresh
                        </button>
                        {enquiries.length > 0 && !confirmClearAll && (
                          <button
                            onClick={() => setConfirmClearAll(true)}
                            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                            style={{ background: "none", border: "1px solid rgba(192,57,43,0.3)", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", color: "#C0392B", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.04em" }}
                          >
                            <Trash2 size={12} /> Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    {confirmClearAll && (
                      <div style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <AlertTriangle size={13} style={{ color: "#C0392B", flexShrink: 0 }} />
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12.5px", color: "#EDE8DF" }}>
                            Delete all {enquiries.length} enquir{enquiries.length === 1 ? "y" : "ies"}? This can&apos;t be undone.
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={async () => { await clearEnquiriesAction(); setEnquiries([]); setConfirmClearAll(false); }}
                            style={{ background: "#C0392B", border: "none", borderRadius: "7px", padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#fff" }}
                          >
                            Delete all
                          </button>
                          <button
                            onClick={() => setConfirmClearAll(false)}
                            style={{ background: "transparent", border: "1px solid rgba(237,232,223,0.15)", borderRadius: "7px", padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#EDE8DF" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {enquiries.length === 0 ? (
                      <div style={{ border: "0.5px dashed rgba(237,232,223,0.1)", borderRadius: "14px", padding: "64px 24px", textAlign: "center" }}>
                        <Inbox size={24} style={{ color: "#6B7E8A", margin: "0 auto 12px" }} />
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#EDE8DF", letterSpacing: "0.08em" }}>No enquiries yet</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#EDE8DF", marginTop: "6px" }}>Enquiries submitted via the contact form will appear here.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {[...enquiries].reverse().map((enq) => (
                          <div key={enq.id} style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.06)", borderRadius: "12px", padding: "18px 20px" }}>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-3">
                              <div>
                                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", color: "#EDE8DF", fontWeight: 400, marginBottom: "2px" }}>{enq.name}</p>
                                <a href={`mailto:${enq.email}`} style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#14ADB5", textDecoration: "none" }}>{enq.email}</a>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", letterSpacing: "0.06em" }}>
                                  {new Date(enq.timestamp).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {confirmDeleteEnquiryId === enq.id ? (
                                  <>
                                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11.5px", color: "#EDE8DF" }}>Delete?</span>
                                    <button
                                      onClick={async () => { await deleteEnquiryAction(enq.id); setEnquiries(prev => prev.filter(e => e.id !== enq.id)); setConfirmDeleteEnquiryId(null); }}
                                      style={{ background: "#C0392B", border: "none", borderRadius: "5px", padding: "3px 9px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#fff" }}
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteEnquiryId(null)}
                                      style={{ background: "transparent", border: "1px solid rgba(237,232,223,0.15)", borderRadius: "5px", padding: "3px 9px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF" }}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteEnquiryId(enq.id)}
                                    title="Delete enquiry"
                                    aria-label={`Delete enquiry from ${enq.name}`}
                                    className="hover:opacity-60 transition-opacity"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px" }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13.5px", lineHeight: 1.6, color: "#EDE8DF", whiteSpace: "pre-wrap" }}>{enq.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "media" && <MediaSection />}
                {activeTab === "history" && <HistorySection />}
                {activeTab === "design" && (
                  <DesignSystemSection
                    data={content.designSystem}
                    branding={content.branding}
                    socials={content.socials}
                    notFound={content.notFound}
                    companies={content.companies}
                    companyCreditCopy={content.companyCreditCopy}
                    onChange={(v) => updateContent({ designSystem: v })}
                    onBrandingChange={(v) => updateContent({ branding: v })}
                    onSocialsChange={(v) => updateContent({ socials: v })}
                    onNotFoundChange={(v) => updateContent({ notFound: v })}
                    onCompaniesChange={(v) => updateContent({ companies: v })}
                    onCompanyCreditCopyChange={(v) => updateContent({ companyCreditCopy: v })}
                  />
                )}
              </div>
              </div>
            </div>
          </motion.div>

          {/* Restore confirmation — overwrites everything currently in the CMS, so this needs
              its own explicit confirm rather than the inline row-swap pattern used elsewhere. */}
          <AnimatePresence>
            {pendingRestore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[60] flex items-center justify-center px-6"
                style={{ background: "rgba(6, 9, 12, 0.7)" }}
              >
                <div style={{ background: "#141D24", border: "1px solid rgba(192,57,43,0.3)", borderRadius: "16px", padding: "28px", maxWidth: 420, width: "100%" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} style={{ color: "#C0392B" }} />
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", color: "#EDE8DF", fontWeight: 400, margin: 0 }}>Restore this backup?</p>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#EDE8DF", lineHeight: 1.6, marginBottom: "22px" }}>
                    This replaces everything currently in the CMS — every project, page, and design setting — with what&apos;s in this backup file, and saves immediately. Anything changed since that backup was taken will be lost.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={confirmRestore}
                      className="hover:opacity-80 transition-opacity"
                      style={{ flex: 1, background: "#C0392B", border: "none", borderRadius: "10px", padding: "10px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#fff", letterSpacing: "0.06em" }}
                    >
                      Restore &amp; overwrite
                    </button>
                    <button
                      onClick={() => setPendingRestore(null)}
                      className="hover:opacity-80 transition-opacity"
                      style={{ flex: 1, background: "none", border: "1px solid rgba(237,232,223,0.15)", borderRadius: "10px", padding: "10px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#EDE8DF", letterSpacing: "0.06em" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
