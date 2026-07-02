/* store.ts — the METADATA plane seam. One domain interface (projects · files ·
   saved views), two implementations behind a runtime probe:

     service-local.ts   localStorage — the statically-deployed demo (no backend)
     service-birama.ts  the birama-engine objects API — the full-stack mode

   CSV BYTES NEVER ENTER THE STORE (either one): the seed file rides a static
   asset URL (`sourceUrl`); user imports live in session memory only. The store
   holds what survives a reload: the project/file catalog, each file's applied
   STEPS (the non-destructive pipeline), and saved views. */
import type { Step, SortKey } from "./engine.ts";
import { LocalStore } from "./service-local.ts";
import { BiramaStore } from "./service-birama.ts";

export interface ProjectMeta {
  id: string;
  name: string;
  status: string; // ready | cleaning | archived
  description?: string;
}
export interface FileMeta {
  id: string;
  projectId: string;
  filename: string;
  /** static asset the bytes re-fetch from (the seed); absent = session-only import */
  sourceUrl?: string;
  rows?: number;
  cols?: number;
  sizeBytes?: number;
  score?: number | null;
  /** the persisted cleaning pipeline (replayed on open) */
  steps: Step[];
}
export interface ViewQuery {
  filter?: unknown;
  search?: string;
  sort?: SortKey[];
}
export interface ViewMeta {
  id: string;
  fileId: string;
  name: string;
  query: ViewQuery;
}

export interface CleanerStore {
  readonly mode: "local" | "birama";
  listProjects(): Promise<ProjectMeta[]>;
  createProject(name: string, description?: string): Promise<ProjectMeta>;
  deleteProject(id: string): Promise<void>;
  listFiles(projectId: string): Promise<FileMeta[]>;
  createFile(meta: Omit<FileMeta, "id">): Promise<FileMeta>;
  patchFile(id: string, patch: Partial<Omit<FileMeta, "id" | "projectId">>): Promise<void>;
  deleteFile(id: string): Promise<void>;
  listViews(fileId: string): Promise<ViewMeta[]>;
  createView(v: Omit<ViewMeta, "id">): Promise<ViewMeta>;
  deleteView(id: string): Promise<void>;
}

/** The runtime probe: birama-engine when its API answers (and the cleaner types
    are registered), else localStorage. On static hosting `/healthz` rewrites to
    the SPA shell (HTML, not the JSON `status:"ok"`), so the fallback is clean.
    The API base comes from `?api=` → localStorage `cleaner-api` → same-origin
    (the dev proxy). */
export async function connectStore(): Promise<CleanerStore> {
  const base =
    new URLSearchParams(location.search).get("api") ??
    ((): string => {
      try {
        return localStorage.getItem("cleaner-api") ?? "";
      } catch {
        return "";
      }
    })();
  try {
    const r = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(800) });
    if (r.ok) {
      const body = (await r.json()) as { status?: string };
      if (body.status === "ok") {
        const birama = await BiramaStore.connect(base);
        if (birama) return birama;
      }
    }
  } catch {
    /* offline / static hosting — fall through */
  }
  return new LocalStore();
}
