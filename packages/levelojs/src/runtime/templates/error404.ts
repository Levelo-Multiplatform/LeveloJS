// src/runtime/templates/error404.ts - Levelo JS Native 404 Visual Node Template
import { head } from "../head.js";

export interface ErrorTemplateProps {
  h: (tag: any, props: any, ...children: any[]) => any;
}

/**
 * Returns a globally neutral, ultra-sleek 404 component tree with Levelo's
 * official identity.
 *
 * The returned function is the component itself. `head()` runs when the
 * component renders, not when this factory is called, so the 404 metadata
 * is only injected if the 404 view actually mounts.
 */
export function getClean404Component(h: ErrorTemplateProps["h"]) {
  return () => {
    head({
      title: "404 | Page Not Found",
      description:
        "The requested path does not map to any active route descriptors within this Levelo instance.",
    });

    return h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
          textAlign: "center",
          padding: "40px 20px",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "transparent",
        },
      },
      h(
        "h1",
        {
          style: {
            fontSize: "7rem",
            fontWeight: "800",
            margin: "0",
            lineHeight: "1",
            color: "#0f172a",
            opacity: "0.06",
            letterSpacing: "-2px",
          },
        },
        "404",
      ),
      h(
        "h2",
        {
          style: {
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#0f172a",
            margin: "5px 0 12px 0",
          },
        },
        "Page Not Found",
      ),
      h(
        "p",
        {
          style: {
            fontSize: "0.95rem",
            color: "#64748b",
            maxWidth: "380px",
            margin: "0 0 32px 0",
            lineHeight: "1.6",
          },
        },
        "The requested path does not map to any active route descriptors within this Levelo instance.",
      ),
      h(
        "a",
        {
          href: "/",
          style: {
            display: "inline-flex",
            alignItems: "center",
            padding: "11px 24px",
            backgroundColor: "transparent",
            color: "#000",
            textDecoration: "none",
            fontWeight: "500",
            fontSize: "0.9rem",
            border: "1px solid #000",
          },
          onmouseover:
            "this.style.backgroundColor='#000'; this.style.color='#fff'",
          onmouseout:
            "this.style.backgroundColor='transparent'; this.style.color='#000'",
        },
        "Go to Homepage",
      ),
    );
  };
}