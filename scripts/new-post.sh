#!/bin/bash
# Make a new draft post: scripts/new-post.sh "My title"
set -e
cd "$(dirname "$0")/.."
TITLE="$1"; [ -z "$TITLE" ] && { echo 'usage: scripts/new-post.sh "Title"'; exit 2; }
DATE=$(date +%F)
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g; s/^-//; s/-$//')
FILE="posts/$DATE-$SLUG.md"
[ -e "$FILE" ] && { echo "$FILE exists"; exit 1; }
cat > "$FILE" <<POST
---
title: $TITLE
date: $DATE
summary: One line for the home page.
tags:
draft: true
---

Start here.
POST
echo "$FILE"
