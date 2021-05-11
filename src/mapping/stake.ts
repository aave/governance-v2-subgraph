import { log } from '@graphprotocol/graph-ts';
import { getOrInitDelegate } from '../helpers/initializers';
import { VOTING_POWER, BIGINT_ZERO, ZERO_ADDRESS } from '../utils/constants';
import { toDecimal } from '../utils/converters';
import {
  DelegateChanged,
  DelegatedPowerChanged,
  Transfer,
} from '../../generated/AaveStakeToken/StakedTokenV3';

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

    fromHolder.save();
  }

  // toHolder
  if (toAddress != ZERO_ADDRESS) {
    let toHolder = getOrInitDelegate(toAddress);
    toHolder.stkAaveBalanceRaw = toHolder.stkAaveBalanceRaw.plus(event.params.value);
    toHolder.stkAaveBalance = toDecimal(toHolder.stkAaveBalanceRaw);

    // Ensure that stkAaveDelegatedVotingPower is strictly greater than stkAaveBalance if person is self delegating
    if (
      toHolder.stkAaveVotingDelegate === toHolder.id &&
      toHolder.stkAaveDelegatedVotingPower < toHolder.stkAaveBalance
    ) {
      log.warning('Address {} getting set to stkAave voting power {}', [
        toHolder.id,
        toHolder.stkAaveBalance.toString(),
      ]);
      toHolder.stkAaveDelegatedVotingPowerRaw = toHolder.stkAaveBalanceRaw;
      toHolder.stkAaveDelegatedVotingPower = toDecimal(toHolder.stkAaveDelegatedVotingPowerRaw);
      toHolder.totalVotingPowerRaw = toHolder.stkAaveDelegatedVotingPowerRaw.plus(
        toHolder.aaveDelegatedVotingPowerRaw
      );
      toHolder.totalVotingPower = toDecimal(toHolder.totalVotingPowerRaw);
    }

    // Ensure that stkAaveDelegatedPropositionPower is strictly greater than stkAaveBalance if person is self delegating
    if (
      toHolder.stkAavePropositionDelegate === toHolder.id &&
      toHolder.stkAaveDelegatedPropositionPower < toHolder.stkAaveBalance
    ) {
      log.warning('Address {} getting set to stkAave proposition power {}', [
        toHolder.id,
        toHolder.stkAaveBalance.toString(),
      ]);
      toHolder.stkAaveDelegatedPropositionPowerRaw = toHolder.stkAaveBalanceRaw;
      toHolder.stkAaveDelegatedPropositionPower = toDecimal(
        toHolder.stkAaveDelegatedPropositionPowerRaw
      );
      toHolder.totalPropositionPowerRaw = toHolder.stkAaveDelegatedPropositionPowerRaw.plus(
        toHolder.aaveDelegatedPropositionPowerRaw
      );
      toHolder.totalPropositionPower = toDecimal(toHolder.totalPropositionPowerRaw);
    }

    toHolder.save();
  }
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let delegator = getOrInitDelegate(event.params.delegator.toHexString());
  let newDelegate = getOrInitDelegate(event.params.delegatee.toHexString());
  if (event.params.delegationType == VOTING_POWER) {
    let previousDelegate = getOrInitDelegate(delegator.stkAaveVotingDelegate);
    previousDelegate.usersVotingRepresentedAmount =
      previousDelegate.usersVotingRepresentedAmount - 1;
    newDelegate.usersVotingRepresentedAmount = newDelegate.usersVotingRepresentedAmount + 1;
    delegator.stkAaveVotingDelegate = newDelegate.id;
    previousDelegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    previousDelegate.save();
  } else {
    let previousDelegate = getOrInitDelegate(delegator.stkAavePropositionDelegate);
    previousDelegate.usersPropositionRepresentedAmount =
      previousDelegate.usersPropositionRepresentedAmount - 1;
    newDelegate.usersPropositionRepresentedAmount =
      newDelegate.usersPropositionRepresentedAmount + 1;
    delegator.stkAavePropositionDelegate = newDelegate.id;
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

    delegate.stkAaveDelegatedVotingPowerRaw = amount;
    delegate.stkAaveDelegatedVotingPower = toDecimal(delegate.stkAaveDelegatedVotingPowerRaw);

    delegate.totalVotingPowerRaw = delegate.aaveDelegatedVotingPowerRaw.plus(
      delegate.stkAaveDelegatedVotingPowerRaw
    );
    delegate.totalVotingPower = toDecimal(delegate.totalVotingPowerRaw);
    delegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    delegate.save();
  } else {
    let delegate = getOrInitDelegate(event.params.user.toHexString());
    let amount = event.params.amount;

    delegate.stkAaveDelegatedPropositionPowerRaw = amount;
    delegate.stkAaveDelegatedPropositionPower = toDecimal(
      delegate.stkAaveDelegatedPropositionPowerRaw
    );

    delegate.totalPropositionPowerRaw = delegate.aaveDelegatedPropositionPowerRaw.plus(
      delegate.stkAaveDelegatedPropositionPowerRaw
    );
    delegate.totalPropositionPower = toDecimal(delegate.totalPropositionPowerRaw);
    delegate.lastUpdateTimestamp = event.block.timestamp.toI32();
    delegate.save();
  }
}
