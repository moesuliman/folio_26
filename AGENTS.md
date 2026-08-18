## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Cursor Cloud specific instructions

This is a static Astro site (`output: 'static'`). Node 22+ and pnpm are required; dependencies install with `pnpm install` (the VM update script runs this on startup).

- Run the dev server with `pnpm dev --host` (serves on `http://localhost:4321/`). The `astro dev --background`/`stop`/`status`/`logs` commands mentioned in the Development section above are not real Astro CLI options — to background the server, run it inside a tmux session instead.
- Build/validate with `pnpm build`; this is the only check CI runs (`.github/workflows/deploy.yml`). A successful build is the primary correctness signal.
- There is no automated test suite and no lint script. `astro check` is not usable out of the box because `@astrojs/check` is not a declared dependency; don't add it just to lint.
- Content is file-based: add projects under `src/content/projects/<category>/<slug>/index.mdx` and blog posts under `src/content/blog/<slug>/index.mdx` (see `src/content.config.ts` for schemas). The dev server hot-reloads new/edited content without a restart.
- The homepage ListenBrainz "now playing" line is fetched at build time from `LISTENBRAINZ_USERNAME`; if unset it falls back to a static label, so builds work without it.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
