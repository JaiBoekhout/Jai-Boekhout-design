"use client";

import { useReducedMotion } from "motion/react";
import type { CMSClient } from "@/store/contentStore";

function LogoCard({ client }: { client: CMSClient }) {
  const card = (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "14px 32px",
        height: "128px",
        minWidth: "200px",
      }}
    >
      {client.logoUrl ? (
        <img
          src={client.logoUrl}
          alt={client.name}
          style={{ height: "72px", width: "auto", maxWidth: "180px", objectFit: "contain" }}
        />
      ) : (
        <span style={{ fontFamily: "var(--font-heading)", fontSize: "13px", color: "#1A2128", fontWeight: 400, whiteSpace: "nowrap" }}>
          {client.name}
        </span>
      )}
    </div>
  );
  if (client.url) {
    return (
      <a href={client.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }} className="hover:opacity-80 transition-opacity">
        {card}
      </a>
    );
  }
  return card;
}

interface Props {
  clients: CMSClient[];
  speed?: number;
}

// Two infinite-loop marquee rows of client logos — row 1 always renders (scrolling left),
// row 2 only if any client is tagged `row: 2` (scrolling right, offset so the two never sync).
// The CSS keyframes (marquee-left/marquee-right) live globally in app/globals.css.
export function ClientsSlider({ clients, speed = 60 }: Props) {
  const reduceMotion = useReducedMotion();
  if (!clients || clients.length === 0) return null;

  const row1 = clients.filter((c) => (c.row ?? 1) === 1);
  const row2 = clients.filter((c) => c.row === 2);
  const fill = (logos: typeof row1) => (logos.length < 6 ? [...logos, ...logos, ...logos, ...logos] : [...logos, ...logos]);

  return (
    <div
      className="clients-carousel-bg"
      style={{
        borderRadius: "16px",
        padding: "20px 0",
        overflow: reduceMotion ? "auto" : "hidden",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}
    >
      <div style={{ display: "flex", marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "12px", animation: reduceMotion ? "none" : `marquee-left ${speed}s linear infinite`, willChange: "transform", flexShrink: 0 }}>
          {fill(row1).map((client, i) => <LogoCard key={i} client={client} />)}
        </div>
      </div>
      {row2.length > 0 && (
        <div style={{ display: "flex" }}>
          <div style={{ display: "flex", gap: "12px", animation: reduceMotion ? "none" : `marquee-right ${Math.round(speed * 1.3)}s linear infinite`, animationDelay: reduceMotion ? undefined : `-${Math.round(speed * 0.4)}s`, willChange: "transform", flexShrink: 0 }}>
            {fill(row2).map((client, i) => <LogoCard key={i} client={client} />)}
          </div>
        </div>
      )}
    </div>
  );
}
