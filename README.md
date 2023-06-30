# Subgraph for Aave Protocol V2

https://thegraph.com/hosted-service/subgraph/aave/governance-delegation

## Development

```bash
# copy env and adjust its content
cp .env.test .env
# fetch current contracts as submodule
npm run prepare:all
# run codegen
npm run subgraph:codegen
# now you're able to deploy to thegraph via
npm run deploy:hosted:mainnet

```

## Deployment

To be able to deploy the subgraph in any environment for any network first we will need to prepare the local env:

- get the governance v2 contracts and compile them

```
npm run prepare:contracts
```


### Hosted

To be able to deploy to the hosted solution you will need to create a .env file and add `ACCESS_TOKEN` environment variable. You can find this in the dashboard of the TheGraph

```
// For Kovan:
npm run deploy:hosted:kovan

// For Mainnet:
npm run deploy:hosted:mainnet
```
