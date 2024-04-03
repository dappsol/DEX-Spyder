import assert from 'assert';

import {
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  Percent,
  Token,
  Currency,
  CurrencyAmount,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  ENDPOINT as _ENDPOINT,
} from '@raydium-io/raydium-sdk';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  connection,
  DEFAULT_TOKEN,
  makeTxVersion,
  PROGRAMIDS,
} from './config';
import { formatAmmKeysById } from './formatAmmKeysById';
import {
  buildAndSendTx,
  getWalletTokenAccount,
} from './util';
import { BN } from 'bn.js';

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>

type TestTxInputInfo = {
  outputToken: Token
  targetPool: string
  inputTokenAmount: CurrencyAmount
  slippage: Percent
  walletTokenAccounts: WalletTokenAccounts
  wallet: Keypair
}

type TestTxInputInfo2 = {
  outputToken: Currency
  targetPool: string
  inputTokenAmount: TokenAmount
  slippage: Percent
  walletTokenAccounts: WalletTokenAccounts
  wallet: Keypair
}

export async function swapOnlyAmm(input: TestTxInputInfo, wallet: Keypair, isFirst: boolean) {
  // -------- pre-action: get pool info --------
  const targetPoolInfo = await formatAmmKeysById(input.targetPool)
  assert(targetPoolInfo, 'cannot find the target pool')
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
  console.log("poolkeys: don't need it ===> ", poolKeys)
  console.log("poolInfo: NEED it ===> ", await Liquidity.fetchInfo({ connection, poolKeys }))

  // -------- step 1: coumpute amount out --------
  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    amountIn: input.inputTokenAmount,
    currencyOut: input.outputToken,
    slippage: input.slippage,
  })

  // -------- step 2: create instructions by SDK function --------
  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: input.walletTokenAccounts,
      owner: input.wallet.publicKey,
    },
    amountIn: input.inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: 'in',
    makeTxVersion,
  })

  
  console.log('amountOut:', amountOut.toFixed(), '  minAmountOut: ', minAmountOut.toFixed())

  return { txids: await buildAndSendTx(innerTransactions, wallet) }
}


async function swapOnlyAmm2(input: TestTxInputInfo2, wallet: Keypair) {
  // -------- pre-action: get pool info --------
  const targetPoolInfo = await formatAmmKeysById(input.targetPool)
  assert(targetPoolInfo, 'cannot find the target pool')
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys

  // -------- step 1: coumpute amount out --------
  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    amountIn: input.inputTokenAmount,
    currencyOut: input.outputToken,
    slippage: input.slippage,
  })

  // -------- step 2: create instructions by SDK function --------
  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: input.walletTokenAccounts,
      owner: input.wallet.publicKey,
    },
    amountIn: input.inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: 'in',
    makeTxVersion,
  })
  


  console.log('amountOut:', amountOut.toFixed(), '  minAmountOut: ', minAmountOut.toFixed())

  return { txids: await buildAndSendTx(innerTransactions, wallet) }
}

export async function buyToken(outputTokenMint: string, ammId: string, decimal: number, amount: number, slippagePercent: number, wallet: Keypair, isFirst: boolean, addInfo: any) {
  const inputToken = DEFAULT_TOKEN.SOL // USDC
  const outputToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(outputTokenMint), decimal)
  const targetPool = ammId // USDC-RAY pool
  const inputTokenAmount = new CurrencyAmount(inputToken, new BN(amount * 10 ** 9))
  const slippage = new Percent(slippagePercent, 100)
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

  swapOnlyAmm({
    outputToken,
    targetPool,
    inputTokenAmount,
    slippage,
    walletTokenAccounts,
    wallet: wallet,
  }, wallet, isFirst
  ).then(({ txids }) => {
    /** continue with txids */
    console.log('txids', txids)
    addInfo({type: "success", text: "Successfully bought token"})
    addInfo({type: "info", text: `https://solscan.io/tx/${txids[0]}`})
  })
}

export async function sellToken(inputTokenMint: string, ammId: string, decimal: number, amount: number, slippagePercent: number, wallet: Keypair, addInfo:any) {
  const inputToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(inputTokenMint), decimal)
  const outputToken = DEFAULT_TOKEN.SOL // USDC
  const targetPool = ammId // USDC-RAY pool
  const inputTokenAmount = new TokenAmount(inputToken, new BN(amount * 10 ** decimal))
  const slippage = new Percent(slippagePercent, 100)
  const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

  swapOnlyAmm2({
    outputToken,
    targetPool,
    inputTokenAmount,
    slippage,
    walletTokenAccounts,
    wallet: wallet,
  }, wallet
  ).then(({ txids }) => {
    /** continue with txids */
    console.log('txids', txids)
    addInfo({type: "success", text: "Successfully Sold token"})
    addInfo({type: "info", text: `https://solscan.io/tx/${txids[0]}`})
  })
}

export const getPoolInfo = async (poolId: string) => {
  const targetPoolInfo = await formatAmmKeysById(poolId)
  console.log("🚀 ~ getPoolInfo ~ targetPoolInfo:", targetPoolInfo)
  assert(targetPoolInfo, 'cannot find the target pool')
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
  console.log("🚀 ~ getPoolInfo ~ poolKeys:", poolKeys)

  // -------- step 1: coumpute amount out --------
  const info = await Liquidity.fetchInfo({ connection, poolKeys })
  console.log("🚀 ~ getPoolInfo ~ connection:", connection)
  console.log("🚀 ~ getPoolInfo ~ info:", info)

  return info
}

export const getInfo = () => {

  const getPoolkeys = Liquidity.getAssociatedPoolKeys({
    version: 4,
    marketVersion: 3,
    marketId: new PublicKey("J6Yjwr1w1Q8fNHLFbTefH5Eq8cKDYQphTBDzzzeovGzj"),
    baseMint: new PublicKey('DwLoZNJN1CrpbD3ntAFo5YvHXKM4aoRy1bE31ZVTa3Ck'),
    quoteMint: new PublicKey('So11111111111111111111111111111111111111112'),
    baseDecimals: 9,
    quoteDecimals: 9,
    programId: PROGRAMIDS.AmmV4,
    marketProgramId: PROGRAMIDS.OPENBOOK_MARKET,
  })
  console.log("🚀 ~ getInfo ~ getPoolkeys:", getPoolkeys)

}