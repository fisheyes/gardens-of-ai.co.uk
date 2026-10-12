# Gardens of AI

## Overview
Personal blog. Static site: Markdown posts, a small build script with no dependencies, plain CSS.
Hosting will be S3 + CloudFront later. For now nginx serves a local preview.

## Service Details
- Preview: http://<nas>:8180 (container `gardens-of-ai`, nginx:alpine, serves `./dist` read-only)
- Build: `node build.mjs` (Node 20+). Add `--drafts` to include posts with `draft: true`.

## Directory Structure
- **Source**: `<nas>/docker/gardens-of-ai/`
  - `posts/` one Markdown file per post, `YYYY-MM-DD-slug.md`
  - `pages/` standalone pages (about.md becomes /about/), same format, no date
  - `templates/` layout, home, card (home page list item), bloom (post on the tree), post
  - `assets/` style.css, sprout.svg (logo and favicon)
  - `site.json` title, tagline, home page intro
  - `tree.mjs` the home page tree: one limb per post, the post is a bloom on its tip (newest on top).
    Seeded from the post slugs, so the shape only changes when posts change. Min 7 limbs.
  - `dist/` build output (do not edit, it is deleted on each build)
- **Backups**: `<nas>/backups/gardens-of-ai/` (or set `BACKUP_TARGET`)

## Writing a post
    scripts/new-post.sh "My title"     # makes posts/<date>-my-title.md as a draft
    node build.mjs --drafts            # build with drafts, check on :8180
    # set draft: false when ready, then: node build.mjs

Markdown supported: `##`-`####` headings, paragraphs, **bold**, *italic*, `code`, links, images,
lists, tables, `>` quotes, fenced code, `---` section break, and callouts:

    ::: note Title          (or ::: clay Title for the terracotta colour)
    Text.
    :::

## Writing style
Simplified Technical English (ASD-STE100), but human: first person, short sentences
(up to 20 words for instructions, 25 for description), active voice, one idea per sentence,
simple common words, no filler. Only write what really happened (check the logs/data).

## Usage
    docker compose up -d     # preview server
    node build.mjs           # rebuild; nginx picks it up at once

## Maintenance
- Backup: `sudo scripts/backup.sh` (tar of the source, keeps the last 30)
