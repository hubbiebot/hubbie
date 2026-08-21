# Hubbie Web UI standards

The application uses Angular Material with a small CSS-token baseline in `src/styles.css`.

- Use `--space-1` through `--space-5` for the 8px spacing scale; do not introduce arbitrary layout gaps.
- Use `--font-sans` for neutral operational typography, and keep page headings at a restrained 600 weight.
- Use `--color-primary` (`#42c506`) only for primary actions and concise operational status. The base surface is `--color-bg` (`#0f0f0f`).
- Use `--radius-control`, `--radius-surface`, and `--elevation-2` for consistent control/surface treatment.
- Keyboard focus must use `--focus-ring`; errors use Material's `mat-error` and must remain adjacent to their field.
- Authentication layouts are two-pane on desktop and form-first single-column at 768px and below. Submit actions follow fields immediately and occupy full width.
