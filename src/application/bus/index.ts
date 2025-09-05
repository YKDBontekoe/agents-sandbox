import { CommandBus } from './commandBus'
import { QueryBus } from './queryBus'
import { RunTickCommand, RunTickHandler } from '../commands/runTick'
import { DecideProposalCommand, DecideProposalHandler } from '../commands/decideProposal'
import { GetLatestStateQuery, GetLatestStateHandler } from '../queries/getLatestState'

export const commandBus = new CommandBus()
commandBus.register(RunTickCommand, new RunTickHandler())
commandBus.register(DecideProposalCommand, new DecideProposalHandler())

export const queryBus = new QueryBus()
queryBus.register(GetLatestStateQuery, new GetLatestStateHandler())
