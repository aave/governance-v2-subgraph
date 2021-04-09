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

    fromHolder.save();
  }

  // toHolder
  toHolder.aaveBalanceRaw = toHolder.aaveBalanceRaw.plus(event.params.value);
  toHolder.aaveBalance = toDecimal(toHolder.aaveBalanceRaw);


  // create voting and proposition delegates if not set yet, as in aave, a tokenholder is its own delegate by default
  if (toHolder.votingDelegate == null) {
    let newDelegate = getOrInitDelegate(event.params.to.toHexString());
    newDelegate.aaveDelegatedVotingPowerRaw = newDelegate.aaveDelegatedVotingPowerRaw.plus(toHolder.aaveBalanceRaw);
    newDelegate.aaveDelegatedVotingPower = newDelegate.aaveDelegatedVotingPower.plus(toHolder.aaveBalance);
    newDelegate.totalVotingPowerRaw = newDelegate.aaveDelegatedVotingPowerRaw.plus(newDelegate.stkAaveDelegatedVotingPowerRaw);
    newDelegate.totalVotingPower = newDelegate.aaveDelegatedVotingPower.plus(newDelegate.stkAaveDelegatedVotingPower);
    newDelegate.usersVotingRepresentedAmount = newDelegate.usersVotingRepresentedAmount + 1;
    toHolder.votingDelegate = newDelegate.id;
  }
  if (toHolder.propositionDelegate == null) {
    let newDelegate = getOrInitDelegate(event.params.to.toHexString());
    newDelegate.aaveDelegatedPropositionPowerRaw = newDelegate.aaveDelegatedPropositionPowerRaw.plus(toHolder.aaveBalanceRaw);
    newDelegate.aaveDelegatedPropositionPower = newDelegate.aaveDelegatedPropositionPower.plus(toHolder.aaveBalance);
    newDelegate.totalPropositionPowerRaw = newDelegate.aaveDelegatedPropositionPowerRaw.plus(newDelegate.stkAaveDelegatedPropositionPowerRaw);
    newDelegate.totalPropositionPower = newDelegate.aaveDelegatedPropositionPower.plus(newDelegate.stkAaveDelegatedPropositionPower);
    newDelegate.usersPropositionRepresentedAmount = newDelegate.usersPropositionRepresentedAmount + 1;
    toHolder.propositionDelegate = newDelegate.id;
  }

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
    previousDelegate.save()
  } else {
    let previousDelegate = getOrInitDelegate(delegator.propositionDelegate);
    previousDelegate.usersPropositionRepresentedAmount = previousDelegate.usersPropositionRepresentedAmount - 1
    newDelegate.usersPropositionRepresentedAmount = newDelegate.usersPropositionRepresentedAmount + 1
    delegator.propositionDelegate = newDelegate.id
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
    delegate.save();

  } else {
    let delegate = getOrInitDelegate(event.params.user.toHexString());
    let amount = event.params.amount;

    delegate.aaveDelegatedPropositionPowerRaw = amount;
    delegate.aaveDelegatedPropositionPower = toDecimal(amount);
    delegate.save();
  }
}
