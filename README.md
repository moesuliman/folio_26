# folio_26

Personal portfolio and blog for Moe Suliman. Built with Astro, MDX content collections, and plain CSS.

## Setup

Requires Node 22+.

```bash
pnpm install
pnpm dev
```

```bash
pnpm build
pnpm preview
```

## Add a project

1. Create a folder: `src/content/projects/[category]/[slug]/`
2. Add `index.mdx` with frontmatter (`title`, `category`, `year`, `cover`, `summary`, etc.)
3. Put images in `images/`

Categories: `product`, `brand`, `art`.

If the MDX body is empty, the project page auto-renders cover, summary, and an image grid of the folder. For custom layouts, compose `ImageGrid`, `VideoBlock`, `TextBlock`, `TwoCol`, and `FullBleed` in the MDX body.

Homepage featured work is controlled with `featured` and `order` in frontmatter.

## Add a blog post

Create `src/content/blog/[slug]/index.mdx` with `title`, `date`, and `summary`.

## Deploy

Static output only for now (`pnpm build` → `dist/`). Hosting and subdomain wiring come later.
