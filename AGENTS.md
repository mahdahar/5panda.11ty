# AGENTS.md

Guidelines for AI coding agents working on the 5panda.11ty project.

## Project Overview

An Eleventy (11ty) static site with Tailwind CSS v4 for portfolio, blog, and documentation.

## Build Commands

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Build CSS only
npm run build:css

# Build 11ty only (incremental)
npm run build:11ty
```

## Tech Stack

- **Static Generator**: Eleventy (11ty) v3
- **Styling**: Tailwind CSS v4 with PostCSS
- **Templates**: Nunjucks (.njk)
- **Content**: Markdown (.md)
- **Output**: `_site/` directory

## Project Structure

```
src/
├── _layouts/          # Nunjucks layout templates
│   ├── base.njk       # Main layout with nav, footer, theme toggle
│   ├── post.njk       # Blog post layout
│   └── clqms-post.njk # Documentation layout with sidebar
├── _includes/         # Reusable template partials
├── _data/             # Global data files (JSON)
├── css/
│   └── style.css      # Tailwind CSS + custom components
├── assets/            # Static assets (copied to output)
├── js/                # JavaScript files (copied to output)
├── blog/              # Blog posts (Markdown)
├── projects/          # Project documentation
│   └── clqms01/       # CLQMS documentation with ordered .md files
└── *.njk              # Root-level pages
```

## Code Style Guidelines

### Nunjucks Templates

- Use 2-space indentation
- Wrap long lines at ~100 characters
- Use lowercase for HTML attributes
- Use double quotes for attribute values
- Prefer `{% raw %}{{ variable | filter }}{% endraw %}` over complex logic in templates

```nunjucks
<!-- Good -->
<a href="{{ post.url }}" class="post-card group">
  <h3 class="text-xl font-bold">{{ post.data.title }}</h3>
</a>

<!-- Bad - overly complex inline -->
<a href="{{ post.url }}" class="{% if condition %}class-a{% else %}class-b{% endif %}">
```

### Markdown Files

- Use YAML frontmatter with consistent ordering: `layout`, `tags`, `title`, `description`, `date`, `order`
- Prefix ordered documentation files with numbers (e.g., `001-architecture.md`)
- Use `order` field for explicit sorting in collections
- Keep lines under 100 characters where practical

```yaml
---
layout: clqms-post.njk
tags: clqms
title: "CLQMS: Architecture"
description: "Overview of the architecture"
date: 2025-12-01
order: 1
---
```

### CSS/Tailwind

- Use Tailwind v4 `@import "tailwindcss"` syntax
- Define custom theme variables in `@theme` block
- Use CSS custom properties for theme colors
- Organize custom components in `@layer components`
- Prefer `oklch()` color format for consistency
- Group related styles with clear section comments

```css
@layer components {
  .custom-card {
    background-color: var(--color-base-200);
    border-radius: var(--radius-box);
  }
}
```

### JavaScript (11ty Config)

- Use CommonJS (`module.exports`) in config files
- Prefer `const` and `let` over `var`
- Use arrow functions for callbacks
- Add filters and shortcodes in logical groups with comments

```javascript
// Add date filter
eleventyConfig.addFilter("dateFormat", (date, format = "full") => {
  const d = new Date(date);
  // ...
});
```

## Collection Naming

- `posts` - Blog posts sorted by date (descending)
- `clqms` - CLQMS documentation sorted by `order` field
- `projects` - Combined blog posts and CLQMS documentation

## Theme System

- Dark mode is default (`data-theme="dark"`)
- Light mode available via `data-theme="light"`
- CSS custom properties update automatically
- JavaScript theme toggle saves preference to localStorage

## URL Structure

- Files use `.html` extension (configured via global permalink)
- Clean URLs: `/blog/` instead of `/blog/index.html`
- Nested folders auto-generate index pages