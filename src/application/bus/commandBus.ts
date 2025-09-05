export interface Command {}

export interface CommandHandler<C extends Command, R = unknown> {
  execute(command: C): Promise<R>
}

export class CommandBus {
  private handlers = new Map<Function, CommandHandler<any, any>>()

  register<C extends Command>(type: new (...args: any[]) => C, handler: CommandHandler<C>): void {
    this.handlers.set(type, handler)
  }

  async execute<C extends Command, R = unknown>(command: C): Promise<R> {
    const handler = this.handlers.get(command.constructor as Function) as CommandHandler<C, R> | undefined
    if (!handler) {
      throw new Error(`No handler for command: ${command.constructor.name}`)
    }
    return handler.execute(command)
  }
}
