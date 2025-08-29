# Plugin Authoring

Plugins extend Agents Sandbox with new behaviors or UI components.

## Scaffolding

Generate a boilerplate plugin:

```bash
npm run scaffold:plugin
```

This creates a new folder under `plugins/` with sample code and tests.

## Lifecycle

Plugins export initialization and teardown hooks. They may also expose API routes or React components.

## Best Practices

- Keep plugins self-contained.
- Prefer TypeScript for type safety.
- Document any required environment variables in the plugin's README.
