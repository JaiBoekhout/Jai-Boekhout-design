"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { CMSInput, CMSSectionHeading, CMSCard, useDragReorder, DragHandle } from "@/components/CMSFields";
import { ResponsiveRichTextEditor } from "@/components/ResponsiveRichTextEditor";
import { ImagePicker } from "@/components/ImagePicker";
import { HeroImageOverlayEditor, STORY_HERO_OVERLAY_DEFAULTS } from "@/components/HeroOverlayFields";
import type { CMSStory } from "@/store/contentStore";

// Drives the Story tab's sidebar sub-section list in AdminCMS.tsx (same pattern as
// DESIGN_SYSTEM_SECTIONS in DesignSystemSection.tsx).
export const STORY_SECTIONS: { id: string; label: string }[] = [
  { id: "story-hero", label: "Hero" },
  { id: "story-journey", label: "The Journey (Timeline)" },
  { id: "story-beyond-design", label: "Beyond Design (Interests)" },
  { id: "story-closing-quote", label: "Closing Quote" },
];

interface Props {
  data: CMSStory;
  // What's actually in Postgres right now — compared against `data` to flag unsaved
  // fields/entries (see the "dirty" outline below), never used for anything else.
  savedData: CMSStory;
  onChange: (data: CMSStory) => void;
}

export function StorySection({ data, savedData, onChange }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [deleteConfirmInterestIdx, setDeleteConfirmInterestIdx] = useState<number | null>(null);
  const timelineDrag = useDragReorder(data.timeline, (v) => onChange({ ...data, timeline: v }));
  const interestsDrag = useDragReorder(data.interests, (v) => onChange({ ...data, interests: v }));

  useEffect(() => {
    if (deleteConfirmIdx === null) return;
    const t = setTimeout(() => setDeleteConfirmIdx(null), 3000);
    return () => clearTimeout(t);
  }, [deleteConfirmIdx]);

  useEffect(() => {
    if (deleteConfirmInterestIdx === null) return;
    const t = setTimeout(() => setDeleteConfirmInterestIdx(null), 3000);
    return () => clearTimeout(t);
  }, [deleteConfirmInterestIdx]);

  function addTimelineItem() {
    onChange({ ...data, timeline: [...data.timeline, { year: "", title: "", body: "", tag: "" }] });
    setOpenIdx(data.timeline.length);
  }

  function moveTimelineItem(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= data.timeline.length) return;
    const t = [...data.timeline];
    [t[i], t[j]] = [t[j], t[i]];
    onChange({ ...data, timeline: t });
    setOpenIdx((cur) => (cur === i ? j : cur === j ? i : cur));
  }

  function deleteTimelineItem(i: number) {
    onChange({ ...data, timeline: data.timeline.filter((_, idx) => idx !== i) });
    setDeleteConfirmIdx(null);
    setOpenIdx((cur) => (cur === i ? null : cur));
  }

  function addInterest() {
    onChange({ ...data, interests: [...data.interests, { label: "", detail: "" }] });
  }

  function moveInterest(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= data.interests.length) return;
    const ins = [...data.interests];
    [ins[i], ins[j]] = [ins[j], ins[i]];
    onChange({ ...data, interests: ins });
  }

  function deleteInterest(i: number) {
    onChange({ ...data, interests: data.interests.filter((_, idx) => idx !== i) });
    setDeleteConfirmInterestIdx(null);
  }

  return (
    <div>
      <CMSSectionHeading id="story-hero">Hero</CMSSectionHeading>
      <ResponsiveRichTextEditor
        label="Hero Statement"
        value={data.heroStatement}
        onChange={(v) => onChange({ ...data, heroStatement: v })}
        mobileValue={data.heroStatementMobile}
        onMobileChange={(v) => onChange({ ...data, heroStatementMobile: v })}
        dirty={data.heroStatement !== savedData.heroStatement || data.heroStatementMobile !== savedData.heroStatementMobile}
      />
      <ResponsiveRichTextEditor
        label="Sub-headline"
        value={data.subheadline}
        onChange={(v) => onChange({ ...data, subheadline: v })}
        mobileValue={data.subheadlineMobile}
        onMobileChange={(v) => onChange({ ...data, subheadlineMobile: v })}
        dirty={data.subheadline !== savedData.subheadline || data.subheadlineMobile !== savedData.subheadlineMobile}
      />
      <HeroImageOverlayEditor
        data={data}
        onChange={onChange}
        imageLabel="Hero Background Photo · wide, optional — leave empty to keep the plain hero background"
        defaults={STORY_HERO_OVERLAY_DEFAULTS}
      />
      <ImagePicker
        label="Portrait Photo · 3:4 portrait"
        previewRatio="3/4"
        value={data.portraitImageUrl}
        position={data.portraitImagePosition}
        scale={data.portraitImageScale}
        onChange={(url) => onChange({ ...data, portraitImageUrl: url })}
        onPositionChange={(pos) => onChange({ ...data, portraitImagePosition: pos })}
        onScaleChange={(s) => onChange({ ...data, portraitImageScale: s })}
      />
      <ResponsiveRichTextEditor
        label="Portrait Caption (optional, shown under the photo)"
        value={data.portraitCaption ?? ""}
        onChange={(v) => onChange({ ...data, portraitCaption: v })}
        mobileValue={data.portraitCaptionMobile}
        onMobileChange={(v) => onChange({ ...data, portraitCaptionMobile: v })}
        dirty={(data.portraitCaption ?? "") !== (savedData.portraitCaption ?? "") || data.portraitCaptionMobile !== savedData.portraitCaptionMobile}
      />

      <CMSSectionHeading id="story-journey">The Journey (Timeline)</CMSSectionHeading>
      <CMSInput
        label="Section Heading (public page)"
        value={data.timelineHeading ?? "The Journey"}
        onChange={(v) => onChange({ ...data, timelineHeading: v })}
        dirty={(data.timelineHeading ?? "The Journey") !== (savedData.timelineHeading ?? "The Journey")}
      />
      {data.timeline.map((item, i) => {
        const saved = savedData.timeline[i];
        const dirty = !saved || JSON.stringify(item) !== JSON.stringify(saved);
        return (
        <CMSCard
          key={i}
          style={{ ...timelineDrag.cardStyle(i), ...(dirty ? { borderColor: "rgba(245,158,11,0.5)", boxShadow: "0 0 0 1px rgba(245,158,11,0.15)" } : {}) }}
          {...timelineDrag.dropTargetProps(i)}
        >
          <div className="w-full flex items-center gap-2">
            <button
              className="flex-1 min-w-0 text-left"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
            >
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "var(--c-heading)", fontWeight: 400 }}>{item.title || "Untitled"}</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5" }}>{item.year} · {item.tag}</p>
            </button>

            <div className="flex gap-1" style={{ flexShrink: 0 }}>
              <DragHandle {...timelineDrag.dragHandleProps(i)} />
              <button
                onClick={() => moveTimelineItem(i, -1)}
                disabled={i === 0}
                title="Move up"
                style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "rgba(140,154,163,0.2)" : "#EDE8DF", padding: "4px", display: "flex", alignItems: "center" }}
              >
                <ArrowUp size={12} />
              </button>
              <button
                onClick={() => moveTimelineItem(i, 1)}
                disabled={i === data.timeline.length - 1}
                title="Move down"
                style={{ background: "none", border: "none", cursor: i === data.timeline.length - 1 ? "default" : "pointer", color: i === data.timeline.length - 1 ? "rgba(140,154,163,0.2)" : "#EDE8DF", padding: "4px", display: "flex", alignItems: "center" }}
              >
                <ArrowDown size={12} />
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmIdx === i) deleteTimelineItem(i);
                  else setDeleteConfirmIdx(i);
                }}
                title={deleteConfirmIdx === i ? "Click again to confirm" : "Delete entry"}
                style={{
                  background: deleteConfirmIdx === i ? "rgba(192,57,43,0.15)" : "none",
                  border: `1px solid ${deleteConfirmIdx === i ? "rgba(192,57,43,0.4)" : "transparent"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  color: deleteConfirmIdx === i ? "#C0392B" : "#EDE8DF",
                  padding: deleteConfirmIdx === i ? "4px 8px" : "4px",
                  display: "flex", alignItems: "center", gap: 4,
                  fontFamily: "'DM Mono', monospace", fontSize: "10px",
                  transition: "all 0.15s ease",
                }}
              >
                <Trash2 size={12} />
                {deleteConfirmIdx === i && "Delete?"}
              </button>
              <div
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{ cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", color: "#EDE8DF" }}
              >
                {openIdx === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>
          </div>
          {openIdx === i && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(237,232,223,0.06)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CMSInput label="Year" value={item.year} onChange={(v) => { const t = [...data.timeline]; t[i] = { ...t[i], year: v }; onChange({ ...data, timeline: t }); }} />
                <CMSInput label="Tag / Era" value={item.tag} onChange={(v) => { const t = [...data.timeline]; t[i] = { ...t[i], tag: v }; onChange({ ...data, timeline: t }); }} />
              </div>
              <CMSInput label="Title" value={item.title} onChange={(v) => { const t = [...data.timeline]; t[i] = { ...t[i], title: v }; onChange({ ...data, timeline: t }); }} />
              <ResponsiveRichTextEditor
                label="Body"
                value={item.body}
                onChange={(v) => { const t = [...data.timeline]; t[i] = { ...t[i], body: v }; onChange({ ...data, timeline: t }); }}
                mobileValue={item.bodyMobile}
                onMobileChange={(v) => { const t = [...data.timeline]; t[i] = { ...t[i], bodyMobile: v }; onChange({ ...data, timeline: t }); }}
              />
            </div>
          )}
        </CMSCard>
        );
      })}
      <button
        onClick={addTimelineItem}
        className="flex items-center gap-2 transition-opacity hover:opacity-80 mb-6"
        style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#0F1519", background: "#14ADB5", border: "none", borderRadius: "10px", cursor: "pointer", padding: "10px 16px" }}
      >
        <Plus size={12} /> Add Timeline Entry
      </button>

      <CMSSectionHeading id="story-beyond-design">Beyond Design (Interests)</CMSSectionHeading>
      <CMSInput
        label="Section Heading (public page)"
        value={data.interestsHeading ?? "Outside of Design"}
        onChange={(v) => onChange({ ...data, interestsHeading: v })}
        dirty={(data.interestsHeading ?? "Outside of Design") !== (savedData.interestsHeading ?? "Outside of Design")}
      />
      {data.interests.map((interest, i) => {
        const saved = savedData.interests[i];
        const dirty = !saved || JSON.stringify(interest) !== JSON.stringify(saved);
        return (
        <CMSCard
          key={i}
          style={{ ...interestsDrag.cardStyle(i), ...(dirty ? { borderColor: "rgba(245,158,11,0.5)", boxShadow: "0 0 0 1px rgba(245,158,11,0.15)" } : {}) }}
          {...interestsDrag.dropTargetProps(i)}
        >
          <div className="w-full flex items-center gap-2 mb-3">
            <DragHandle {...interestsDrag.dragHandleProps(i)} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.08em", flex: 1 }}>
              ITEM {i + 1}
            </span>
            <div className="flex gap-1" style={{ flexShrink: 0 }}>
              <button
                onClick={() => moveInterest(i, -1)}
                disabled={i === 0}
                title="Move up"
                style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "rgba(140,154,163,0.2)" : "#EDE8DF", padding: "4px", display: "flex", alignItems: "center" }}
              >
                <ArrowUp size={12} />
              </button>
              <button
                onClick={() => moveInterest(i, 1)}
                disabled={i === data.interests.length - 1}
                title="Move down"
                style={{ background: "none", border: "none", cursor: i === data.interests.length - 1 ? "default" : "pointer", color: i === data.interests.length - 1 ? "rgba(140,154,163,0.2)" : "#EDE8DF", padding: "4px", display: "flex", alignItems: "center" }}
              >
                <ArrowDown size={12} />
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmInterestIdx === i) deleteInterest(i);
                  else setDeleteConfirmInterestIdx(i);
                }}
                title={deleteConfirmInterestIdx === i ? "Click again to confirm" : "Delete item"}
                style={{
                  background: deleteConfirmInterestIdx === i ? "rgba(192,57,43,0.15)" : "none",
                  border: `1px solid ${deleteConfirmInterestIdx === i ? "rgba(192,57,43,0.4)" : "transparent"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  color: deleteConfirmInterestIdx === i ? "#C0392B" : "#EDE8DF",
                  padding: deleteConfirmInterestIdx === i ? "4px 8px" : "4px",
                  display: "flex", alignItems: "center", gap: 4,
                  fontFamily: "'DM Mono', monospace", fontSize: "10px",
                  transition: "all 0.15s ease",
                }}
              >
                <Trash2 size={12} />
                {deleteConfirmInterestIdx === i && "Delete?"}
              </button>
            </div>
          </div>
          <CMSInput label="Label" value={interest.label} onChange={(v) => { const ins = [...data.interests]; ins[i] = { ...ins[i], label: v }; onChange({ ...data, interests: ins }); }} />
          <ResponsiveRichTextEditor
            label="Detail"
            value={interest.detail}
            onChange={(v) => { const ins = [...data.interests]; ins[i] = { ...ins[i], detail: v }; onChange({ ...data, interests: ins }); }}
            mobileValue={interest.detailMobile}
            onMobileChange={(v) => { const ins = [...data.interests]; ins[i] = { ...ins[i], detailMobile: v }; onChange({ ...data, interests: ins }); }}
          />
        </CMSCard>
        );
      })}
      <button
        onClick={addInterest}
        className="flex items-center gap-2 transition-opacity hover:opacity-80 mb-6"
        style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#0F1519", background: "#14ADB5", border: "none", borderRadius: "10px", cursor: "pointer", padding: "10px 16px" }}
      >
        <Plus size={12} /> Add Interest
      </button>

      <CMSSectionHeading id="story-closing-quote">Closing Quote</CMSSectionHeading>
      <ResponsiveRichTextEditor
        label="Quote"
        value={data.closingQuote}
        onChange={(v) => onChange({ ...data, closingQuote: v })}
        mobileValue={data.closingQuoteMobile}
        onMobileChange={(v) => onChange({ ...data, closingQuoteMobile: v })}
        dirty={data.closingQuote !== savedData.closingQuote || data.closingQuoteMobile !== savedData.closingQuoteMobile}
      />
    </div>
  );
}
