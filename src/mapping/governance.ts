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

import { Proposal, Vote, Executor } from '../generated/schema';
import { IExecutor } from '../generated/AaveGovernanceV2/IExecutor'
import {
  ProposalCreated,
  VoteEmitted,
  ProposalQueued,
  ProposalExecuted,
  ProposalCanceled,
  ExecutorAuthorized,
  ExecutorUnauthorized,
  GovernanceStrategyChanged
} from '../generated/AaveGovernanceV2/AaveGovernanceV2';
import {
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
  proposal.executor = event.params.executor.toHexString();
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
  proposal.createdTimestamp = event.block.timestamp.toI32();
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

export function handleExecutorAuthorized(event: ExecutorAuthorized): void {
  let executor = Executor.load(event.params.executor.toHexString());
  if (executor) {
    executor.authorized = true;
  } else {
    executor = new Executor(event.params.executor.toHexString());
    let executorContract =  IExecutor.bind(event.params.executor);
    executor.authorized = true;
    executor.propositionThreshold = executorContract.PROPOSITION_THRESHOLD();
    executor.votingDuration = executorContract.VOTING_DURATION();
    executor.voteDifferential = executorContract.VOTE_DIFFERENTIAL();
    executor.gracePeriod = executorContract.GRACE_PERIOD();
    executor.minimumQuorum = executorContract.MINIMUM_QUORUM();
    executor.executionDelay = executorContract.getDelay();
    executor.admin = executorContract.getAdmin();
    executor.pendingAdmin = executorContract.getPendingAdmin();
    executor.authorizationBlock = event.block.number;
    executor.authorizationTimestamp = event.block.timestamp;
  }
  executor.save();
}
export function handleExecutorUnauthorized(event: ExecutorUnauthorized): void {
  let executor = Executor.load(event.params.executor.toHexString());
  if (executor) {
    executor.authorized = false;
    executor.save();
  } 
}
// export function handleGovernanceStrategyChanged(event: GovernanceStrategyChanged): void {
  
// }
