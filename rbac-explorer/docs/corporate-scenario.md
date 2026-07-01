# RBAC Explorer — the corporate scenario

*The realistic scenario the explorer should teach: scoped membership by role, a role hierarchy
(CEO > Manager > Member) with a guardrailed Admin, and field-level permissions with caps on a concrete
record. This fixes the current demo's unrealistic "a Sales member reaches both EU and US regions."*

---

## 1. The org (scope tree)

The resolver is already correct — a membership reaches its node **and everything beneath it**. The scenario
just seeds people realistically.

```
acme  (Acme Corp — root)
├── eng    (Engineering)
│   ├── apollo   (Platform squad)
│   └── zephyr   (Apps squad)
└── sales  (Sales)
    ├── eu   (EU region)
    └── us   (US region)
```

## 2. Roles = where you're seeded (+ what you may do)

| Role | Seeded at | Reaches | Notes |
|---|---|---|---|
| **CEO** (Dana Okoye) | `acme` (root) | everything | upper management; the only unrestricted *reach* |
| **Eng Manager** (Priya Patel) | `eng` | eng · apollo · zephyr | the whole department, both squads |
| **Sales Manager** (Marcus Bell) | `sales` | sales · eu · us | the whole department, both regions |
| **Member — EU** (Amina Traoré) | `sales/eu` | **eu only** | *fixes the bug:* today she'd reach `us` too |
| **Member — US** (Tom Byrne) | `sales/us` | **us only** | can't see EU's projects |
| **Admin** (Ada, IT) | — (operational) | org-wide **but guardrailed** | manages nodes/memberships; **not** a data superuser |

**The three things the demo teaches**

1. **Scoped membership** — Member = one sub-department; Manager = the department; CEO = everything.
   (No more "a Sales member sees both regions.")
2. **Admin ≠ superuser** — Admin can operate across the org, but hits **guardrails**: can't delete the CEO
   (a locked *action*), can't self-escalate, and **can't read capped fields** (SSN/PII).
3. **Field-level permission (caps)** — on a concrete record, some fields are ceilinged even for high roles;
   scope gates the *row*, caps gate the *columns*.

## 3. Field-permission layer (the `perm-cell` matrix)

Two demo records. `rw` = read+write, `r` = read-only, `🔒` = locked (out of scope OR a hard cap).
Scope decides whether the record is visible at all; the caps below apply *within* that scope.

### Sales data project — "Q3 EU Pipeline"  (scoped under `sales/eu`)

| Field | CEO | Sales Mgr | Member EU | Member US | Admin |
|---|---|---|---|---|---|
| Project name | rw | rw | r | 🔒 out of scope | rw |
| Owner | rw | rw | r | 🔒 | rw |
| Forecast € | rw | rw | r | 🔒 | **r** (guardrail: reads, can't edit financials) |
| Customer email (PII) | rw | r | r | 🔒 | **🔒 cap** |
| Rep SSN | **r** (exec/HR only) | 🔒 | 🔒 | 🔒 | **🔒 cap — even Admin** |

*Note the US Member column is entirely `🔒`: the record lives under `sales/eu`, so scoped reach denies it
before field caps even apply.*

### Engineering case — "Incident #4412"  (scoped under `eng/apollo`)

| Field | CEO | Eng Mgr | Apollo Member | Zephyr Member | Admin |
|---|---|---|---|---|---|
| Title / summary | rw | rw | rw | 🔒 out of scope | rw |
| Severity | rw | rw | rw | 🔒 | rw |
| Root cause | rw | rw | rw | 🔒 | r |
| Assignee | rw | rw | r | 🔒 | rw |
| Customer data (PII) | rw | r | 🔒 | 🔒 | **🔒 cap** |

### Guardrail actions (Admin is powerful but bounded)

| Action | CEO | Manager | Member | Admin |
|---|---|---|---|---|
| Delete a node / member | ✔ (own scope) | ✔ (own scope) | ✖ | ✔ **except protected principals** |
| **Delete the CEO** | — | ✖ | ✖ | **🔒 guardrail** |
| Read SSN / restricted PII | ✔ (exec) | ✖ | ✖ | **🔒 cap** |
| Change roles | ✔ | within dept | ✖ | ✔ **but not self-escalate / not above CEO** |

## 4. How it plays in the explorer (UX)

1. **Pick a person/role** → the tree highlights their reachable scope: Member lights one leaf, Manager a
   subtree, CEO the whole tree, Admin the whole tree **with lock badges** on guarded nodes.
2. **Pick a record** (Sales project or Eng case) → a field matrix renders that role's cap per field using
   `perm-cell` (rw / r / 🔒). Out-of-scope records show a single "no access — out of scope" state.
3. **Try a guardrail** → e.g. Admin → *Delete CEO* is blocked with the reason ("protected principal"),
   and SSN shows the lock glyph + "capped for this role."

## 5. Implementation notes

- **`crates/core`** — keep `Graph::reachable` (correct). Add:
  - a `Role` → seed mapping (Member=leaf, Manager=dept, CEO=root) so the demo seeds realistically;
  - a small **field-permission** model: `cap(role, field) -> None|R|RW`, with protected fields (SSN/PII)
    ceilinged below the role's node-reach, and a `guarded_action(role, action, target)` for the CEO-delete
    / self-escalate guardrails. Pure + tested, same as the reach rule.
- **`crates/wasm`** — expose `roles()`, `reach(role)`, `field_caps(role, record)`, `can(role, action, target)`.
- **`web/app.ts`** — add a role/person picker + a record picker + the `perm-cell` field matrix, and the
  guardrail feedback. The tree-highlight stays; the matrix is the new panel.

*Anchor for the honest framing: this stays a small, single-file offline demo — the value is the model
(scope-descends reach + role-based seeding + field caps + guardrails), not scale.*
