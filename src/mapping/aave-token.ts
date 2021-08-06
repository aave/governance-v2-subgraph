import { BigInt, log } from '@graphprotocol/graph-ts';
import { DelegateChanged, Transfer } from '../../generated/AaveTokenV2/AaveTokenV2';
import { Delegate, Delegation } from '../../generated/schema';
import { getOrInitDelegate } from '../helpers/initializers';
import {
  BIGINT_ZERO,
  VOTING_POWER,
  ZERO_ADDRESS,
  VOTING_CONSTANT,
  PROPOSITION_CONSTANT,
  AAVE_CONSTANT,
} from '../utils/constants';

import { toDecimal } from '../utils/converters';

enum PowerType {
  Voting,
  Proposition,
  Both,
}

// When a users delegated voting/proposition power changes, recompute AAVE and total voting/proposition power
function retotal(
  delegate: Delegate,
  timestamp: BigInt,
  powerType: PowerType = PowerType.Both
): void {
  if (powerType === PowerType.Voting || powerType === PowerType.Both) {
    delegate.aaveTotalVotingPowerRaw = delegate.aaveBalanceRaw
      .plus(delegate.aaveDelegatedInVotingPowerRaw)
      .minus(delegate.aaveDelegatedOutVotingPowerRaw);
    delegate.aaveTotalVotingPower = toDecimal(delegate.aaveTotalVotingPowerRaw);
    delegate.totalVotingPowerRaw = delegate.aaveTotalVotingPowerRaw.plus(
      delegate.stkAaveTotalVotingPowerRaw
    );
    delegate.totalVotingPower = toDecimal(delegate.totalVotingPowerRaw);
  }
  if (powerType === PowerType.Proposition || powerType === PowerType.Both) {
    delegate.aaveTotalPropositionPowerRaw = delegate.aaveBalanceRaw
      .plus(delegate.aaveDelegatedInPropositionPowerRaw)
      .minus(delegate.aaveDelegatedOutPropositionPowerRaw);
    delegate.aaveTotalPropositionPower = toDecimal(delegate.aaveTotalPropositionPowerRaw);
    delegate.totalPropositionPowerRaw = delegate.aaveTotalPropositionPowerRaw.plus(
      delegate.stkAaveTotalPropositionPowerRaw
    );
    delegate.totalPropositionPower = toDecimal(delegate.totalPropositionPowerRaw);
  }
  delegate.lastUpdateTimestamp = timestamp.toI32();
  delegate.save();
}

export function handleTransfer(event: Transfer): void {
  let fromAddress = event.params.from.toHexString();
  let toAddress = event.params.to.toHexString();
  let value = event.params.value;

  // fromHolder
  if (fromAddress != ZERO_ADDRESS) {
    let fromHolder = getOrInitDelegate(fromAddress);
    fromHolder.aaveBalanceRaw = fromHolder.aaveBalanceRaw.minus(value);
    fromHolder.aaveBalance = toDecimal(fromHolder.aaveBalanceRaw);

    if (fromHolder.aaveBalanceRaw < BIGINT_ZERO) {
      log.error('Negative balance on holder {} with balance {}', [
        fromHolder.id,
        fromHolder.aaveBalanceRaw.toString(),
      ]);
    }

    // If a user is delegating their aave voting power to someone else, update the delegate's inVotingPower and the user's outVotingPower
    if (fromHolder.aaveVotingDelegate != fromHolder.id) {
      let votingDelegate = getOrInitDelegate(fromHolder.aaveVotingDelegate);
      votingDelegate.aaveDelegatedInVotingPowerRaw = votingDelegate.aaveDelegatedInVotingPowerRaw.minus(
        value
      );
      votingDelegate.aaveDelegatedInVotingPower = toDecimal(
        votingDelegate.aaveDelegatedInVotingPowerRaw
      );
      retotal(votingDelegate, event.block.timestamp, PowerType.Voting);
      fromHolder.aaveDelegatedOutVotingPowerRaw = fromHolder.aaveDelegatedOutVotingPowerRaw.minus(
        value
      );
      fromHolder.aaveDelegatedOutVotingPower = toDecimal(fromHolder.aaveDelegatedOutVotingPowerRaw);
    }

    // If a user is delegating their aave proposition power to someone else, update the delegate's inPropositionPower and user's outPropositionPower
    if (fromHolder.aavePropositionDelegate != fromHolder.id) {
      let propositionDelegate = getOrInitDelegate(fromHolder.aavePropositionDelegate);
      propositionDelegate.aaveDelegatedInPropositionPowerRaw = propositionDelegate.aaveDelegatedInPropositionPowerRaw.minus(
        value
      );
      propositionDelegate.aaveDelegatedInPropositionPower = toDecimal(
        propositionDelegate.aaveDelegatedInPropositionPowerRaw
      );
      retotal(propositionDelegate, event.block.timestamp, PowerType.Proposition);

      fromHolder.aaveDelegatedOutPropositionPowerRaw = fromHolder.aaveDelegatedOutPropositionPowerRaw.minus(
        value
      );
      fromHolder.aaveDelegatedOutPropositionPower = toDecimal(
        fromHolder.aaveDelegatedOutPropositionPowerRaw
      );
    }

    // Recompute user's voting/proposition power with updated balance and outgoing delegations
    retotal(fromHolder, event.block.timestamp);
  }

  // toHolder
  if (toAddress != ZERO_ADDRESS) {
    let toHolder = getOrInitDelegate(toAddress);
    toHolder.aaveBalanceRaw = toHolder.aaveBalanceRaw.plus(value);
    toHolder.aaveBalance = toDecimal(toHolder.aaveBalanceRaw);

    // If a user is delegating their aave voting power to someone else, update the delegate's inVotingPower and the user's outVotingPower
    if (toHolder.aaveVotingDelegate != toHolder.id) {
      let votingDelegate = getOrInitDelegate(toHolder.aaveVotingDelegate);
      votingDelegate.aaveDelegatedInVotingPowerRaw = votingDelegate.aaveDelegatedInVotingPowerRaw.plus(
        value
      );
      votingDelegate.aaveDelegatedInVotingPower = toDecimal(
        votingDelegate.aaveDelegatedInVotingPowerRaw
      );
      retotal(votingDelegate, event.block.timestamp, PowerType.Voting);
      toHolder.aaveDelegatedOutVotingPowerRaw = toHolder.aaveDelegatedOutVotingPowerRaw.plus(value);
      toHolder.aaveDelegatedOutVotingPower = toDecimal(toHolder.aaveDelegatedOutVotingPowerRaw);
    }

    // If a user is delegating their aave proposition power to someone else, update the delegate's inPropositionPower and user's outPropositionPower
    if (toHolder.aavePropositionDelegate != toHolder.id) {
      let propositionDelegate = getOrInitDelegate(toHolder.aavePropositionDelegate);
      propositionDelegate.aaveDelegatedInPropositionPowerRaw = propositionDelegate.aaveDelegatedInPropositionPowerRaw.plus(
        value
      );
      propositionDelegate.aaveDelegatedInPropositionPower = toDecimal(
        propositionDelegate.aaveDelegatedInPropositionPowerRaw
      );
      retotal(propositionDelegate, event.block.timestamp, PowerType.Proposition);
      toHolder.aaveDelegatedOutPropositionPowerRaw = toHolder.aaveDelegatedOutPropositionPowerRaw.plus(
        value
      );
      toHolder.aaveDelegatedOutPropositionPower = toDecimal(
        toHolder.aaveDelegatedOutPropositionPowerRaw
      );
    }
    // Recompute user's voting/proposition power with updated balance and outgoing delegations
    retotal(toHolder, event.block.timestamp);
  }
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let delegator = getOrInitDelegate(event.params.delegator.toHexString());
  let newDelegate = getOrInitDelegate(event.params.delegatee.toHexString());
  let delegationId =
    delegator.id + ':' + newDelegate.id + ':aave:' + event.transaction.hash.toHexString();
  let delegation = new Delegation(delegationId);
  delegation.user = delegator.id;
  delegation.timestamp = event.block.timestamp.toI32();
  delegation.delegate = newDelegate.id;
  delegation.asset = AAVE_CONSTANT;
  delegation.amountRaw = delegator.aaveBalanceRaw;
  delegation.amount = delegator.aaveBalance;

  if (event.params.delegationType == VOTING_POWER) {
    delegation.powerType = VOTING_CONSTANT;
    let previousDelegate = getOrInitDelegate(delegator.aaveVotingDelegate);

    // Subtract from previous delegate if user was not self-delegating
    if (previousDelegate.id != delegator.id) {
      previousDelegate.aaveDelegatedInVotingPowerRaw = previousDelegate.aaveDelegatedInVotingPowerRaw.minus(
        delegator.aaveBalanceRaw
      );
      previousDelegate.aaveDelegatedInVotingPower = toDecimal(
        previousDelegate.aaveDelegatedInVotingPowerRaw
      );
      previousDelegate.usersVotingRepresentedAmount =
        previousDelegate.usersVotingRepresentedAmount - 1;
      retotal(previousDelegate, event.block.timestamp, PowerType.Voting);
    }
    // If newDelegate is not self, update delegate's inVotingPower and user's outVotingPower, else set user's outVotingPower to 0
    if (newDelegate.id === delegator.id) {
      delegator.aaveDelegatedOutVotingPowerRaw = BIGINT_ZERO;
      delegator.aaveDelegatedOutVotingPower = toDecimal(delegator.aaveDelegatedOutVotingPowerRaw);
    } else {
      delegator.aaveDelegatedOutVotingPowerRaw = delegator.aaveBalanceRaw;
      delegator.aaveDelegatedOutVotingPower = toDecimal(delegator.aaveDelegatedOutVotingPowerRaw);
      newDelegate.aaveDelegatedInVotingPowerRaw = newDelegate.aaveDelegatedInVotingPowerRaw.plus(
        delegator.aaveBalanceRaw
      );
      newDelegate.aaveDelegatedInVotingPower = toDecimal(newDelegate.aaveDelegatedInVotingPowerRaw);
      newDelegate.usersVotingRepresentedAmount = newDelegate.usersVotingRepresentedAmount + 1;
      retotal(newDelegate, event.block.timestamp, PowerType.Voting);
    }

    // Recompute user's voting power and set newDelegate
    delegator.aaveVotingDelegate = newDelegate.id;
    retotal(delegator, event.block.timestamp, PowerType.Voting);
  } else {
    delegation.powerType = PROPOSITION_CONSTANT;
    let previousDelegate = getOrInitDelegate(delegator.aavePropositionDelegate);
    // Subtract from previous delegate if user was not self-delegating
    if (previousDelegate.id != delegator.id) {
      previousDelegate.aaveDelegatedInPropositionPowerRaw = previousDelegate.aaveDelegatedInPropositionPowerRaw.minus(
        delegator.aaveBalanceRaw
      );
      previousDelegate.aaveDelegatedInPropositionPower = toDecimal(
        previousDelegate.aaveDelegatedInPropositionPowerRaw
      );
      previousDelegate.usersPropositionRepresentedAmount =
        previousDelegate.usersPropositionRepresentedAmount - 1;
      retotal(previousDelegate, event.block.timestamp, PowerType.Proposition);
    }

    // If newDelegate is not self, update delegate's inVotingPower and user's outVotingPower, else set user's outVotingPower to 0
    if (newDelegate.id === delegator.id) {
      delegator.aaveDelegatedOutPropositionPowerRaw = BIGINT_ZERO;
      delegator.aaveDelegatedOutPropositionPower = toDecimal(
        delegator.aaveDelegatedOutPropositionPowerRaw
      );
    } else {
      delegator.aaveDelegatedOutPropositionPowerRaw = delegator.aaveBalanceRaw;
      delegator.aaveDelegatedOutPropositionPower = toDecimal(
        delegator.aaveDelegatedOutPropositionPowerRaw
      );
      newDelegate.aaveDelegatedInPropositionPowerRaw = newDelegate.aaveDelegatedInPropositionPowerRaw.plus(
        delegator.aaveBalanceRaw
      );
      newDelegate.aaveDelegatedInPropositionPower = toDecimal(
        newDelegate.aaveDelegatedInPropositionPowerRaw
      );
      newDelegate.usersPropositionRepresentedAmount =
        newDelegate.usersPropositionRepresentedAmount + 1;
      retotal(newDelegate, event.block.timestamp, PowerType.Proposition);
    }
    // Recompute user's proposition power and set newDelegate
    delegator.aavePropositionDelegate = newDelegate.id;
    delegation.save();
    retotal(delegator, event.block.timestamp, PowerType.Proposition);
  }
}
