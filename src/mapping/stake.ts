import {
  getOrInitDelegate
} from "../helpers/initializers";
import {
  BIGINT_ONE,
  BIGINT_ZERO,
  VOTING_POWER,
  ZERO_ADDRESS,
} from "../utils/constants";
import { toDecimal } from "../utils/converters";
import {
  DelegateChanged,
  DelegatedPowerChanged,
  Transfer,
} from "../../generated/AaveStakeToken/StakedTokenV2";
import { Delegate } from "../../generated/schema";
import { log, BigInt } from "@graphprotocol/graph-ts";

export function handleTransfer(event: Transfer): void {
  let fromHolder = getOrInitDelegate(event.params.from.toHexString());
  let toHolder = getOrInitDelegate(event.params.to.toHexString());

  // fromHolder
  if (event.params.from.toHexString() != ZERO_ADDRESS) {
    fromHolder.stkAaveBalanceRaw = fromHolder.stkAaveBalanceRaw.minus(
      event.params.value
    );
    fromHolder.stkAaveBalance = toDecimal(fromHolder.stkAaveBalanceRaw);

    if (fromHolder.stkAaveBalanceRaw < BIGINT_ZERO) {
      log.error("Negative balance on holder {} with balance {}", [
        fromHolder.id,
        fromHolder.stkAaveBalanceRaw.toString(),
      ]);
    }

    fromHolder.save();
  }

  // toHolder
  toHolder.stkAaveBalanceRaw = toHolder.stkAaveBalanceRaw.plus(event.params.value);
  toHolder.stkAaveBalance = toDecimal(toHolder.stkAaveBalanceRaw);

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
    delegate.totalVotingPowerRaw = delegate.stkAaveDelegatedVotingPowerRaw.plus(delegate.aaveDelegatedVotingPowerRaw)
    delegate.totalVotingPower = toDecimal(delegate.totalVotingPowerRaw)
    delegate.save();
  } else {
    let delegate = getOrInitDelegate(event.params.user.toHexString());
    let amount = event.params.amount;

    delegate.aaveDelegatedPropositionPowerRaw = amount;
    delegate.aaveDelegatedPropositionPower = toDecimal(amount);
    delegate.totalPropositionPowerRaw = delegate.stkAaveDelegatedPropositionPowerRaw.plus(delegate.aaveDelegatedPropositionPowerRaw)
    delegate.totalPropositionPower = toDecimal(delegate.totalPropositionPowerRaw)
    delegate.save();
  }
}
