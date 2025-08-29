# Accessibility Guidelines

To ensure all users can interact with the application, follow these guidelines when contributing:

- **ARIA Labels:** Provide meaningful `aria-label` attributes or visible text for interactive elements. Mark purely decorative icons with `aria-hidden="true"`.
- **Keyboard Navigation:** Ensure all actionable components are reachable via keyboard (`tabIndex={0}`) and respond to <kbd>Enter</kbd> or <kbd>Space</kbd>.
- **Contrast:** Use text and background colors that meet WCAG AA contrast ratios. Prefer darker text (`text-slate-700` or above) on light backgrounds.
- **Responsive Design:** Use Tailwind's responsive utilities (`sm:`, `md:`, `lg:`) to ensure layouts adapt to smaller screens.
- **Automated Tests:** Run `npm test` to execute the axe-based accessibility tests before submitting a PR.
