import type { Command, CommandHandler } from '../bus/commandBus'
import { ProposalRepository } from '../repositories/proposalRepository'

export class DecideProposalCommand implements Command {
  constructor(
    public readonly id: string,
    public readonly decision: 'accept' | 'reject',
    public readonly comment?: string
  ) {}
}

export class DecideProposalHandler implements CommandHandler<DecideProposalCommand, { ok: boolean }> {
  constructor(private readonly repo = new ProposalRepository()) {}

  async execute(command: DecideProposalCommand): Promise<{ ok: boolean }> {
    const { id, decision, comment } = command
    const prop = await this.repo.findById(id)
    if (!prop) throw new Error('Proposal not found')

    await this.repo.recordDecision(id, decision, comment)
    const status = decision === 'accept' ? 'accepted' : 'rejected'
    await this.repo.updateStatus(id, status)
    return { ok: true }
  }
}
