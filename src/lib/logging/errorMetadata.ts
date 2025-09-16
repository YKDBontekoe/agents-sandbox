const MAX_STACK_LINES = 6

function sanitizeStack(stack?: string | null) {
  if (!stack) return undefined
  const lines = stack.split('\n').slice(0, MAX_STACK_LINES)
  return lines.join('\n')
}

export function createErrorMetadata(error: unknown) {
  if (error instanceof Error) {
    const sanitizedStack = sanitizeStack(error.stack)
    return {
      name: error.name,
      message: error.message,
      ...(sanitizedStack ? { stack: sanitizedStack } : {}),
    }
  }

  if (typeof error === 'string') {
    return { message: error }
  }

  if (typeof error === 'number' || typeof error === 'boolean') {
    return { message: String(error) }
  }

  try {
    return { message: JSON.stringify(error) }
  } catch {
    return { message: '[unserializable error]' }
  }
}
