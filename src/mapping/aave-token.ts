import { log } from '@graphprotocol/graph-ts';
import { DelegateChanged, Transfer } from '../../generated/AaveTokenV2/AaveTokenV2';
import { Delegate } from '../../generated/schema';
import { getOrInitDelegate } from '../helpers/initializers';
import { BIGINT_ZERO, VOTING_POWER, ZERO_ADDRESS } from '../utils/constants';

import { toDecimal } from '../utils/converters';

// When a users delegated voting/proposition power changes, recompute AAVE and total voting/proposition power
function retotal(delegate: Delegate, type: string): Delegate {
  if (type === 'vote') {
    delegate.aaveTotalVotingPowerRaw = delegate.aaveBalanceRaw
      .plus(delegate.aaveDelegatedInVotingPowerRaw)
      .minus(delegate.aaveDelegatedOutVotingPowerRaw);
    delegate.aaveTotalVotingPower = toDecimal(delegate.aaveTotalVotingPowerRaw);
    delegate.totalVotingPowerRaw = delegate.aaveTotalVotingPowerRaw.plus(
      delegate.stkAaveTotalVotingPowerRaw
    );
    delegate.totalVotingPower = toDecimal(delegate.totalVotingPowerRaw);
  } else {
    delegate.aaveTotalPropositionPowerRaw = delegate.aaveBalanceRaw
      .plus(delegate.aaveDelegatedInPropositionPowerRaw)
      .minus(delegate.aaveDelegatedOutPropositionPowerRaw);
    delegate.aaveTotalPropositionPower = toDecimal(delegate.aaveTotalPropositionPowerRaw);
    delegate.totalPropositionPowerRaw = delegate.aaveTotalPropositionPowerRaw.plus(
      delegate.stkAaveTotalPropositionPowerRaw
    );
    delegate.totalPropositionPower = toDecimal(delegate.totalPropositionPowerRaw);
  }
  return delegate;
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
      votingDelegate = retotal(votingDelegate, 'vote');
      votingDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      votingDelegate.save();
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
      propositionDelegate = retotal(propositionDelegate, 'proposition');
      propositionDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      propositionDelegate.save();
      fromHolder.aaveDelegatedOutPropositionPowerRaw = fromHolder.aaveDelegatedOutPropositionPowerRaw.minus(
        value
      );
      fromHolder.aaveDelegatedOutPropositionPower = toDecimal(
        fromHolder.aaveDelegatedOutPropositionPowerRaw
      );
    }

    // Recompute user's voting/proposition power with updated balance and outgoing delegations
    fromHolder = retotal(fromHolder, 'vote');
    fromHolder = retotal(fromHolder, 'proposition');
    fromHolder.lastUpdateTimestamp = event.block.timestamp.toI32();
    fromHolder.save();
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
      votingDelegate = retotal(votingDelegate, 'vote');
      votingDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      votingDelegate.save();
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
      propositionDelegate = retotal(propositionDelegate, 'proposition');
      propositionDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      propositionDelegate.save();
      toHolder.aaveDelegatedOutPropositionPowerRaw = toHolder.aaveDelegatedOutPropositionPowerRaw.plus(
        value
      );
      toHolder.aaveDelegatedOutPropositionPower = toDecimal(
        toHolder.aaveDelegatedOutPropositionPowerRaw
      );
    }
    // Recompute user's voting/proposition power with updated balance and outgoing delegations
    toHolder = retotal(toHolder, 'vote');
    toHolder = retotal(toHolder, 'proposition');
    toHolder.lastUpdateTimestamp = event.block.timestamp.toI32();
    toHolder.save();
  }
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let delegator = getOrInitDelegate(event.params.delegator.toHexString());
  let newDelegate = getOrInitDelegate(event.params.delegatee.toHexString());

  if (event.params.delegationType == VOTING_POWER) {
    let previousDelegate = getOrInitDelegate(delegator.aaveVotingDelegate);

    // Subtract from previous delegate if user was not self-delegating
    if (previousDelegate.id != delegator.id) {
      previousDelegate.aaveDelegatedInVotingPowerRaw = previousDelegate.aaveDelegatedInVotingPowerRaw.minus(
        delegator.aaveBalanceRaw
      );
      previousDelegate.aaveDelegatedInVotingPower = toDecimal(
        previousDelegate.aaveDelegatedInVotingPowerRaw
      );
      previousDelegate = retotal(previousDelegate, 'vote');
      previousDelegate.usersVotingRepresentedAmount =
        previousDelegate.usersVotingRepresentedAmount - 1;
      previousDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      previousDelegate.save();
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
      newDelegate = retotal(newDelegate, 'vote');
      newDelegate.usersVotingRepresentedAmount = newDelegate.usersVotingRepresentedAmount + 1;
      newDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      newDelegate.save();
    }

    // Recompute user's voting power and set newDelegate
    delegator = retotal(delegator, 'vote');
    delegator.aaveVotingDelegate = newDelegate.id;
    delegator.lastUpdateTimestamp = event.block.timestamp.toI32();
    delegator.save();
  } else {
    let previousDelegate = getOrInitDelegate(delegator.aavePropositionDelegate);
    // Subtract from previous delegate if user was not self-delegating
    if (previousDelegate.id != delegator.id) {
      previousDelegate.aaveDelegatedInPropositionPowerRaw = previousDelegate.aaveDelegatedInPropositionPowerRaw.minus(
        delegator.aaveBalanceRaw
      );
      previousDelegate.aaveDelegatedInPropositionPower = toDecimal(
        previousDelegate.aaveDelegatedInPropositionPowerRaw
      );
      previousDelegate = retotal(previousDelegate, 'proposition');
      previousDelegate.usersPropositionRepresentedAmount =
        previousDelegate.usersPropositionRepresentedAmount - 1;
      previousDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      previousDelegate.save();
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
      newDelegate = retotal(newDelegate, 'proposition');
      newDelegate.usersPropositionRepresentedAmount =
        newDelegate.usersPropositionRepresentedAmount + 1;
      newDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      newDelegate.save();
    }

    // Recompute user's proposition power and set newDelegate
    delegator.aavePropositionDelegate = newDelegate.id;
    delegator = retotal(delegator, 'proposition');
    delegator.lastUpdateTimestamp = event.block.timestamp.toI32();
    delegator.save();
  }
}
