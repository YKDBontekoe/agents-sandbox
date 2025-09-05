import type { Query, QueryHandler } from '../bus/queryBus'
import { GameStateRepository } from '../repositories/gameStateRepository'

export class GetLatestStateQuery implements Query {}

export class GetLatestStateHandler implements QueryHandler<GetLatestStateQuery, any> {
  constructor(private readonly repo = new GameStateRepository()) {}

  async execute(): Promise<any> {
    let state = await this.repo.getLatest()
    if (!state) {
      state = await this.repo.create()
      return state
    }
    if (!state.skill_tree_seed) {
      const patched = await this.repo.patchSkillTreeSeed(state.id)
      return patched || state
    }
    return state
  }
}
