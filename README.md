# Agents Sandbox

Agents Sandbox is a Next.js playground for experimenting with plugin-driven agent interactions. It exposes a modular architecture that allows developers to build, test, and extend agent capabilities through reusable plugins.

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the development server**
   ```bash
   npm run dev
   ```
   The app runs at [http://localhost:3000](http://localhost:3000).

## Architecture

The application is structured around a plugin system. Core components live under `src/`, while optional capabilities are loaded from the `plugins/` directory. Each plugin can contribute UI elements, backend logic, or both, enabling rapid experimentation without touching the core codebase.

## Plugin Authoring

Plugins reside in the `plugins/` folder and are loaded at runtime. Scaffold a new plugin with:

```bash
npm run scaffold:plugin
```

Refer to [docs/plugin-authoring.md](docs/plugin-authoring.md) for a complete guide.

## API Usage

Agents Sandbox exposes a lightweight API layer for interacting with plugins and core services. See [docs/api-usage.md](docs/api-usage.md) for request examples and integration tips.

### Marketplace

The agent marketplace supports server-side search and category filtering via `q` and `category` query parameters. Agents can also be rated, and each rating updates the agent's average score.

## Persistence Layers

The project ships with an in-memory store for rapid prototyping. Additional persistence strategies can be added by implementing the persistence interface described in [docs/persistence-layers.md](docs/persistence-layers.md).

## Developer Guidelines

- **Coding style:** follow the existing ESLint configuration and prefer modern TypeScript features.
- **Testing:** run `npm test` (when available) and `npm run lint` before committing.
- **Documentation:** update both the README and `docs/` directory whenever behavior or APIs change.

For extended guidelines, consult [docs/developer-guidelines.md](docs/developer-guidelines.md).

