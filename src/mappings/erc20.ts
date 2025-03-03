/**
 * This code is taken from
 * https://github.com/OpenZeppelin/openzeppelin-subgraphs/blob/main/src/datasources/erc20.ts
 * https://github.com/OpenZeppelin/openzeppelin-subgraphs/blob/main/src/fetch/erc20.ts
 * https://github.com/OpenZeppelin/openzeppelin-subgraphs/blob/main/src/fetch/account.ts
 */
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { constants, decimals, events, transactions } from '@amxx/graphprotocol-utils'
import { Account, ERC20Balance, ERC20Contract, ERC20Transfer } from '../../generated/schema'
import { ERC20, Transfer as TransferEvent } from '../../generated/ERC20/ERC20'

export function fetchAccount(address: Address): Account {
  const account = new Account(address)
  account.save()
  return account
}

export function fetchERC20(address: Address): ERC20Contract {
  let contract = ERC20Contract.load(address)

  if (!contract) {
    const endpoint = ERC20.bind(address)
    const name = endpoint.try_name()
    const symbol = endpoint.try_symbol()
    const decimals = endpoint.try_decimals()

    // Common
    contract = new ERC20Contract(address)
    contract.name = name.reverted ? null : name.value
    contract.symbol = symbol.reverted ? null : symbol.value
    contract.decimals = decimals.reverted ? BigInt.fromI32(18) : decimals.value
    contract.totalSupply = fetchERC20Balance(contract as ERC20Contract, null).id
    contract.asAccount = address
    contract.save()

    const account = fetchAccount(address)
    account.asERC20 = address
    account.save()
  }

  return contract as ERC20Contract
}

export function fetchERC20Balance(contract: ERC20Contract, account: Account | null): ERC20Balance {
  const id = contract.id
    .toHex()
    .concat('/')
    .concat(account ? account.id.toHex() : 'totalSupply')
  let balance = ERC20Balance.load(id)

  if (balance == null) {
    balance = new ERC20Balance(id)
    balance.contract = contract.id
    balance.account = account ? account.id : null
    balance.value = constants.BIGDECIMAL_ZERO
    balance.valueExact = constants.BIGINT_ZERO
    balance.save()
  }

  return balance as ERC20Balance
}

export function handleTransfer(event: TransferEvent): void {
  const contract = fetchERC20(event.address)
  const ev = new ERC20Transfer(events.id(event))
  ev.emitter = contract.id
  ev.transaction = transactions.log(event).id
  ev.timestamp = event.block.timestamp
  ev.contract = contract.id
  ev.value = decimals.toDecimals(event.params.value, contract.decimals.toI32())
  ev.valueExact = event.params.value

  // if `from` is zero then it is a transfer event due to mint()
  if (event.params.from == Address.zero()) {
    const totalSupply = fetchERC20Balance(contract, null)
    totalSupply.valueExact = totalSupply.valueExact.plus(event.params.value)
    totalSupply.value = decimals.toDecimals(totalSupply.valueExact, contract.decimals.toI32())
    totalSupply.save()
  } else {
    const from = fetchAccount(event.params.from)
    const balance = fetchERC20Balance(contract, from)
    balance.valueExact = balance.valueExact.minus(event.params.value)
    balance.value = decimals.toDecimals(balance.valueExact, contract.decimals.toI32())
    balance.save()

    ev.from = from.id
    ev.fromBalance = balance.id
  }

  // if `to` is zero then it is a transfer event due to burn()
  if (event.params.to == Address.zero()) {
    const totalSupply = fetchERC20Balance(contract, null)
    totalSupply.valueExact = totalSupply.valueExact.minus(event.params.value)
    totalSupply.value = decimals.toDecimals(totalSupply.valueExact, contract.decimals.toI32())
    totalSupply.save()
  } else {
    const to = fetchAccount(event.params.to)
    const balance = fetchERC20Balance(contract, to)
    balance.valueExact = balance.valueExact.plus(event.params.value)
    balance.value = decimals.toDecimals(balance.valueExact, contract.decimals.toI32())
    balance.save()

    ev.to = to.id
    ev.toBalance = balance.id
  }
  ev.save()
}
