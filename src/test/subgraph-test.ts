import kovanJson from '../../config/kovan.json';
import mainnetJson from '../../config/mainnet.json';
import governanceInterface from '../../externals/governance-v2/artifacts/contracts/governance/AaveGovernanceV2.sol/AaveGovernanceV2.json';
import aaveInterface from '../../externals/aave-token-v2/artifacts/contracts/token/AaveTokenV2.sol/AaveTokenV2.json';
import stkAaveInterface from '../../externals/stake/artifacts/contracts/stake/StakedTokenV3.sol/StakedTokenV3.json';
import { GET_DELEGATES } from './query';
import Web3 from 'web3';
import fetch from 'cross-fetch';
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client/core';

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
console.log(process.env.INFURA_KEY);
const kovanProvider = `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`;
const mainnetProvider = `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`;

const web3Kovan = new Web3(new Web3.providers.HttpProvider(kovanProvider));
const web3Mainnet = new Web3(new Web3.providers.HttpProvider(mainnetProvider));

const governanceAbi = governanceInterface.abi as any;
const aaveAbi = aaveInterface.abi as any;
const stakeAbi = stkAaveInterface.abi as any;

const kovanGovernance = new web3Kovan.eth.Contract(
  governanceAbi,
  kovanJson.aaveGovernanceV2Address
);
const kovanAaveToken = new web3Kovan.eth.Contract(aaveAbi, kovanJson.aaveTokenV2Address);
const kovanStkAaveToken = new web3Kovan.eth.Contract(aaveAbi, kovanJson.AaveStakeTokenAddress);

const mainnetGovernance = new web3Mainnet.eth.Contract(
  governanceAbi,
  mainnetJson.aaveGovernanceV2Address
);
const mainnetAaveToken = new web3Mainnet.eth.Contract(aaveAbi, mainnetJson.aaveTokenV2Address);
const mainnetStkAaveToken = new web3Mainnet.eth.Contract(
  stakeAbi,
  mainnetJson.AaveStakeTokenAddress
);

async function getBalance(network: string, token: string, address: string) {
  let result = 0;
  if (network === 'kovan') {
    if (token === 'aave') {
      result = await kovanAaveToken.methods.balanceOf(address).call();
      result = result / Math.pow(10, 18);
    } else {
      result = await kovanStkAaveToken.methods.balanceOf(address).call();
      result = result / Math.pow(10, 18);
    }
  } else {
    if (token === 'aave') {
      result = await mainnetAaveToken.methods.balanceOf(address).call();
      result = result / Math.pow(10, 18);
    } else {
      result = await mainnetStkAaveToken.methods.balanceOf(address).call();
      result = result / Math.pow(10, 18);
    }
  }
  return result;
}

async function getPower(network: string, type: string, address: string) {
  if (network === 'kovan') {
    if (type === 'vote') {
      const aaveVP = await kovanAaveToken.methods.getPowerCurrent(address, 0).call();
      const stkAaveVP = await kovanStkAaveToken.methods.getPowerCurrent(address, 0).call();
      const votingPower = aaveVP / Math.pow(10, 18) + stkAaveVP / Math.pow(10, 18);
      return votingPower;
    } else {
      const aavePP = await kovanAaveToken.methods.getPowerCurrent(address, 1).call();
      const stkAavePP = await kovanStkAaveToken.methods.getPowerCurrent(address, 1).call();
      const propositionPower = aavePP / Math.pow(10, 18) + stkAavePP / Math.pow(10, 18);
      return propositionPower;
    }
  } else {
    if (type === 'vote') {
      const aaveVP = await mainnetAaveToken.methods.getPowerCurrent(address, 0).call();
      const stkAaveVP = await mainnetStkAaveToken.methods.getPowerCurrent(address, 0).call();
      const votingPower = aaveVP / Math.pow(10, 18) + stkAaveVP / Math.pow(10, 18);
      return votingPower;
    } else {
      const aavePP = await mainnetAaveToken.methods.getPowerCurrent(address, 1).call();
      const stkAavePP = await mainnetStkAaveToken.methods.getPowerCurrent(address, 1).call();
      const propositonPower = aavePP / Math.pow(10, 18) + stkAavePP / Math.pow(10, 18);
      return propositonPower;
    }
  }
}

async function fetchDelegates(network: string) {
  let skip = 0;
  let delegates = [];
  let newResults = 1000;
  if (network === 'kovan') {
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

async function parseDelegates(delegates, network) {
  let aaveBalanceMatchCount = 0;
  let stkAaveBalanceMatchCount = 0;
  let votingPowerMatchCount = 0;
  let propositionPowerMatchCount = 0;
  await Promise.all(
    delegates.map(async delegate => {
      let aaveBalance = await getBalance(network, 'aave', delegate.id);
      let stkAaveBalance = await getBalance(network, 'stkaave', delegate.id);
      let votingPower = await getPower(network, 'vote', delegate.id);
      let propositionPower = await getPower(network, 'proposition', delegate.id);
      if (Math.abs(aaveBalance - delegate.aaveBalance) < 0.1) {
        aaveBalanceMatchCount += 1;
      }
      if (Math.abs(stkAaveBalance - delegate.stkAaveBalance) < 0.1) {
        stkAaveBalanceMatchCount += 1;
      }
      if (Math.abs(votingPower - delegate.totalVotingPower) < 0.1) {
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
      if (Math.abs(propositionPower - delegate.totalPropositionPower) < 0.1) {
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

async function testSubgraph(network: string) {
  if (network === 'kovan') {
    console.log('Testing Kovan\n');
    const delegates = await fetchDelegates('kovan');
    console.log('Delegates Found: ' + delegates.length + '\n');
    parseDelegates(delegates, 'kovan');
  } else if (network === 'mainnet') {
    console.log('Testing Mainnet\n');
    const delegates = await fetchDelegates('mainnet');
    console.log('Delegates Found: ' + delegates.length + '\n');
    parseDelegates(delegates, 'mainnet');
  } else {
    console.log('kovan and mainnet are the only supported networks');
    return;
  }
}

const network = process.argv[2];
testSubgraph(network);
