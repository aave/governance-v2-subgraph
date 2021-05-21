import { Bytes } from '@graphprotocol/graph-ts';
import { Proposal, Delegate } from '../../generated/schema';
import { zeroAddress, zeroBI } from '../utils/converters';
import { BIGINT_ZERO, BIGDECIMAL_ZERO, NA, STATUS_PENDING } from '../utils/constants';

export function getOrInitDelegate(id: string, createIfNotFound: boolean = true): Delegate {
  let delegate = Delegate.load(id);

  if (delegate == null && createIfNotFound) {
    delegate = new Delegate(id);

    delegate.aaveBalanceRaw = BIGINT_ZERO;
    delegate.aaveBalance = BIGDECIMAL_ZERO;

    delegate.stkAaveBalanceRaw = BIGINT_ZERO;
    delegate.stkAaveBalance = BIGDECIMAL_ZERO;

    delegate.totalVotingPowerRaw = BIGINT_ZERO;
    delegate.totalVotingPower = BIGDECIMAL_ZERO;

    delegate.totalPropositionPowerRaw = BIGINT_ZERO;
    delegate.totalPropositionPower = BIGDECIMAL_ZERO;

    delegate.aaveTotalVotingPowerRaw = BIGINT_ZERO;
    delegate.aaveTotalVotingPower = BIGDECIMAL_ZERO;

    delegate.aaveTotalPropositionPowerRaw = BIGINT_ZERO;
    delegate.aaveTotalPropositionPower = BIGDECIMAL_ZERO;

    delegate.aaveDelegatedInVotingPowerRaw = BIGINT_ZERO;
    delegate.aaveDelegatedInVotingPower = BIGDECIMAL_ZERO;

    delegate.aaveDelegatedOutVotingPowerRaw = BIGINT_ZERO;
    delegate.aaveDelegatedOutVotingPower = BIGDECIMAL_ZERO;

    delegate.aaveDelegatedInPropositionPowerRaw = BIGINT_ZERO;
    delegate.aaveDelegatedInPropositionPower = BIGDECIMAL_ZERO;

    delegate.aaveDelegatedOutPropositionPowerRaw = BIGINT_ZERO;
    delegate.aaveDelegatedOutPropositionPower = BIGDECIMAL_ZERO;

    delegate.stkAaveTotalVotingPowerRaw = BIGINT_ZERO;
    delegate.stkAaveTotalVotingPower = BIGDECIMAL_ZERO;

    delegate.stkAaveTotalPropositionPowerRaw = BIGINT_ZERO;
    delegate.stkAaveTotalPropositionPower = BIGDECIMAL_ZERO;

    delegate.stkAaveDelegatedInVotingPowerRaw = BIGINT_ZERO;
    delegate.stkAaveDelegatedInVotingPower = BIGDECIMAL_ZERO;

    delegate.stkAaveDelegatedOutVotingPowerRaw = BIGINT_ZERO;
    delegate.stkAaveDelegatedOutVotingPower = BIGDECIMAL_ZERO;

    delegate.stkAaveDelegatedInPropositionPowerRaw = BIGINT_ZERO;
    delegate.stkAaveDelegatedInPropositionPower = BIGDECIMAL_ZERO;

    delegate.stkAaveDelegatedOutPropositionPowerRaw = BIGINT_ZERO;
    delegate.stkAaveDelegatedOutPropositionPower = BIGDECIMAL_ZERO;

    delegate.usersVotingRepresentedAmount = 1;
    delegate.usersPropositionRepresentedAmount = 1;

    delegate.aaveVotingDelegate = id;
    delegate.aavePropositionDelegate = id;

    delegate.stkAaveVotingDelegate = id;
    delegate.stkAavePropositionDelegate = id;

    delegate.numVotes = zeroBI().toI32();
    delegate.numProposals = zeroBI().toI32();

    delegate.lastUpdateTimestamp = zeroBI().toI32();

    delegate.save();
  }

  return delegate as Delegate;
}

export function getOrInitProposal(proposalId: string): Proposal {
  let proposal = Proposal.load(proposalId);

  if (proposal == null) {
    proposal = new Proposal(proposalId);
    proposal.state = STATUS_PENDING;
    proposal.ipfsHash = NA;
    proposal.creator = zeroAddress().toString();
    proposal.executor = NA;
    proposal.targets = [Bytes.fromI32(0) as Bytes];
    proposal.values = [zeroBI()];
    proposal.signatures = [NA];
    proposal.calldatas = [Bytes.fromI32(0) as Bytes];
    proposal.withDelegatecalls = [false];
    proposal.startBlock = zeroBI();
    proposal.endBlock = zeroBI();
    proposal.governanceStrategy = Bytes.fromI32(0) as Bytes;
    proposal.currentYesVote = zeroBI();
    proposal.currentNoVote = zeroBI();
    proposal.winner = NA;
    proposal.createdTimestamp = zeroBI().toI32();
    proposal.lastUpdateTimestamp = zeroBI().toI32();
    proposal.lastUpdateBlock = zeroBI();
    proposal.title = NA;
    proposal.description = NA;
    proposal.shortDescription = NA;
    proposal.govContract = zeroAddress();
    proposal.totalPropositionSupply = zeroBI();
    proposal.totalVotingSupply = zeroBI();
    proposal.createdBlockNumber = zeroBI();
    proposal.totalCurrentVoters = 0;
    proposal.aipNumber = zeroBI();
    proposal.author = NA;
    proposal.discussions = NA;
    proposal.save();
  }

  return proposal as Proposal;
}
