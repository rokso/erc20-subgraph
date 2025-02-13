# ERC20 Subgraph
ERC20 subgraph for Hemi mainnet. 
This subgraph is prepared with the help of code from [openzeppelin-subgraphs](https://github.com/OpenZeppelin/openzeppelin-subgraphs)

## Setup
Run `yarn install`

## Generate code from Graphql schema and ABI
Run `yarn codegen`


## Deploy
Follow deployment guide [here](https://thegraph.com/docs/en/subgraphs/developing/deploying/using-subgraph-studio/) to understand the process of deployment.

**Graph auth**
- Get the graph deploy key, follow steps [here](https://thegraph.com/docs/en/subgraphs/developing/deploying/using-subgraph-studio/#graph-auth).
- Run `yarn graph auth <Deploy Key>
  
**Deploy Subgraph**
- Run `yarn deploy`