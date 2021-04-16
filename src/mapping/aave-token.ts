import { log } from "@graphprotocol/graph-ts";
import {
  DelegateChanged,
  DelegatedPowerChanged,
  Transfer,
} from "../../generated/AaveTokenV2/AaveTokenV2";
import {
  getOrInitDelegate,
} from "../helpers/initializers";
import {
  BIGINT_ZERO,
  VOTING_POWER,
  ZERO_ADDRESS,
} from "../utils/constants";

import { toDecimal } from "../utils/converters";

export function handleTransfer(event: Transfer): void {
  let fromHolder = getOrInitDelegate(event.params.from.toHexString());
  let toHolder = getOrInitDelegate(event.params.to.toHexString());

  // fromHolder
  if (event.params.from.toHexString() != ZERO_ADDRESS) {
    fromHolder.aaveBalanceRaw = fromHolder.aaveBalanceRaw.minus(
      event.params.value
    );
    fromHolder.aaveBalance = toDecimal(fromHolder.aaveBalanceRaw);

    if (fromHolder.aaveBalanceRaw < BIGINT_ZERO) {
      log.error("Negative balance on holder {} with balance {}", [
        fromHolder.id,
        fromHolder.aaveBalanceRaw.toString(),
      ]);
    }

    fromHolder.totalVotingPowerRaw = fromHolder.aaveBalanceRaw.plus(fromHolder.stkAaveBalanceRaw).plus(fromHolder.aaveDelegatedVotingPowerRaw).plus(fromHolder.stkAaveDelegatedVotingPowerRaw)
    fromHolder.totalVotingPower = toDecimal(fromHolder.totalVotingPowerRaw)
    fromHolder.totalPropositionPowerRaw = fromHolder.aaveBalanceRaw.plus(fromHolder.stkAaveBalanceRaw).plus(fromHolder.aaveDelegatedPropositionPowerRaw).plus(fromHolder.stkAaveDelegatedPropositionPowerRaw)
    fromHolder.totalPropositionPower = toDecimal(fromHolder.totalPropositionPowerRaw)
    fromHolder.save();
  }

  // toHolder
  toHolder.aaveBalanceRaw = toHolder.aaveBalanceRaw.plus(event.params.value);
  toHolder.aaveBalance = toDecimal(toHolder.aaveBalanceRaw);


  toHolder.totalVotingPowerRaw = toHolder.aaveBalanceRaw.plus(toHolder.stkAaveBalanceRaw).plus(toHolder.aaveDelegatedVotingPowerRaw).plus(toHolder.stkAaveDelegatedVotingPowerRaw)
  toHolder.totalVotingPower = toDecimal(toHolder.totalVotingPowerRaw)
  toHolder.totalPropositionPowerRaw = toHolder.aaveBalanceRaw.plus(toHolder.stkAaveBalanceRaw).plus(toHolder.aaveDelegatedPropositionPowerRaw).plus(toHolder.stkAaveDelegatedPropositionPowerRaw)
  toHolder.totalPropositionPower = toDecimal(toHolder.totalPropositionPowerRaw)
  toHolder.save();
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let delegator = getOrInitDelegate(
    event.params.delegator.toHexString()
  );
  let newDelegate = getOrInitDelegate(event.params.delegatee.toHexString());
  if(event.params.delegationType == VOTING_POWER){
    let previousDelegate = getOrInitDelegate(delegator.votingDelegate);
    previousDelegate.usersVotingRepresentedAmount = previousDelegate.usersVotingRepresentedAmount - 1
    newDelegate.usersVotingRepresentedAmount = newDelegate.usersVotingRepresentedAmount + 1
    delegator.votingDelegate = newDelegate.id
    if(previousDelegate.id === delegator.id){
      delegator.explicitSelfDelegateVoting = false
    }
    if(newDelegate.id === delegator.id){
      delegator.explicitSelfDelegateVoting = true;
    }
    previousDelegate.save()
  } else {
    let previousDelegate = getOrInitDelegate(delegator.propositionDelegate);
    previousDelegate.usersPropositionRepresentedAmount = previousDelegate.usersPropositionRepresentedAmount - 1
    newDelegate.usersPropositionRepresentedAmount = newDelegate.usersPropositionRepresentedAmount + 1
    delegator.propositionDelegate = newDelegate.id
    previousDelegate.save()
    if(previousDelegate.id === delegator.id){
      delegator.explicitSelfDelegateProposing = false
    }
    if(newDelegate.id === delegator.id){
      delegator.explicitSelfDelegateProposing = true;
    }
    previousDelegate.save()
  }

  delegator.save();
  newDelegate.save();
}

export function handleDelegatedPowerChanged(
  event: DelegatedPowerChanged
): void {
  if (event.params.delegationType == VOTING_POWER) {
    let delegate = getOrInitDelegate(event.params.user.toHexString());
    let amount = event.params.amount;

    delegate.aaveDelegatedVotingPowerRaw = amount;
    delegate.aaveDelegatedVotingPower = toDecimal(amount);

    let votingDelegate = getOrInitDelegate(delegate.votingDelegate)
    if(delegate.id === votingDelegate.id){
      if(delegate.explicitSelfDelegateVoting){
        delegate.aaveDelegatedVotingPowerRaw = delegate.aaveDelegatedVotingPowerRaw.minus(delegate.aaveBalanceRaw)
        delegate.aaveDelegatedVotingPower = toDecimal(delegate.aaveDelegatedVotingPowerRaw)
      }
      delegate.totalVotingPowerRaw = delegate.aaveBalanceRaw.plus(delegate.stkAaveBalanceRaw).plus(delegate.aaveDelegatedVotingPowerRaw).plus(delegate.stkAaveDelegatedVotingPowerRaw)
      delegate.totalVotingPower = toDecimal(delegate.totalVotingPowerRaw)
    }
    else{
      delegate.totalVotingPowerRaw = delegate.aaveDelegatedVotingPowerRaw.plus(delegate.stkAaveDelegatedVotingPowerRaw)
      delegate.totalVotingPower = toDecimal(delegate.totalVotingPowerRaw)
    }

    delegate.save();

  } else {
    let delegate = getOrInitDelegate(event.params.user.toHexString());
    let amount = event.params.amount;

    delegate.aaveDelegatedPropositionPowerRaw = amount;
    delegate.aaveDelegatedPropositionPower = toDecimal(amount);

    let propositionDelegate = getOrInitDelegate(delegate.propositionDelegate)
    if(delegate.id === propositionDelegate.id){
      if(delegate.explicitSelfDelegateProposing){
        delegate.aaveDelegatedPropositionPowerRaw = delegate.aaveDelegatedPropositionPowerRaw.minus(delegate.aaveBalanceRaw)
        delegate.aaveDelegatedPropositionPower = toDecimal(delegate.aaveDelegatedPropositionPowerRaw)
      }
      delegate.totalPropositionPowerRaw = delegate.aaveBalanceRaw.plus(delegate.stkAaveBalanceRaw).plus(delegate.aaveDelegatedPropositionPowerRaw).plus(delegate.stkAaveDelegatedPropositionPowerRaw)
      delegate.totalPropositionPower = toDecimal(delegate.totalPropositionPowerRaw)
    }
    else{
      delegate.totalPropositionPowerRaw = delegate.aaveDelegatedPropositionPowerRaw.plus(delegate.stkAaveDelegatedPropositionPowerRaw)
      delegate.totalPropositionPower = toDecimal(delegate.totalPropositionPowerRaw)
    }

    delegate.save();
  }
}
