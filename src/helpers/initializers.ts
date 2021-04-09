import { Bytes } from '@graphprotocol/graph-ts';
import {
  Proposal,
  Delegate,
} from '../../generated/schema';
import {
  zeroAddress,
  zeroBI,
} from '../utils/converters';
import {
  BIGINT_ZERO,
  BIGDECIMAL_ZERO,
  NA
} from "../utils/constants";

export function getOrInitDelegate(
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): Delegate {
  let delegate = Delegate.load(id);

  if (delegate == null && createIfNotFound) {
    delegate = new Delegate(id);

    delegate.totalVotingPowerRaw = BIGINT_ZERO
    delegate.totalVotingPower = BIGDECIMAL_ZERO

    delegate.totalPropositionPowerRaw = BIGINT_ZERO
    delegate.totalPropositionPower = BIGDECIMAL_ZERO

    delegate.aaveBalanceRaw = BIGINT_ZERO
    delegate.aaveBalance = BIGDECIMAL_ZERO

    delegate.stkAaveBalanceRaw = BIGINT_ZERO
    delegate.stkAaveBalance = BIGDECIMAL_ZERO
  
    delegate.aaveDelegatedVotingPowerRaw = BIGINT_ZERO
    delegate.aaveDelegatedVotingPower = BIGDECIMAL_ZERO
  
    delegate.stkAaveDelegatedVotingPowerRaw = BIGINT_ZERO
    delegate.stkAaveDelegatedVotingPower = BIGDECIMAL_ZERO
  
    delegate.aaveDelegatedPropositionPowerRaw = BIGINT_ZERO
    delegate.aaveDelegatedPropositionPower = BIGDECIMAL_ZERO
  
    delegate.stkAaveDelegatedPropositionPowerRaw = BIGINT_ZERO
    delegate.stkAaveDelegatedPropositionPower = BIGDECIMAL_ZERO
  
    delegate.usersVotingRepresentedAmount = 0
    delegate.usersPropositionRepresentedAmount = 0

    delegate.votingDelegate = id
    delegate.propositionDelegate = id

    if (save) {
      delegate.save();
    }
  }

  return delegate as Delegate;
}

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
    proposal.aipNumber = zeroBI();
  }

  return proposal as Proposal;
}
