import { Bytes } from '@graphprotocol/graph-ts';
import {
  Proposal
} from '../../generated/schema';
import {
  zeroAddress,
  zeroBI,
} from '../utils/converters';
import { NA } from '../utils/constants';

export function getOrInitProposal(proposalId: string): Proposal {
  let proposal = Proposal.load(proposalId);

  if (!proposal) {
    proposal = new Proposal(proposalId);
    proposal.title = NA;
    proposal.shortDescription = NA;
    proposal.creator = Bytes.fromI32(0) as Bytes;
    proposal.executor = NA;
    proposal.targets = [Bytes.fromI32(0) as Bytes];
    proposal.values = [zeroBI()];
    proposal.signatures = [NA];
    proposal.calldatas = [Bytes.fromI32(0) as Bytes];
    proposal.withDelegatecalls = [false];
    proposal.startBlock = zeroBI();
    proposal.endBlock = zeroBI();
    proposal.governanceStrategy = Bytes.fromI32(0) as Bytes;
    proposal.currentNoVote = zeroBI();
    proposal.currentYesVote = zeroBI();
    proposal.winner = NA;
    proposal.createdTimestamp = zeroBI().toI32();
    proposal.lastUpdateBlock = zeroBI();
    proposal.lastUpdateTimestamp = zeroBI().toI32();
    proposal.ipfsHash = NA;
    proposal.govContract = zeroAddress();
    proposal.totalPropositionSupply = zeroBI();
    proposal.totalVotingSupply = zeroBI();
    proposal.createdBlockNumber = zeroBI();
    proposal.totalCurrentVoters = 0;
    proposal.author = NA;
    proposal.discussions = NA;
    proposal.aipNumber = NA;
  }

  return proposal as Proposal;
}
