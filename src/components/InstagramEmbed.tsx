"use client";

import React, { useState, useEffect, useRef } from "react";

type Props = {
  url: string;
};

// iframe.contentWindow → setHeight のレジストリ
const iframeRegistry = new Map<Window, (h: number) => void>();

// onLoad より先に届いた postMessage の高さをキャッシュ
const pendingHeights = new Map<Window, number>();

let globalListenerAdded = false;

function ensureGlobalListener() {
  if (globalListenerAdded) return;
  globalListenerAdded = true;
  window.addEventListener("message", (e: MessageEvent) => {
    if (!e.source || !e.origin.includes("instagram.com")) return;
    let data = e.data;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    const h = data?.details?.height;
    if (typeof h !== "number" || h <= 50) return;

    const source = e.source as Window;
    const cb = iframeRegistry.get(source);
    if (cb) {
      cb(h);
    } else {
      pendingHeights.set(source, h);
    }
  });
}

/**
 * Instagram 埋め込みコンポーネント
 */
export function InstagramEmbed({ url }: Props) {
  const match = url.match(/instagram\.com\/p\/([A-Za-z0-9_\-]+)/);
  if (!match) return null;
  const shortcode = match[1];

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    ensureGlobalListener();
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      const win = iframe.contentWindow;
      if (!win) return;
      iframeRegistry.set(win, setHeight);
      const pending = pendingHeights.get(win);
      if (pending !== undefined) {
        setHeight(pending);
        pendingHeights.delete(win);
      }
    };

    iframe.addEventListener("load", onLoad);
    return () => {
      iframe.removeEventListener("load", onLoad);
      if (iframe.contentWindow) iframeRegistry.delete(iframe.contentWindow);
    };
  }, []);

  return (
    <div
      className="instagram-embed"
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        maxWidth: "540px",
        margin: "0 auto",
      }}
    >
      <iframe
        ref={iframeRef}
        src={`https://www.instagram.com/p/${shortcode}/embed/`}
        className="instagram-iframe"
        frameBorder={0}
        scrolling="no"
        style={{
          width: "100%",
          maxWidth: "540px",
          height: `${height}px`,
          border: "none",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}
