// src/runtime/router.ts
import { h } from "./jsx-runtime.js";
import { render, unmount } from "./dom.js";
import { applyHeadUpdates } from "./head.js";
import { getClean404Component } from "./templates/error404.js";
import { InternalRenderNode } from "./renderer/tree/InternalRenderNode.js";

/**
 * Mapping of normalized path -> component factory.
 */
type RouteComponent = () => InternalRenderNode;

const routes = new Map<string, RouteComponent>();

/**
 * Subscribers notified when the browser path changes.
 */
const routeListeners = new Set<(path: string) => void>();

/**
 * Public navigation entry point. Any internal link click routes through here.
 */
export function navigate(path: string): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === path) return;

  window.history.pushState({}, "", path);
  notifyRouteListeners();
}

function notifyRouteListeners(): void {
  const currentPath = window.location.pathname;
  routeListeners.forEach((listener) => listener(currentPath));
}

function normalizePath(input: string): string {
  let path = input;

  if (path.endsWith("/index.html")) {
    path = path.replace(/\/index\.html$/, "");
  }

  if (path.length > 1 && path.endsWith("/")) {
    path = path.replace(/\/+$/, "");
  }

  return path === "" ? "/" : path;
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    notifyRouteListeners();
  });

  document.addEventListener("click", (event: MouseEvent) => {
    const anchor = (event.target as HTMLElement | null)?.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (
      !href ||
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      (href.startsWith("#") && href.length > 1) ||
      anchor.target === "_blank"
    ) {
      return;
    }

    event.preventDefault();
    navigate(href);
  });
}

export interface PageProps {
  path: string;
  component: RouteComponent;
}

/**
 * Route declaration. Consumed by `<Pages>` at mount time.
 */
export function Page(props: PageProps): Record<string, unknown> {
  return {
    type: "PAGE_CONFIG",
    path: props.path,
    component: props.component,
  };
}

export interface PagesProps {
  children?: unknown | unknown[];
}

/**
 * Viewport container that swaps its mounted component when the browser
 * location changes.
 */
export function Pages(props: PagesProps): HTMLElement {
  const container = document.createElement("div");
  container.className = "levelo-viewport-wrapper";

  const children =
    props.children === undefined
      ? []
      : Array.isArray(props.children)
        ? props.children
        : [props.children];

  for (const child of children) {
    if (
      child &&
      typeof child === "object" &&
      (child as { type?: unknown }).type === "PAGE_CONFIG"
    ) {
      const page = child as unknown as PageProps;
      routes.set(normalizePath(page.path), page.component);
    }
  }

  const renderActiveRoute = (currentPath: string): void => {
    // The Pages element may have been detached from the DOM by a parent
    // unmount. In that case, stop listening rather than leak.
    if (!container.isConnected) {
      routeListeners.delete(renderActiveRoute);
      return;
    }

    const normalized = normalizePath(currentPath);
    const Component = routes.get(normalized);

    unmount(container);

    if (Component) {
      render(Component, container);
    } else {
      render(getClean404Component(h), container);
    }

    window.scrollTo(0, 0);
    applyHeadUpdates();
  };

  routeListeners.add(renderActiveRoute);

  // Render once synchronously so the initial route is visible immediately.
  renderActiveRoute(window.location.pathname);

  return container;
}