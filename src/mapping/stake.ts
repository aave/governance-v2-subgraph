import { BigInt, log } from '@graphprotocol/graph-ts';
import { getOrInitDelegate } from '../helpers/initializers';
import {
  VOTING_POWER,
  BIGINT_ZERO,
  ZERO_ADDRESS,
  VOTING_CONSTANT,
  PROPOSITION_CONSTANT,
  STKAAVE_CONSTANT,
} from '../utils/constants';
import { Delegate, Delegation } from '../../generated/schema';
import { toDecimal } from '../utils/converters';
import { DelegateChanged, Transfer } from '../../generated/StakedTokenV3/StakedTokenV3';

enum PowerType {
  Voting,
  Proposition,
  Both,
}

function retotal(
  delegate: Delegate,
  timestamp: BigInt,
  powerType: PowerType = PowerType.Both
): void {
  if (powerType === PowerType.Voting || powerType === PowerType.Both) {
    delegate.stkAaveTotalVotingPowerRaw = delegate.stkAaveBalanceRaw
      .plus(delegate.stkAaveDelegatedInVotingPowerRaw)
      .minus(delegate.stkAaveDelegatedOutVotingPowerRaw);
    delegate.stkAaveTotalVotingPower = toDecimal(delegate.stkAaveTotalVotingPowerRaw);
    delegate.totalVotingPowerRaw = delegate.stkAaveTotalVotingPowerRaw.plus(
      delegate.aaveTotalVotingPowerRaw
    );
    delegate.totalVotingPower = toDecimal(delegate.totalVotingPowerRaw);
  }
  if (powerType === PowerType.Proposition || powerType === PowerType.Both) {
    delegate.stkAaveTotalPropositionPowerRaw = delegate.stkAaveBalanceRaw
      .plus(delegate.stkAaveDelegatedInPropositionPowerRaw)
      .minus(delegate.stkAaveDelegatedOutPropositionPowerRaw);
    delegate.stkAaveTotalPropositionPower = toDecimal(delegate.stkAaveTotalPropositionPowerRaw);
    delegate.totalPropositionPowerRaw = delegate.stkAaveTotalPropositionPowerRaw.plus(
      delegate.aaveTotalPropositionPowerRaw
    );
    delegate.totalPropositionPower = toDecimal(delegate.totalPropositionPowerRaw);
  }
  delegate.lastUpdateTimestamp = timestamp.toI32();
  delegate.save();
}

export function handleTransfer(event: Transfer): void {
  let fromAddress = event.params.from.toHexString();
  let toAddress = event.params.to.toHexString();

  // fromHolder
  if (fromAddress != ZERO_ADDRESS) {
    let fromHolder = getOrInitDelegate(fromAddress);
    fromHolder.stkAaveBalanceRaw = fromHolder.stkAaveBalanceRaw.minus(event.params.value);
    fromHolder.stkAaveBalance = toDecimal(fromHolder.stkAaveBalanceRaw);

    if (fromHolder.stkAaveBalanceRaw < BIGINT_ZERO) {
      log.error('Negative balance on holder {} with balance {}', [
        fromHolder.id,
        fromHolder.stkAaveBalanceRaw.toString(),
      ]);
    }

    if (fromHolder.stkAaveVotingDelegate != fromHolder.id) {
      let votingDelegate = getOrInitDelegate(fromHolder.stkAaveVotingDelegate);
      votingDelegate.stkAaveDelegatedInVotingPowerRaw = votingDelegate.stkAaveDelegatedInVotingPowerRaw.minus(
        event.params.value
      );
      votingDelegate.stkAaveDelegatedInVotingPower = toDecimal(
        votingDelegate.stkAaveDelegatedInVotingPowerRaw
      );
      retotal(votingDelegate, event.block.timestamp, PowerType.Voting);
      fromHolder.stkAaveDelegatedOutVotingPowerRaw = fromHolder.stkAaveDelegatedOutVotingPowerRaw.minus(
        event.params.value
      );
      fromHolder.stkAaveDelegatedOutVotingPower = toDecimal(
        fromHolder.stkAaveDelegatedOutVotingPowerRaw
      );
    }

    if (fromHolder.stkAavePropositionDelegate != fromHolder.id) {
      let propositionDelegate = getOrInitDelegate(fromHolder.stkAavePropositionDelegate);
      propositionDelegate.stkAaveDelegatedInPropositionPowerRaw = propositionDelegate.stkAaveDelegatedInPropositionPowerRaw.minus(
        event.params.value
      );
      propositionDelegate.stkAaveDelegatedInPropositionPower = toDecimal(
        propositionDelegate.stkAaveDelegatedInPropositionPowerRaw
      );
      retotal(propositionDelegate, event.block.timestamp, PowerType.Proposition);
      fromHolder.stkAaveDelegatedOutPropositionPowerRaw = fromHolder.stkAaveDelegatedOutPropositionPowerRaw.minus(
        event.params.value
      );
      fromHolder.stkAaveDelegatedOutPropositionPower = toDecimal(
        fromHolder.stkAaveDelegatedOutPropositionPowerRaw
      );
    }
    retotal(fromHolder, event.block.timestamp);
  }

  // toHolder
  if (toAddress != ZERO_ADDRESS) {
    let toHolder = getOrInitDelegate(toAddress);
    toHolder.stkAaveBalanceRaw = toHolder.stkAaveBalanceRaw.plus(event.params.value);
    toHolder.stkAaveBalance = toDecimal(toHolder.stkAaveBalanceRaw);

    if (toHolder.stkAaveVotingDelegate != toHolder.id) {
      let votingDelegate = getOrInitDelegate(toHolder.stkAaveVotingDelegate);
      votingDelegate.stkAaveDelegatedInVotingPowerRaw = votingDelegate.stkAaveDelegatedInVotingPowerRaw.plus(
        event.params.value
      );
      votingDelegate.stkAaveDelegatedInVotingPower = toDecimal(
        votingDelegate.stkAaveDelegatedInVotingPowerRaw
      );
      retotal(votingDelegate, event.block.timestamp, PowerType.Voting);
      toHolder.stkAaveDelegatedOutVotingPowerRaw = toHolder.stkAaveDelegatedOutVotingPowerRaw.plus(
        event.params.value
      );
      toHolder.stkAaveDelegatedOutVotingPower = toDecimal(
        toHolder.stkAaveDelegatedOutVotingPowerRaw
      );
    }

    if (toHolder.stkAavePropositionDelegate != toHolder.id) {
      let propositionDelegate = getOrInitDelegate(toHolder.stkAavePropositionDelegate);
      propositionDelegate.stkAaveDelegatedInPropositionPowerRaw = propositionDelegate.stkAaveDelegatedInPropositionPowerRaw.plus(
        event.params.value
      );
      propositionDelegate.stkAaveDelegatedInPropositionPower = toDecimal(
        propositionDelegate.stkAaveDelegatedInPropositionPowerRaw
      );
      retotal(propositionDelegate, event.block.timestamp, PowerType.Proposition);
      toHolder.stkAaveDelegatedOutPropositionPowerRaw = toHolder.stkAaveDelegatedOutPropositionPowerRaw.plus(
        event.params.value
      );
      toHolder.stkAaveDelegatedOutPropositionPower = toDecimal(
        toHolder.stkAaveDelegatedOutPropositionPowerRaw
      );
    }
    retotal(toHolder, event.block.timestamp);
  }
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let delegator = getOrInitDelegate(event.params.delegator.toHexString());
  let newDelegate = getOrInitDelegate(event.params.delegatee.toHexString());
  let delegationId =
    delegator.id + ':' + newDelegate.id + ':stkaave:' + event.transaction.hash.toHexString();
  let delegation = new Delegation(delegationId);
  delegation.user = delegator.id;
  delegation.timestamp = event.block.timestamp.toI32();
  delegation.delegate = newDelegate.id;
  delegation.asset = STKAAVE_CONSTANT;
  delegation.amountRaw = delegator.aaveBalanceRaw;
  delegation.amount = delegator.aaveBalance;

  if (event.params.delegationType == VOTING_POWER) {
    delegation.powerType = VOTING_CONSTANT;
    let previousDelegate = getOrInitDelegate(delegator.stkAaveVotingDelegate);
    // Subtract from previous delegate if delegator was not self-delegating
    if (previousDelegate.id != delegator.id) {
      previousDelegate.stkAaveDelegatedInVotingPowerRaw = previousDelegate.stkAaveDelegatedInVotingPowerRaw.minus(
        delegator.stkAaveBalanceRaw
      );
      previousDelegate.stkAaveDelegatedInVotingPower = toDecimal(
        previousDelegate.stkAaveDelegatedInVotingPowerRaw
      );
    }

    // Add to new delegate if delegator is not delegating to themself, and set delegatedOutPower accordingly
    if (newDelegate.id === delegator.id) {
      delegator.stkAaveDelegatedOutVotingPowerRaw = BIGINT_ZERO;
      delegator.stkAaveDelegatedOutVotingPower = toDecimal(
        delegator.stkAaveDelegatedOutVotingPowerRaw
      );
    } else {
      delegator.stkAaveDelegatedOutVotingPowerRaw = delegator.stkAaveBalanceRaw;
      delegator.stkAaveDelegatedOutVotingPower = toDecimal(
        delegator.stkAaveDelegatedOutVotingPowerRaw
      );
      newDelegate.stkAaveDelegatedInVotingPowerRaw = newDelegate.stkAaveDelegatedInVotingPowerRaw.plus(
        delegator.stkAaveBalanceRaw
      );
      newDelegate.stkAaveDelegatedInVotingPower = toDecimal(
        newDelegate.stkAaveDelegatedInVotingPowerRaw
      );
    }

    retotal(previousDelegate, event.block.timestamp, PowerType.Voting);
    delegator.stkAaveVotingDelegate = newDelegate.id;
    retotal(delegator, event.block.timestamp, PowerType.Voting);
    retotal(newDelegate, event.block.timestamp, PowerType.Voting);
  } else {
    delegation.powerType = PROPOSITION_CONSTANT;
    let previousDelegate = getOrInitDelegate(delegator.stkAavePropositionDelegate);
    // Subtract from previous delegate if delegator was not self-delegating
    if (previousDelegate.id != delegator.id) {
      previousDelegate.stkAaveDelegatedInPropositionPowerRaw = previousDelegate.stkAaveDelegatedInPropositionPowerRaw.minus(
        delegator.stkAaveBalanceRaw
      );
      previousDelegate.stkAaveDelegatedInPropositionPower = toDecimal(
        previousDelegate.stkAaveDelegatedInPropositionPowerRaw
      );
    }

    // Add to new delegate if delegator is not delegating to themself, and set delegatedOutPower accordingly
    if (newDelegate.id === delegator.id) {
      delegator.stkAaveDelegatedOutPropositionPowerRaw = BIGINT_ZERO;
      delegator.stkAaveDelegatedOutPropositionPower = toDecimal(
        delegator.stkAaveDelegatedOutPropositionPowerRaw
      );
    } else {
      delegator.stkAaveDelegatedOutPropositionPowerRaw = delegator.stkAaveBalanceRaw;
      delegator.stkAaveDelegatedOutPropositionPower = toDecimal(
        delegator.stkAaveDelegatedOutPropositionPowerRaw
      );
      newDelegate.stkAaveDelegatedInPropositionPowerRaw = newDelegate.stkAaveDelegatedInPropositionPowerRaw.plus(
        delegator.stkAaveBalanceRaw
      );
      newDelegate.stkAaveDelegatedInPropositionPower = toDecimal(
        newDelegate.stkAaveDelegatedInPropositionPowerRaw
      );
    }
    delegation.save();
    retotal(previousDelegate, event.block.timestamp, PowerType.Proposition);
    delegator.stkAavePropositionDelegate = newDelegate.id;
    retotal(delegator, event.block.timestamp, PowerType.Proposition);
    retotal(newDelegate, event.block.timestamp, PowerType.Proposition);
  }
}
