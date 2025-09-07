# Arcane UI Package

`@arcane/ui` provides reusable UI primitives and theme tokens for Arcane Dominion apps.

## Installation

The package is available inside this repo. Import components and tokens directly:

```ts
import { ActionButton, ResourceIcon, tokens } from '@arcane/ui';
```

## Tailwind Tokens

The Tailwind config at `@arcane/ui/tailwind.config` exports `tokens` with color, typography, spacing and animation definitions. Extend your app's Tailwind config:

```ts
import { tokens } from '@arcane/ui/tailwind.config';

export default {
  theme: { extend: tokens },
};
```

## Components

- `ActionButton` – styled button variants.
- `ResourceIcon` – icon and value display for game resources.
- `CategoryIcon` – icon display for proposal categories.
- `SettingsSearchBar`, `SettingCategory`, `SettingItem` and `createSettingsConfig` for building settings panels.

## Usage

All app imports should reference the package:

```tsx
import { ActionButton, SettingsSearchBar } from '@arcane/ui';
```

This centralizes shared UI elements and keeps apps slim.
