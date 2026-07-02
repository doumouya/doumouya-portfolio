/* service-birama.ts — the birama-engine metadata store (the full-stack mode).
   Projects/files/views are REGISTERED TYPES (cleaner_project/CLP ·
   cleaner_file/CLF · cleaner_view/CLV — seeded by tools/seed-birama.sh) served
   by the generic objects API. Every mutation runs the engine's validation +
   two-plane RBAC, and lands an `events` audit row server-side.

   Concurrency: the API requires If-Match on PATCH/DELETE (428 otherwise), so
   this store caches each entity's etag from every read and, on a 412 race,
   refetches once and retries. Auth: the session cookie; on 401 it tries the
   debug-only dev-login bootstrap (local full-stack runs a debug build). */
import type { CleanerStore, ProjectMeta, FileMeta, ViewMeta } from "./store.ts";

interface Entity {
  id: string;
  type: string;
  data: Record<string, unknown>;
  version: number;
  etag: string;
}

const s = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const n = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

export class BiramaStore implements CleanerStore {
  readonly mode = "birama" as const;
  private etags = new Map<string, string>();

  private constructor(private base: string) {}

  /** Probe the objects surface (registering auth on the way); null = not usable
      (API up but the cleaner types aren't registered → the caller falls back). */
  static async connect(base: string): Promise<BiramaStore | null> {
    const store = new BiramaStore(base);
    let r = await store.raw("GET", "/api/objects/cleaner_project");
    if (r.status === 401) {
      const login = await store.raw("POST", "/auth/dev-login", {});
      if (!login.ok) return null;
      r = await store.raw("GET", "/api/objects/cleaner_project");
    }
    return r.ok ? store : null; // 404 = types not seeded → run tools/seed-birama.sh
  }

  private raw(method: string, path: string, body?: unknown, etag?: string): Promise<Response> {
    return fetch(this.base + path, {
      method,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(etag ? { "if-match": etag } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  private async json<T>(r: Response): Promise<T> {
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`birama ${r.status}: ${detail.slice(0, 200)}`);
    }
    return (await r.json()) as T;
  }

  private remember(e: Entity): Entity {
    this.etags.set(e.id, e.etag);
    return e;
  }

  private async list(type: string): Promise<Entity[]> {
    const out: Entity[] = [];
    let offset = 0;
    for (;;) {
      const page = await this.json<{ items: Entity[] }>(
        await this.raw("GET", `/api/objects/${type}?limit=200&offset=${offset}`),
      );
      out.push(...page.items.map((e) => this.remember(e)));
      if (page.items.length < 200) return out;
      offset += 200;
    }
  }

  private async create(type: string, data: Record<string, unknown>): Promise<Entity> {
    return this.remember(await this.json<Entity>(await this.raw("POST", `/api/objects/${type}`, data)));
  }

  /** PATCH with the cached etag; one refetch-and-retry on a 412 race. */
  private async patch(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      const r = await this.raw("PATCH", `/api/objects/${type}/${id}`, data, this.etags.get(id) ?? 'W/"0"');
      if (r.ok) {
        this.remember((await r.json()) as Entity);
        return;
      }
      if ((r.status === 412 || r.status === 428) && attempt === 0) {
        this.remember(await this.json<Entity>(await this.raw("GET", `/api/objects/${type}/${id}`)));
        continue;
      }
      throw new Error(`birama patch ${r.status}`);
    }
  }

  private async del(type: string, id: string): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      const r = await this.raw("DELETE", `/api/objects/${type}/${id}`, undefined, this.etags.get(id) ?? 'W/"0"');
      if (r.ok || r.status === 404) return;
      if ((r.status === 412 || r.status === 428) && attempt === 0) {
        this.remember(await this.json<Entity>(await this.raw("GET", `/api/objects/${type}/${id}`)));
        continue;
      }
      throw new Error(`birama delete ${r.status}`);
    }
  }

  // ── projects ──
  async listProjects(): Promise<ProjectMeta[]> {
    return (await this.list("cleaner_project")).map((e) => ({
      id: e.id,
      name: s(e.data["name"]) ?? e.id,
      status: s(e.data["status"]) ?? "ready",
      ...(s(e.data["description"]) ? { description: s(e.data["description"]) as string } : {}),
    }));
  }
  async createProject(name: string, description?: string): Promise<ProjectMeta> {
    const e = await this.create("cleaner_project", { name, status: "ready", ...(description ? { description } : {}) });
    return { id: e.id, name, status: "ready", ...(description ? { description } : {}) };
  }
  deleteProject(id: string): Promise<void> {
    return this.del("cleaner_project", id);
  }

  // ── files ──
  async listFiles(projectId: string): Promise<FileMeta[]> {
    return (await this.list("cleaner_file"))
      .filter((e) => e.data["project_id"] === projectId)
      .map((e) => ({
        id: e.id,
        projectId,
        filename: s(e.data["filename"]) ?? e.id,
        ...(s(e.data["source_url"]) ? { sourceUrl: s(e.data["source_url"]) as string } : {}),
        ...(n(e.data["rows"]) !== undefined ? { rows: n(e.data["rows"]) as number } : {}),
        ...(n(e.data["cols"]) !== undefined ? { cols: n(e.data["cols"]) as number } : {}),
        ...(n(e.data["size_bytes"]) !== undefined ? { sizeBytes: n(e.data["size_bytes"]) as number } : {}),
        ...(n(e.data["score"]) !== undefined ? { score: n(e.data["score"]) as number } : {}),
        steps: Array.isArray(e.data["steps"]) ? (e.data["steps"] as FileMeta["steps"]) : [],
      }));
  }
  async createFile(meta: Omit<FileMeta, "id">): Promise<FileMeta> {
    const e = await this.create("cleaner_file", {
      project_id: meta.projectId,
      filename: meta.filename,
      ...(meta.sourceUrl ? { source_url: meta.sourceUrl } : {}),
      ...(meta.sizeBytes !== undefined ? { size_bytes: meta.sizeBytes } : {}),
      steps: meta.steps,
    });
    return { ...meta, id: e.id };
  }
  patchFile(id: string, patch: Partial<Omit<FileMeta, "id" | "projectId">>): Promise<void> {
    const data: Record<string, unknown> = {};
    if (patch.filename !== undefined) data["filename"] = patch.filename;
    if (patch.rows !== undefined) data["rows"] = patch.rows;
    if (patch.cols !== undefined) data["cols"] = patch.cols;
    if (patch.score !== undefined) data["score"] = patch.score == null ? null : Math.round(patch.score);
    if (patch.steps !== undefined) data["steps"] = patch.steps;
    return this.patch("cleaner_file", id, data);
  }
  deleteFile(id: string): Promise<void> {
    return this.del("cleaner_file", id);
  }

  // ── saved views ──
  async listViews(fileId: string): Promise<ViewMeta[]> {
    return (await this.list("cleaner_view"))
      .filter((e) => e.data["file_id"] === fileId)
      .map((e) => ({
        id: e.id,
        fileId,
        name: s(e.data["name"]) ?? e.id,
        query: (e.data["query"] ?? {}) as ViewMeta["query"],
      }));
  }
  async createView(v: Omit<ViewMeta, "id">): Promise<ViewMeta> {
    const e = await this.create("cleaner_view", { file_id: v.fileId, name: v.name, query: v.query });
    return { ...v, id: e.id };
  }
  deleteView(id: string): Promise<void> {
    return this.del("cleaner_view", id);
  }
}
