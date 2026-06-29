/**
 * web-kit — a dependency-free TypeScript front-end kit.
 *
 * Link `src/tokens.css` once for the design tokens + responsive layer, then build
 * UI from these typed component factories. No framework, no runtime: each factory
 * returns a real DOM node and injects its own CSS on first use.
 */

export * from "./el";
export * from "./responsive";

// Forms
export * from "./components/button";
export * from "./components/iconButton";
export * from "./components/input";
export * from "./components/select";
export * from "./components/checkbox";

// Display
export * from "./components/badge";
export * from "./components/kindLabel";
export * from "./components/card";
export * from "./components/toolbar";
export * from "./components/emptyState";
export * from "./components/code";
export * from "./components/avatar";
export * from "./components/icon";
export * from "./components/stat";

// Navigation
export * from "./components/tabs";

// Feedback
export * from "./components/dialog";
export * from "./components/toast";
export * from "./components/tooltip";

// Charts
export * from "./components/chart";
