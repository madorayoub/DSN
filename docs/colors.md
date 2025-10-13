# Color System

The site uses semantic tokens defined in `docs/tokens.css` as the single source of truth for color.

## Brand scale
- `--brand-50` → `--brand-900`: Greens derived from the logo for backgrounds, accents, and emphasis.
- `--brand-500` / `--brand-600`: Primary action colors.
- `--brand-550`: Decorative gradient stop only.

## Neutrals & roles
- `--surface-*`: Layer backgrounds (`--surface-50` for sections, `--surface-0` for cards).
- `--text-900`, `--text-700`, `--text-600`: Heading, body, and muted text respectively.
- `--border-300`, `--border-350`: Default and stronger divider colors.
- `--color-background`, `--color-surface`, `--color-text`, `--color-muted`, `--color-subtle`: Semantic aliases consumed throughout layout.
- `--color-on-accent`: Foreground on brand surfaces.

## Warning palette
- `--warning-500`, `--warning-600`: Reserved for true warning or attention states (e.g., alert badges). Avoid using these for primary accents.
- `--gradient-warning-soft`: Soft background for warning contexts.

## Usage guidelines
- Prefer semantic tokens (`--color-accent`, `--color-text`, etc.) instead of raw scale values when styling components.
- Gradients should reference variables such as `--gradient-brand-soft` / `--gradient-brand-strong`.
- Decorative badges and icons use CSS custom properties so themes can be swapped without editing SVG markup.
- Dark surfaces should use `--ink-inverse` derived mixes for shadows and overlays.

To add a new role, define it in `docs/tokens.css`, document intended usage here, and consume the alias in component styles instead of hard-coding a scale value.
