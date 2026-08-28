"use client";

import { useEffect, useState } from "react";
import { History as HistoryIcon, RotateCcw, AlertTriangle, Check } from "lucide-react";
import { useContentStore, getHistory, diffSections } from "@/store/contentStore";
import type { CMSHistoryEntry } from "@/store/contentStore";
import { CMSSectionHeading } from "@/components/CMSFields";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// What this list will look like once content lives in Postgres: every entry here is real,
// stored today under a separate localStorage key (see getHistory() in contentStore.ts) and
// archived automatically on every save. The only things that change when a database is
// connected are where entries live (a table instead of this browser) and the 20-entry cap
// (lifted once storage isn't a quota-limited browser API).
export function HistorySection() {
  const { content, updateContent, persistContent } = useContentStore();
  const [history, setHistory] = useState<CMSHistoryEntry[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setHistory(getHistory());
    refresh();
    window.addEventListener("cms_content_updated", refresh);
    return () => window.removeEventListener("cms_content_updated", refresh);
  }, []);

  function handleRestore(entry: CMSHistoryEntry) {
    // Both calls close over the same pre-restore `content` and independently merge entry.content
    // onto it (see persistContent's own deepMerge) — same pattern MediaSection uses, no need to
    // wait for a state flush. persistContent also archives whatever was live right before this
    // call, so restoring an old version is itself undoable from this same list.
    updateContent(entry.content);
    const ok = persistContent(entry.content);
    setConfirmId(null);
    if (ok) {
      setRestoredId(entry.id);
      setTimeout(() => setRestoredId(null), 2500);
    }
  }

  return (
    <div>
      <CMSSectionHeading>Version History</CMSSectionHeading>

      <div
        style={{
          background: "rgba(20,173,181,0.06)",
          border: "1px solid rgba(20,173,181,0.2)",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "20px",
        }}
      >
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12.5px", color: "#EDE8DF", lineHeight: 1.6, margin: 0 }}>
          A preview of what version history looks like once connected — every save below is
          real, kept in this browser only and capped at the most recent 20. Connecting a
          database removes that cap and makes history available from any device, but the list
          and restore flow you see here won&apos;t change.
        </p>
      </div>

      {/* Current — pinned, not itself restorable, gives the list a "you are here" anchor */}
      <div
        style={{
          background: "#141D24",
          border: "1px solid rgba(20,173,181,0.3)",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: "2px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#14ADB5", display: "inline-block" }} />
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13.5px", color: "#EDE8DF", fontWeight: 400, margin: 0 }}>
              Current version
            </p>
          </div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10.5px", color: "#14ADB5", letterSpacing: "0.04em", margin: 0 }}>
            Live now
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div style={{ border: "0.5px dashed rgba(237,232,223,0.1)", borderRadius: "14px", padding: "64px 24px", textAlign: "center" }}>
          <HistoryIcon size={24} style={{ color: "#6B7E8A", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#EDE8DF", letterSpacing: "0.08em" }}>No saved versions yet</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#EDE8DF", marginTop: "6px" }}>
            History starts building the next time you save changes — each save archives what was
            live right before it.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {history.map((entry) => {
            const changed = diffSections(entry.content, content);
            return (
              <div key={entry.id} style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.06)", borderRadius: "12px", padding: "16px 20px" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#EDE8DF", letterSpacing: "0.04em", margin: 0 }}>
                      {formatTimestamp(entry.timestamp)}
                    </p>
                    <div className="flex flex-wrap gap-1.5" style={{ marginTop: "8px" }}>
                      {changed.length === 0 ? (
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11.5px", color: "#8C9AA3", fontStyle: "italic" }}>
                          No differences from the current version
                        </span>
                      ) : (
                        changed.map((label) => (
                          <span
                            key={label}
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "10px",
                              color: "#8C9AA3",
                              letterSpacing: "0.02em",
                              background: "rgba(237,232,223,0.05)",
                              border: "1px solid rgba(237,232,223,0.08)",
                              borderRadius: "5px",
                              padding: "2px 8px",
                            }}
                          >
                            {label}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    {restoredId === entry.id ? (
                      <span className="flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11.5px", color: "#14ADB5" }}>
                        <Check size={12} /> Restored
                      </span>
                    ) : confirmId === entry.id ? (
                      <>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11.5px", color: "#EDE8DF" }}>Restore?</span>
                        <button
                          onClick={() => handleRestore(entry)}
                          aria-label={`Confirm restore of version from ${formatTimestamp(entry.timestamp)}`}
                          style={{ background: "#14ADB5", border: "none", borderRadius: "5px", padding: "3px 9px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#0C1117" }}
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          aria-label="Cancel restore"
                          style={{ background: "transparent", border: "1px solid rgba(237,232,223,0.15)", borderRadius: "5px", padding: "3px 9px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmId(entry.id)}
                        title="Restore this version"
                        aria-label={`Restore version from ${formatTimestamp(entry.timestamp)}`}
                        className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                        style={{ background: "none", border: "1px solid rgba(237,232,223,0.1)", borderRadius: "7px", padding: "5px 10px", cursor: "pointer", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: "10.5px", letterSpacing: "0.02em" }}
                      >
                        <RotateCcw size={11} /> Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="flex items-start gap-2" style={{ marginTop: "16px" }}>
          <AlertTriangle size={12} style={{ color: "#8C9AA3", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11.5px", color: "#8C9AA3", lineHeight: 1.5, margin: 0 }}>
            Restoring replaces everything currently in the CMS with that version, and saves
            immediately. The version you&apos;re replacing is archived first, so restoring is
            itself undoable from this same list.
          </p>
        </div>
      )}
    </div>
  );
}
