/* service-local.ts — the localStorage metadata store (the statically-deployed
   mode: no backend, everything under ONE key). Bytes never land here — only the
   catalog, each file's steps, and saved views. Seeds the dossier project on
   first run so the demo opens onto real (messy) data. */
import type { CleanerStore, ProjectMeta, FileMeta, ViewMeta } from "./store.ts";

const KEY = "cleaner-store-v1";

interface Bag {
  projects: ProjectMeta[];
  files: (FileMeta & { projectId: string })[];
  views: ViewMeta[];
}

const rid = (prefix: string): string =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

function seed(): Bag {
  const project: ProjectMeta = {
    id: rid("CLP"),
    name: "dossier",
    status: "cleaning",
    description: "The Fleury case extract — 101k wrapped rows, Windows-1252, sentinels.",
  };
  const file: FileMeta = {
    id: rid("CLF"),
    projectId: project.id,
    filename: "dossier.csv",
    sourceUrl: "data/dossier.csv",
    sizeBytes: 14_118_431,
    steps: [],
  };
  return { projects: [project], files: [file], views: [] };
}

export class LocalStore implements CleanerStore {
  readonly mode = "local" as const;
  private bag: Bag;

  constructor() {
    let bag: Bag | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) bag = JSON.parse(raw) as Bag;
    } catch {
      /* corrupted / private mode — reseed */
    }
    this.bag = bag && Array.isArray(bag.projects) && bag.projects.length ? bag : seed();
    this.save();
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.bag));
    } catch {
      /* quota — the session still works, persistence degrades */
    }
  }

  async listProjects(): Promise<ProjectMeta[]> {
    return [...this.bag.projects];
  }
  async createProject(name: string, description?: string): Promise<ProjectMeta> {
    const p: ProjectMeta = { id: rid("CLP"), name, status: "ready", ...(description ? { description } : {}) };
    this.bag.projects.push(p);
    this.save();
    return p;
  }
  async deleteProject(id: string): Promise<void> {
    this.bag.projects = this.bag.projects.filter((p) => p.id !== id);
    const dead = new Set(this.bag.files.filter((f) => f.projectId === id).map((f) => f.id));
    this.bag.files = this.bag.files.filter((f) => f.projectId !== id);
    this.bag.views = this.bag.views.filter((v) => !dead.has(v.fileId));
    this.save();
  }

  async listFiles(projectId: string): Promise<FileMeta[]> {
    return this.bag.files.filter((f) => f.projectId === projectId).map((f) => ({ ...f }));
  }
  async createFile(meta: Omit<FileMeta, "id">): Promise<FileMeta> {
    const f: FileMeta = { ...meta, id: rid("CLF") };
    this.bag.files.push(f);
    this.save();
    return { ...f };
  }
  async patchFile(id: string, patch: Partial<Omit<FileMeta, "id" | "projectId">>): Promise<void> {
    const f = this.bag.files.find((x) => x.id === id);
    if (!f) throw new Error(`no such file: ${id}`);
    Object.assign(f, patch);
    this.save();
  }
  async deleteFile(id: string): Promise<void> {
    this.bag.files = this.bag.files.filter((f) => f.id !== id);
    this.bag.views = this.bag.views.filter((v) => v.fileId !== id);
    this.save();
  }

  async listViews(fileId: string): Promise<ViewMeta[]> {
    return this.bag.views.filter((v) => v.fileId === fileId).map((v) => ({ ...v }));
  }
  async createView(v: Omit<ViewMeta, "id">): Promise<ViewMeta> {
    const view: ViewMeta = { ...v, id: rid("CLV") };
    this.bag.views.push(view);
    this.save();
    return { ...view };
  }
  async deleteView(id: string): Promise<void> {
    this.bag.views = this.bag.views.filter((v) => v.id !== id);
    this.save();
  }
}
