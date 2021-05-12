import { log } from '@graphprotocol/graph-ts';
import {
  DelegateChanged,
  DelegatedPowerChanged,
  Transfer,
} from '../../generated/AaveTokenV2/AaveTokenV2';
import { getOrInitDelegate } from '../helpers/initializers';
import { BIGINT_ZERO, VOTING_POWER, ZERO_ADDRESS } from '../utils/constants';

import { toDecimal } from '../utils/converters';

export function handleTransfer(event: Transfer): void {
  let fromAddress = event.params.from.toHexString();
  let toAddress = event.params.to.toHexString();

  // fromHolder
  if (fromAddress != ZERO_ADDRESS) {
    let fromHolder = getOrInitDelegate(fromAddress);
    fromHolder.aaveBalanceRaw = fromHolder.aaveBalanceRaw.minus(event.params.value);
    fromHolder.aaveBalance = toDecimal(fromHolder.aaveBalanceRaw);

    if (fromHolder.aaveBalanceRaw < BIGINT_ZERO) {
      log.error('Negative balance on holder {} with balance {}', [
        fromHolder.id,
        fromHolder.aaveBalanceRaw.toString(),
      ]);
    }
    fromHolder.lastUpdateTimestamp = event.block.timestamp.toI32();
    fromHolder.save();
  }

  // toHolder
  if (toAddress != ZERO_ADDRESS) {
    let toHolder = getOrInitDelegate(toAddress);
    toHolder.aaveBalanceRaw = toHolder.aaveBalanceRaw.plus(event.params.value);
    toHolder.aaveBalance = toDecimal(toHolder.aaveBalanceRaw);

    toHolder.lastUpdateTimestamp = event.block.timestamp.toI32();
    toHolder.save();
  }
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let delegator = getOrInitDelegate(event.params.delegator.toHexString());
  let newDelegate = getOrInitDelegate(event.params.delegatee.toHexString());
  if (event.params.delegationType == VOTING_POWER) {
    let previousDelegate = getOrInitDelegate(delegator.aaveVotingDelegate);
    previousDelegate.usersVotingRepresentedAmount =
      previousDelegate.usersVotingRepresentedAmount - 1;
    newDelegate.usersVotingRepresentedAmount = newDelegate.usersVotingRepresentedAmount + 1;
    delegator.aaveVotingDelegate = newDelegate.id;
    previousDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    previousDelegate.save();
  } else {
    let previousDelegate = getOrInitDelegate(delegator.aavePropositionDelegate);
    previousDelegate.usersPropositionRepresentedAmount =
      previousDelegate.usersPropositionRepresentedAmount - 1;
    newDelegate.usersPropositionRepresentedAmount =
      newDelegate.usersPropositionRepresentedAmount + 1;
    delegator.aavePropositionDelegate = newDelegate.id;
    previousDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    previousDelegate.save();
  }
  delegator.lastUpdateTimestamp = event.block.timestamp.toI32();
  newDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
  delegator.save();
  newDelegate.save();
}

export function handleDelegatedPowerChanged(event: DelegatedPowerChanged): void {
  if (event.params.delegationType == VOTING_POWER) {
    let delegate = getOrInitDelegate(event.params.user.toHexString());
    let amount = event.params.amount;

    delegate.aaveDelegatedVotingPowerRaw = amount;
    delegate.aaveDelegatedVotingPower = toDecimal(delegate.aaveDelegatedVotingPowerRaw);

    delegate.totalVotingPowerRaw = delegate.aaveDelegatedVotingPowerRaw.plus(
      delegate.stkAaveDelegatedVotingPowerRaw
    );
    delegate.totalVotingPower = toDecimal(delegate.totalVotingPowerRaw);
    delegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    delegate.save();
  } else {
    let delegate = getOrInitDelegate(event.params.user.toHexString());
    let amount = event.params.amount;

    delegate.aaveDelegatedPropositionPowerRaw = amount;
    delegate.aaveDelegatedPropositionPower = toDecimal(delegate.aaveDelegatedPropositionPowerRaw);

    delegate.totalPropositionPowerRaw = delegate.aaveDelegatedPropositionPowerRaw.plus(
      delegate.stkAaveDelegatedPropositionPowerRaw
    );
    delegate.totalPropositionPower = toDecimal(delegate.totalPropositionPowerRaw);
    delegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    delegate.save();
  }
}
