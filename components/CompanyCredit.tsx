"use client";

import { useEffect, useRef } from "react";
import { X, Info } from "lucide-react";
import type { CMSCompany } from "@/store/contentStore";
import { DEFAULT_COMPANY_CREDIT_COPY } from "@/store/contentStore";

// Subtle credit line for work completed while employed at an agency — clarifies that the
// client relationship belongs to that company, not to Jai directly (copyright/IP disclosure) —
// plus a click-triggered "i" icon revealing a dismissible callout with the fuller explanation.
// `instanceId`/`openId`/`onToggle` are lifted to the parent so only one callout can be open at
// a time even when multiple badges exist on the same page (the card popup and the full case
// study page can both show a badge for the same project simultaneously).
export function CompanyCredit({
  companyId, companies, clientName, instanceId, openId, onToggle, copyTemplate,
}: {
  companyId?: string;
  companies: CMSCompany[];
  clientName: string;
  instanceId: string;
  openId: string | null;
  onToggle: (id: string | null) => void;
  copyTemplate?: string;
}) {
  const isOpen = openId === instanceId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const calloutId = `agency-info-${instanceId}`;

  useEffect(() => {
    if (!isOpen) return;

    // Move focus into the dialog (onto its close button) the moment it opens.
    dialogRef.current?.querySelector<HTMLButtonElement>("[data-close]")?.focus();

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (dialogRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onToggle(null);
    }
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        // stopImmediatePropagation so this closes only the callout, not also the project
        // popup underneath it — both listen on `document` and would otherwise both fire.
        e.stopImmediatePropagation();
        onToggle(null);
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isOpen, onToggle]);

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  if (!companyId) return null;
  const company = companies.find((c) => c.id === companyId);
  if (!company) return null;

  return (
    // The row (badge + trigger), not this outer div, is the callout's positioning anchor — see
    // the className on the row below for why, and the comment on .agency-info-callout in
    // globals.css for the matching mobile-width half of this.
    <div style={{ marginTop: 6 }}>
      {/* flex (full-width block) below 640px so the callout's position:static width:100% in
          globals.css resolves against the full row width there; inline-flex (shrink-wrapped to
          just the badge+trigger) at sm:+ so this div's own edges — not the wide content column
          it sits in — are what the callout's top-right anchor below is actually relative to. */}
      <div className="flex sm:inline-flex" style={{ alignItems: "center", gap: 9, position: "relative" }}>
        {/* Solid badge — fixed teal/dark-ink colours (not themed vars) so this reads exactly the
            same whether it sits on the page's own background or directly on a hero photo. The
            logo sits inside the badge itself, on a small white swatch — company logos vary in
            their own colouring/transparency, so a fixed light backing keeps any of them legible
            against the solid teal rather than assuming they all read fine directly on it. */}
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "#0C1117",
          background: "var(--c-teal)", borderRadius: 4, padding: company.logoUrl ? "5px 11px 5px 6px" : "6px 11px",
        }}>
          {company.logoUrl && (
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 3, padding: "3px 5px", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={company.logoUrl} alt={`${company.name} logo`} style={{ height: 12, width: "auto", maxWidth: 60, objectFit: "contain", display: "block" }} />
            </span>
          )}
          Created while working at {company.name}
        </span>
        <button
          ref={triggerRef}
          type="button"
          className="agency-info-trigger"
          aria-label="More information about this project's attribution"
          aria-expanded={isOpen}
          aria-controls={calloutId}
          onClick={() => onToggle(isOpen ? null : instanceId)}
        >
          <Info size={11} strokeWidth={2.5} />
        </button>
        {isOpen && (
          <div ref={dialogRef} id={calloutId} role="dialog" aria-label="Attribution details" className="agency-info-callout">
            <button type="button" data-close className="agency-info-callout-close" aria-label="Close" onClick={() => onToggle(null)}>
              <X size={13} />
            </button>
            <p>
              {(copyTemplate || DEFAULT_COMPANY_CREDIT_COPY)
                .replaceAll("{company}", company.name)
                .replaceAll("{client}", clientName)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
