import { gql } from '@apollo/client/core';

export const GET_DELEGATES = gql`
  query GetDelegates($first: Int!, $skip: Int!) {
    delegates(first: $first, skip: $skip) {
      id
      aaveBalance
      stkAaveBalance
      totalVotingPower
      totalPropositionPower
    }
  }
`;
