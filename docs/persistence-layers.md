# Persistence Layers

Agents Sandbox defaults to an in-memory store suited for development.

## Extending Persistence

Implement the persistence interface to back data with external stores such as databases or cloud storage. Each implementation should export `load` and `save` functions and declare required configuration.

## Built-in File Persistence

The project includes a simple file-based persistence layer. Agent sessions are serialized as JSON and stored in `data/sessions.json` using the `readSessions` and `writeSessions` helpers. This allows session data to survive process restarts without requiring an external database.

## Migration Strategy

When introducing new persistence layers, provide migration scripts to move data from the in-memory store.
