import { log } from '@graphprotocol/graph-ts';
import { getOrInitDelegate } from '../helpers/initializers';
import { VOTING_POWER, BIGINT_ZERO, ZERO_ADDRESS, BIGDECIMAL_ZERO } from '../utils/constants';
import { Delegate } from '../../generated/schema';
import { toDecimal } from '../utils/converters';
import { DelegateChanged, Transfer } from '../../generated/AaveStakeToken/StakedTokenV3';

function retotal(delegate: Delegate, type: string): Delegate {
  if (type === 'vote') {
    delegate.stkAaveTotalVotingPowerRaw = delegate.stkAaveBalanceRaw
      .plus(delegate.stkAaveDelegatedInVotingPowerRaw)
      .minus(delegate.stkAaveDelegatedOutVotingPowerRaw);
    delegate.stkAaveTotalVotingPower = toDecimal(delegate.stkAaveTotalVotingPowerRaw);
    delegate.totalVotingPowerRaw = delegate.stkAaveTotalVotingPowerRaw.plus(
      delegate.aaveTotalVotingPowerRaw
    );
    delegate.totalVotingPower = toDecimal(delegate.totalVotingPowerRaw);
  } else {
    delegate.stkAaveTotalPropositionPowerRaw = delegate.stkAaveBalanceRaw
      .plus(delegate.stkAaveDelegatedInPropositionPowerRaw)
      .minus(delegate.stkAaveDelegatedOutPropositionPowerRaw);
    delegate.stkAaveTotalPropositionPower = toDecimal(delegate.stkAaveTotalPropositionPowerRaw);
    delegate.totalPropositionPowerRaw = delegate.stkAaveTotalPropositionPowerRaw.plus(
      delegate.aaveTotalPropositionPowerRaw
    );
    delegate.totalPropositionPower = toDecimal(delegate.totalPropositionPowerRaw);
  }
  return delegate;
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
      votingDelegate = retotal(votingDelegate, 'vote');
      votingDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      votingDelegate.save();
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
      propositionDelegate = retotal(propositionDelegate, 'proposition');
      propositionDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      propositionDelegate.save();
      fromHolder.stkAaveDelegatedOutPropositionPowerRaw = fromHolder.stkAaveDelegatedOutPropositionPowerRaw.minus(
        event.params.value
      );
      fromHolder.stkAaveDelegatedOutPropositionPower = toDecimal(
        fromHolder.stkAaveDelegatedOutPropositionPowerRaw
      );
    }
    fromHolder = retotal(fromHolder, 'vote');
    fromHolder = retotal(fromHolder, 'proposition');
    fromHolder.lastUpdateTimestamp = event.block.timestamp.toI32();
    fromHolder.save();
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
      votingDelegate = retotal(votingDelegate, 'vote');
      votingDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      votingDelegate.save();
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
      propositionDelegate = retotal(propositionDelegate, 'proposition');
      propositionDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
      propositionDelegate.save();
      toHolder.stkAaveDelegatedOutPropositionPowerRaw = toHolder.stkAaveDelegatedOutPropositionPowerRaw.plus(
        event.params.value
      );
      toHolder.stkAaveDelegatedOutPropositionPower = toDecimal(
        toHolder.stkAaveDelegatedOutPropositionPowerRaw
      );
    }
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

    previousDelegate = retotal(previousDelegate, 'vote');
    previousDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    previousDelegate.save();
    delegator = retotal(delegator, 'vote');
    delegator.stkAaveVotingDelegate = newDelegate.id;
    delegator.lastUpdateTimestamp = event.block.timestamp.toI32();
    delegator.save();
    newDelegate = retotal(newDelegate, 'vote');
    newDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    newDelegate.save();
  } else {
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
    previousDelegate = retotal(previousDelegate, 'proposition');
    previousDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    previousDelegate.save();
    delegator = retotal(delegator, 'proposition');
    delegator.stkAavePropositionDelegate = newDelegate.id;
    delegator.lastUpdateTimestamp = event.block.timestamp.toI32();
    delegator.save();
    newDelegate = retotal(newDelegate, 'proposition');
    newDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    newDelegate.save();
  }
}
