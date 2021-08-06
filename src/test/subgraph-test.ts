import kovanJson from '../../config/kovan.json';
import mainnetJson from '../../config/mainnet.json';
import { GET_DELEGATES } from './query';
import { utils, ethers, BigNumber } from 'ethers';
import fetch from 'cross-fetch';
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client/core';
import { AaveTokenV2__factory } from '../contracts/factories/AaveTokenV2__factory';
import { StakedTokenV3__factory } from '../contracts/factories/StakedTokenV3__factory';
import { Delegate } from '../../generated/schema';
require('dotenv').config();

const kovanClient = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.thegraph.com/subgraphs/name/aschmidt20/governance-v2-kovan',
    fetch,
  }),
  cache: new InMemoryCache(),
});

const mainnetClient = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.thegraph.com/subgraphs/name/aschmidt20/governance-v2-delegate',
    fetch,
  }),
  cache: new InMemoryCache(),
});

const kovanProvider = new ethers.providers.JsonRpcBatchProvider(
  `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`
);
const mainnetProvider = new ethers.providers.JsonRpcBatchProvider(
  `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`
);

const kovanAaveToken = AaveTokenV2__factory.connect(kovanJson.aaveTokenV2Address, kovanProvider);
const kovanStkAaveToken = StakedTokenV3__factory.connect(
  kovanJson.aaveStakeTokenAddress,
  kovanProvider
);

const mainnetAaveToken = AaveTokenV2__factory.connect(
  mainnetJson.aaveTokenV2Address,
  mainnetProvider
);
const mainnetStkAaveToken = StakedTokenV3__factory.connect(
  mainnetJson.aaveStakeTokenAddress,
  mainnetProvider
);

export enum Network {
  Kovan,
  Mainnet,
}

export enum Token {
  Aave,
  StkAave,
}

export enum PowerType {
  Vote,
  Proposition,
}

async function getBalance(network: Network, token: Token, address: string) {
  let result: BigNumber;
  if (network === Network.Kovan) {
    if (token === Token.Aave) {
      result = await kovanAaveToken.balanceOf(address);
    } else {
      result = await kovanStkAaveToken.balanceOf(address);
    }
  } else {
    if (token === Token.Aave) {
      result = await mainnetAaveToken.balanceOf(address);
    } else {
      result = await mainnetStkAaveToken.balanceOf(address);
    }
  }
  return Number(utils.formatEther(result));
}

async function getPower(network: Network, powerType: PowerType, address: string) {
  if (network === Network.Kovan) {
    if (powerType === PowerType.Vote) {
      const aaveVP = await kovanAaveToken.getPowerCurrent(address, 0);
      const stkAaveVP = await kovanStkAaveToken.getPowerCurrent(address, 0);
      const votingPower = aaveVP.add(stkAaveVP);
      return Number(utils.formatEther(votingPower));
    } else {
      const aavePP = await kovanAaveToken.getPowerCurrent(address, 1);
      const stkAavePP = await kovanStkAaveToken.getPowerCurrent(address, 1);
      const propositionPower = aavePP.add(stkAavePP);
      return Number(utils.formatEther(propositionPower));
    }
  } else {
    if (powerType === PowerType.Vote) {
      const aaveVP = await mainnetAaveToken.getPowerCurrent(address, 0);
      const stkAaveVP = await mainnetStkAaveToken.getPowerCurrent(address, 0);
      const votingPower = aaveVP.add(stkAaveVP);
      return Number(utils.formatEther(votingPower));
    } else {
      const aavePP = await mainnetAaveToken.getPowerCurrent(address, 1);
      const stkAavePP = await mainnetStkAaveToken.getPowerCurrent(address, 1);
      const propositonPower = aavePP.add(stkAavePP);
      return Number(utils.formatEther(propositonPower));
    }
  }
}

async function fetchDelegates(network: Network) {
  let skip = 0;
  let delegates = [];
  let newResults = 1000;
  if (network === Network.Kovan) {
    while (newResults === 1000 && skip < 4999) {
      let result = await kovanClient.query({
        query: GET_DELEGATES,
        variables: { first: 1000, skip },
      });
      delegates = delegates.concat(result.data.delegates);
      newResults = result.data.delegates.length;
      skip += 1000;
    }
    return delegates;
  } else {
    while (newResults === 1000 && skip < 4999) {
      let result = await mainnetClient.query({
        query: GET_DELEGATES,
        variables: { first: 1000, skip },
      });
      delegates = delegates.concat(result.data.delegates);
      newResults = result.data.delegates.length;
      skip += 1000;
    }
    return delegates;
  }
}

async function parseDelegates(delegates: Delegate[], network: Network) {
  let aaveBalanceMatchCount = 0;
  let stkAaveBalanceMatchCount = 0;
  let votingPowerMatchCount = 0;
  let propositionPowerMatchCount = 0;
  await Promise.all(
    delegates.map(async delegate => {
      const aaveBalance = await getBalance(network, Token.Aave, delegate.id);
      const stkAaveBalance = await getBalance(network, Token.StkAave, delegate.id);
      const votingPower = await getPower(network, PowerType.Vote, delegate.id);
      const propositionPower = await getPower(network, PowerType.Proposition, delegate.id);
      if (Math.abs(aaveBalance - Number(delegate.aaveBalance)) === 0) {
        aaveBalanceMatchCount += 1;
      }
      if (Math.abs(stkAaveBalance - Number(delegate.stkAaveBalance)) === 0) {
        stkAaveBalanceMatchCount += 1;
      }
      if (Math.abs(votingPower - Number(delegate.totalVotingPower)) === 0) {
        votingPowerMatchCount += 1;
      } else {
        console.log(
          'VOTING POWER ERROR WITH ' +
            delegate.id +
            ' SUBGRAPH: ' +
            delegate.totalVotingPower +
            ' : CONTRACT: ' +
            votingPower
        );
        console.log(
          'AAVE BALANCE: ' + delegate.aaveBalance + '  STKAAVE BALANCE: ' + delegate.stkAaveBalance
        );
      }
      if (Math.abs(propositionPower - Number(delegate.totalPropositionPower)) === 0) {
        propositionPowerMatchCount += 1;
      } else {
        console.log(
          'PROPOSITION POWER ERROR WITH ' +
            delegate.id +
            ' SUBGRAPH: ' +
            delegate.totalPropositionPower +
            ' : CONTRACT: ' +
            propositionPower
        );
        console.log(
          'AAVE BALANCE: ' +
            delegate.aaveBalance +
            '  STKAAVE BALANCE: ' +
            delegate.stkAaveBalance +
            '\n'
        );
      }
    })
  );
  console.log(
    'AAVE BALANCE: ' +
      aaveBalanceMatchCount +
      '/' +
      delegates.length +
      '  :  ' +
      (aaveBalanceMatchCount / delegates.length) * 100 +
      '%'
  );
  console.log(
    'STKAAVE BALANCE: ' +
      stkAaveBalanceMatchCount +
      '/' +
      delegates.length +
      '  :  ' +
      (stkAaveBalanceMatchCount / delegates.length) * 100 +
      '%'
  );
  console.log(
    'VOTING POWER: ' +
      votingPowerMatchCount +
      '/' +
      delegates.length +
      '  :  ' +
      (votingPowerMatchCount / delegates.length) * 100 +
      '%'
  );
  console.log(
    'PROPOSITION POWER: ' +
      propositionPowerMatchCount +
      '/' +
      delegates.length +
      '  :  ' +
      (propositionPowerMatchCount / delegates.length) * 100 +
      '%'
  );
  console.log('\n');
}

async function testSubgraph(network: Network) {
  if (network === Network.Kovan) {
    console.log('Testing Kovan\n');
    // Fetch delegates form subgraph
    const delegates = await fetchDelegates(network);
    console.log('Delegates Found: ' + delegates.length + '\n');
    parseDelegates(delegates, network);
  } else {
    console.log('Testing Mainnet\n');
    // Fetch delegates from subgraph
    const delegates = await fetchDelegates(network);
    console.log('Delegates Found: ' + delegates.length + '\n');
    parseDelegates(delegates, network);
  }
}

const input: string = process.argv[2];
if ((<any>Network)[input] !== undefined) {
  testSubgraph(Network[input]);
} else {
  console.log('Network must be one of {Kovan, Mainnet}');
}
