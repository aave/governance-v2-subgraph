import {
  BigInt,
  ipfs,
  json,
  Bytes,
  log,
  JSONValue,
  JSONValueKind,
  Address,
  ethereum,
} from '@graphprotocol/graph-ts/index';

import { Proposal, Vote } from '../generated/schema';
import {
  ProposalCreated,
  VoteEmitted,
  ProposalQueued,
  ProposalExecuted,
  ProposalCanceled,
} from '../generated/AaveGovernanceV2/AaveGovernanceV2';
import {
  PROPOSAL_STATUS_VOTING,
  PROPOSAL_STATUS_EXECUTED,
  PROPOSAL_STATUS_VALIDATING,
  YES_WINS,
  NO_WINS,
  ABSTAIN_WINS,
  NA,
} from '../utils/constants';
// import { zeroAddress, zeroBI } from '../utils/converters';
import { getOrInitProposal } from '../initializers';

enum VoteType {
  Abstain = 0,
  Yes = 1,
  No = 2,
}


function getProposal(proposalId: string, fn: string): Proposal | null {
  let proposal = Proposal.load(proposalId);
  if (proposal == null) {
    log.error('{}: invalid proposal id {}', [fn, proposalId]);
  }
  return proposal;
}

export function handleProposalCreated(event: ProposalCreated): void {
  let hash = Bytes.fromHexString('1220' + event.params.ipfsHash.toHexString().slice(2)).toBase58();
  let data = ipfs.cat(hash);
  let proposalData = json.try_fromBytes(data as Bytes);
  let title: JSONValue | null = null;
  let shortDescription: JSONValue | null = null;
  if (proposalData.isOk && proposalData.value.kind == JSONValueKind.OBJECT) {
    let data = proposalData.value.toObject();
    title = data.get('title');
    shortDescription = data.get('shortDescription');
  }
  let proposal = getOrInitProposal(event.params.id.toString());
  if (title) {
    proposal.title = title.toString();
  } else {
    proposal.title = NA;
  }

  if (shortDescription) {
    proposal.shortDescription = shortDescription.toString();
  } else {
    proposal.shortDescription = NA;
  }
  proposal.creator = event.params.creator;
  proposal.executor = event.params.executor;
  proposal.targets = event.params.targets as Bytes[];
  proposal.values = event.params.values;
  proposal.signatures = event.params.signatures;
  proposal.calldatas = event.params.calldatas;
  proposal.withDelegatecalls = event.params.withDelegatecalls;
  proposal.startBlock = event.params.startBlock;
  proposal.endBlock = event.params.endBlock;
  proposal.state = 'Pending';
  proposal.governanceStrategy = event.params.strategy;
  proposal.ipfsHash = hash;
  proposal.winner = NA;
  // dont have access to event.block, not sure why
  proposal.lastUpdateBlock = event.block.number;
  proposal.lastUpdateTimestamp = event.block.timestamp.toI32();
  proposal.save();
}

export function handleProposalQueued(event: ProposalQueued): void {
  let proposal = getProposal(event.params.id.toString(), 'ProposalQueued');
  if (proposal) {
    proposal.state = 'Queued';
    proposal.executionTime = event.params.executionTime;
    proposal.initiatorQueueing = event.params.initiatorQueueing;
    proposal.lastUpdateBlock = event.block.number;
    proposal.lastUpdateTimestamp = event.block.timestamp.toI32();
    proposal.save();
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposal = getProposal(event.params.id.toString(), 'ProposalExecuted');
  if (proposal) {
    proposal.state = 'Executed';
    proposal.initiatorExecution = event.params.initiatorExecution;
    proposal.lastUpdateBlock = event.block.number;
    proposal.lastUpdateTimestamp = event.block.timestamp.toI32();
    proposal.save();
  }
}

export function handleProposalCanceled(event: ProposalCanceled): void {
  let proposal = getProposal(event.params.id.toString(), 'ProposalCanceled');
  if (proposal) {
    proposal.state = 'Canceled';
    proposal.lastUpdateBlock = event.block.number;
    proposal.lastUpdateTimestamp = event.block.timestamp.toI32();
    proposal.save();
  }
}

export function handleVoteEmitted(event: VoteEmitted): void {
  let proposal = getProposal(event.params.id.toString(), 'handleVoteEmitted');
  if (proposal) {
    let support = event.params.support;
    let votingPower = event.params.votingPower;
    if (support) {
      proposal.currentYesVote = proposal.currentYesVote.plus(votingPower);
    } else {
      proposal.currentNoVote = proposal.currentNoVote.plus(votingPower);
    }
    proposal.lastUpdateBlock = event.block.number;
    proposal.lastUpdateTimestamp = event.block.timestamp.toI32();
    proposal.state = "Active";
    proposal.save();
  }

  let id = event.params.voter.toHexString() + ':' + event.params.id.toString();
  let vote = Vote.load(id) || new Vote(id);
  vote.proposal = event.params.id.toString();
  vote.support = event.params.support;
  vote.voter = event.params.voter;
  vote.votingPower = event.params.votingPower;
  vote.timestamp = event.block.timestamp.toI32();
  vote.save();
}
