# portfolio-landing

![deploy](https://github.com/doumouya/portfolio-landing/actions/workflows/deploy.yml/badge.svg)

The front door to four open-source, privacy-by-design projects. Each runs entirely in your browser,
and the whole set runs **offline** — there is no backend to any of the demos.

- **Live:** https://doumouya.github.io/portfolio-landing
- **Offline:** *Code → Download ZIP*, unzip, open `index.html`, and click any **Try it**. Every demo
  is a single self-contained file with its Rust→WebAssembly engine embedded — your data never leaves
  the page.

## The projects

| Project | What it is |
|---|---|
| [advanced-datatable](https://github.com/doumouya/advanced-datatable) | a client-side CSV data table (sort/filter/export) |
| [echarts-dashboard](https://github.com/doumouya/echarts-dashboard) | a client-side analytics dashboard (group/aggregate → ECharts) |
| [rbac-explorer](https://github.com/doumouya/rbac-explorer) | an interactive scoped-ownership access-control visualization |
| [build-engine](https://github.com/doumouya/build-engine-demo) | a self-hosting build system the demos are built through |

## What's in this repo

```
index.html              # the built landing (styled with web-kit's design tokens)
apps/<name>/index.html  # each project's self-contained offline demo, copied from its repo
src/                    # the landing source (TypeScript + CSS)
tools/build.sh          # assembles index.html + refreshes the app demos
```

## Build

`index.html` and `apps/` are committed pre-built (so the repo is the deployable, downloadable site).
To regenerate them you need the sibling repos checked out alongside (`../web-kit`, `../advanced-datatable`,
…):

```sh
npm install
npm run build      # bundle the landing + inline web-kit tokens + copy in each app demo
npm run typecheck  # strict tsc
```
