// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0A0B0E"/><circle cx="32" cy="32" r="13" fill="#EAFDFF"/><circle cx="32" cy="32" r="19" fill="none" stroke="#00E5FF" stroke-width="2.5" opacity="0.9"/><circle cx="32" cy="32" r="26" fill="none" stroke="#00E5FF" stroke-width="1.5" opacity="0.35"/></svg>`
  );

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>STAAR Hub | Cross-Life Context Intelligence</title>
        <meta
          name="description"
          content="STAAR Hub — one AI Guardian coordinating seven connected portals of your life: Work, Home, Wellbeing, Relationships, Community, Creativity and Style."
        />
        <meta name="theme-color" content="#0A0B0E" />
        <link rel="icon" href={FAVICON} />
        <link rel="apple-touch-icon" href={FAVICON} />
        <meta property="og:title" content="STAAR Hub | Cross-Life Context Intelligence" />
        <meta
          property="og:description"
          content="One intelligence. Seven portals. Watch the Guardian coordinate an entire evening in one pass."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="STAAR Hub | Cross-Life Context Intelligence" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { background: #0A0B0E; }
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
              #boot {
                position: fixed; inset: 0; z-index: 9999; background: #0A0B0E;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              #root:not(:empty) ~ #boot { display: none; }
              .boot-orb {
                width: 64px; height: 64px; border-radius: 50%; background: #EAFDFF;
                box-shadow: 0 0 40px 12px rgba(0,229,255,0.45), 0 0 90px 30px rgba(0,229,255,0.15);
                animation: bootpulse 1.6s ease-in-out infinite;
              }
              .boot-brand { margin-top: 26px; color: #FFFFFF; font-size: 15px; letter-spacing: 7px; font-weight: 800; }
              .boot-sub { margin-top: 10px; color: #9CA3AF; font-size: 12px; letter-spacing: 1px; }
              .boot-retry { display: none; margin-top: 18px; color: #00E5FF; font-size: 13px; text-decoration: underline; cursor: pointer; }
              @keyframes bootpulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
              @media (prefers-reduced-motion: reduce) { .boot-orb { animation: none; } }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0A0B0E",
        }}
      >
        {children}
        <div id="boot" aria-label="STAAR Hub is loading">
          <div className="boot-orb" />
          <div className="boot-brand">STAAR HUB</div>
          <div className="boot-sub" id="boot-sub">Waking the Guardian…</div>
          <a className="boot-retry" id="boot-retry" href="/">Retry</a>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var msgs = ["Waking the Guardian…", "Connecting seven portals…", "Almost there…"];
                var i = 0;
                var sub = document.getElementById("boot-sub");
                var iv = setInterval(function () {
                  var root = document.getElementById("root");
                  if (root && root.childNodes.length > 0) { clearInterval(iv); return; }
                  i = Math.min(i + 1, msgs.length - 1);
                  if (sub) sub.textContent = msgs[i];
                }, 5000);
                setTimeout(function () {
                  var root = document.getElementById("root");
                  if (!root || root.childNodes.length === 0) {
                    if (sub) sub.textContent = "This is taking longer than usual.";
                    var r = document.getElementById("boot-retry");
                    if (r) r.style.display = "block";
                  }
                }, 30000);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
