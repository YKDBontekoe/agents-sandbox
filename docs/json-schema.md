# Import/Export JSON Schemas

This project supports exchanging agent and workflow definitions using JSON files.

## Agents

Agent files should contain an object with an `agents` array. Each agent entry uses the following structure:

```json
{
  "agents": [
    {
      "name": "My Agent",
      "type": "chat",
      "description": "What the agent does",
      "systemPrompt": "You are helpful",
      "modelConfig": {
        "provider": "openai",
        "apiKey": "sk-...",
        "model": "gpt-4o",
        "baseUrl": "https://api.openai.com",
        "apiVersion": "v1"
      },
      "temperature": 0.7,
      "maxTokens": 1024,
      "voiceSettings": {
        "voice": "alloy",
        "speed": 1,
        "pitch": 0
      }
    }
  ]
}
```

Identifiers and timestamps are generated on import and therefore omitted from the schema.

## Workflows

Workflow files describe a single workflow template:

```json
{
  "name": "Sample Workflow",
  "nodes": [
    {
      "id": "node-1",
      "type": "task",
      "label": "First task",
      "data": {},
      "position": { "x": 0, "y": 0 }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "condition": "optional"
    }
  ]
}
```

Each node `type` must be one of `task`, `condition`, `loop`, or `parallel`.
