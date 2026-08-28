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
    // Callout is a sibling of the badge row (not nested inside the icon's own inline span) so
    // that on narrow screens, switching it to position:static gives it this plain block div as
    // its containing block — a shrink-wrapped inline-flex span would otherwise resolve its
    // width:100% against its own content size instead of the full row width.
    <div style={{ position: "relative", marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--c-text)" }}>
        {company.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt="" style={{ height: 25.5, width: "auto", maxWidth: 114, objectFit: "contain" }} />
        )}
        <span>Created while working at {company.name}</span>
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
      </div>
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
  );
}
