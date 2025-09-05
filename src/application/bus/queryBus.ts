export interface Query {}

export interface QueryHandler<Q extends Query, R = unknown> {
  execute(query: Q): Promise<R>
}

export class QueryBus {
  private handlers = new Map<Function, QueryHandler<any, any>>()

  register<Q extends Query>(type: new (...args: any[]) => Q, handler: QueryHandler<Q>): void {
    this.handlers.set(type, handler)
  }

  async execute<Q extends Query, R = unknown>(query: Q): Promise<R> {
    const handler = this.handlers.get(query.constructor as Function) as QueryHandler<Q, R> | undefined
    if (!handler) {
      throw new Error(`No handler for query: ${query.constructor.name}`)
    }
    return handler.execute(query)
  }
}
