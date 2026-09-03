"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { CMSInput, CMSArrayEditor, CMSSectionHeading, CMSCard, useDragReorder, DragHandle } from "@/components/CMSFields";
import { ResponsiveRichTextEditor } from "@/components/ResponsiveRichTextEditor";
import type { CMSProcess, CMSProcessStep } from "@/store/contentStore";

function newStepId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface Props {
  data: CMSProcess;
  // What's actually in Postgres right now — compared against `data` to flag unsaved
  // fields/steps (see the "dirty" outline below), never used for anything else.
  savedData: CMSProcess;
  onChange: (data: CMSProcess) => void;
}

export function ProcessSection({ data, savedData, onChange }: Props) {
  const [openStep, setOpenStep] = useState<string | null>(null);
  const stepsDrag = useDragReorder(data.steps, (v) => onChange({ ...data, steps: v }));

  // A missing saved counterpart (id not found) means the whole step is new and unsaved.
  function stepDirty(step: CMSProcessStep): boolean {
    const saved = savedData.steps.find((s) => s.id === step.id);
    return !saved || JSON.stringify(step) !== JSON.stringify(saved);
  }

  return (
    <div>
      <CMSSectionHeading>Hero</CMSSectionHeading>
      <ResponsiveRichTextEditor
        label="Hero Statement"
        value={data.heroStatement}
        onChange={(v) => onChange({ ...data, heroStatement: v })}
        mobileValue={data.heroStatementMobile}
        onMobileChange={(v) => onChange({ ...data, heroStatementMobile: v })}
        dirty={data.heroStatement !== savedData.heroStatement || data.heroStatementMobile !== savedData.heroStatementMobile}
      />

      <CMSSectionHeading>Process Steps</CMSSectionHeading>
      {data.steps.map((step, i) => (
        <CMSCard
          key={step.id}
          style={{ ...stepsDrag.cardStyle(i), ...(stepDirty(step) ? { borderColor: "rgba(245,158,11,0.5)", boxShadow: "0 0 0 1px rgba(245,158,11,0.15)" } : {}) }}
          {...stepsDrag.dropTargetProps(i)}
        >
          <div className="w-full flex items-center justify-between gap-2">
            <button
              className="flex-1 min-w-0 flex items-center justify-between"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onClick={() => setOpenStep(openStep === step.id ? null : step.id)}
            >
              <div className="text-left flex items-center gap-3">
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5" }}>0{i + 1}</span>
                <div>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "var(--c-heading)", fontWeight: 400 }}>{step.title}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#EDE8DF", fontWeight: 300 }}>{step.tagline}</p>
                </div>
              </div>
              {openStep === step.id ? <ChevronUp size={14} style={{ color: "#EDE8DF" }} /> : <ChevronDown size={14} style={{ color: "#EDE8DF" }} />}
            </button>
            <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
              <DragHandle {...stepsDrag.dragHandleProps(i)} />
              <button
                onClick={() => {
                  if (i === 0) return;
                  const s = [...data.steps];
                  [s[i - 1], s[i]] = [s[i], s[i - 1]];
                  onChange({ ...data, steps: s });
                }}
                disabled={i === 0}
                className="hover:opacity-70 transition-opacity"
                style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
              >
                <ArrowUp size={13} />
              </button>
              <button
                onClick={() => {
                  if (i === data.steps.length - 1) return;
                  const s = [...data.steps];
                  [s[i], s[i + 1]] = [s[i + 1], s[i]];
                  onChange({ ...data, steps: s });
                }}
                disabled={i === data.steps.length - 1}
                className="hover:opacity-70 transition-opacity"
                style={{ background: "none", border: "none", cursor: i === data.steps.length - 1 ? "default" : "pointer", color: i === data.steps.length - 1 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
              >
                <ArrowDown size={13} />
              </button>
              <button
                onClick={() => {
                  const s = data.steps.filter((_, idx) => idx !== i);
                  onChange({ ...data, steps: s });
                  setOpenStep((cur) => (cur === step.id ? null : cur));
                }}
                className="hover:opacity-60 transition-opacity"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px", marginLeft: "2px" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {openStep === step.id && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(237,232,223,0.06)" }}>
              <CMSInput label="Title" value={step.title} onChange={(v) => { const s = [...data.steps]; s[i] = { ...s[i], title: v }; onChange({ ...data, steps: s }); }} />
              <CMSInput label="Tagline" value={step.tagline} onChange={(v) => { const s = [...data.steps]; s[i] = { ...s[i], tagline: v }; onChange({ ...data, steps: s }); }} />
              <ResponsiveRichTextEditor
                label="Description"
                value={step.description}
                onChange={(v) => { const s = [...data.steps]; s[i] = { ...s[i], description: v }; onChange({ ...data, steps: s }); }}
                mobileValue={step.descriptionMobile}
                onMobileChange={(v) => { const s = [...data.steps]; s[i] = { ...s[i], descriptionMobile: v }; onChange({ ...data, steps: s }); }}
              />
              <CMSArrayEditor label="Activities & Methods" items={step.activities} onChange={(v) => { const s = [...data.steps]; s[i] = { ...s[i], activities: v }; onChange({ ...data, steps: s }); }} />
              <ResponsiveRichTextEditor
                label="Example"
                value={step.example}
                onChange={(v) => { const s = [...data.steps]; s[i] = { ...s[i], example: v }; onChange({ ...data, steps: s }); }}
                mobileValue={step.exampleMobile}
                onMobileChange={(v) => { const s = [...data.steps]; s[i] = { ...s[i], exampleMobile: v }; onChange({ ...data, steps: s }); }}
              />
            </div>
          )}
        </CMSCard>
      ))}
      <button
        onClick={() => {
          const step: CMSProcessStep = { id: newStepId(), title: "New Step", tagline: "", description: "", activities: [], example: "" };
          const s = [...data.steps, step];
          onChange({ ...data, steps: s });
          setOpenStep(step.id);
        }}
        className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
        style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#0F1519", background: "#14ADB5", border: "none", borderRadius: "10px", cursor: "pointer", padding: "10px 16px" }}
      >
        <Plus size={13} /> Add Step
      </button>

      <CMSSectionHeading>Closing Quote</CMSSectionHeading>
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
