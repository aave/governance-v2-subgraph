import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export const MOCK_ETHEREUM_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
export const MOCK_USD_ADDRESS = "0x10f7fc1f91ba351f9c629c5947ad69bd03c05b96";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const BIGINT_ZERO = BigInt.fromI32(0);
export const BIGINT_ONE = BigInt.fromI32(1);
export const BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export const BIGDECIMAL_ONE = new BigDecimal(BIGINT_ONE);

export const VOTING_POWER = 0;
export const PROPOSITION_POWER = 1;

export const PROPOSAL_STATUS_INITIALIZING = 'Initializing';
export const PROPOSAL_STATUS_VOTING = 'Voting';
export const PROPOSAL_STATUS_VALIDATING = 'Validating';
export const PROPOSAL_STATUS_EXECUTED = 'Executed';
export const YES_WINS = 'Yes';
export const NO_WINS = 'No';
export const ABSTAIN_WINS = 'Abstain';
export const NA = 'Na';

