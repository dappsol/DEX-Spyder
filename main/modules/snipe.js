import { buyToken } from 'main/amm/swapOnlyAmm';
import PoolKeys from './getPool';

const {
  MAINNET_PROGRAM_ID,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  SPL_ACCOUNT_LAYOUT,
  LiquidityStateV4,
  LiquidityPoolKeys,
  Liquidity,
  Market,
  TokenAccount,
  publicKey,
  struct,
  LiquidityPoolKeysV4,
  findProgramAddress,
  TokenAmount,
  parseBigNumberish,
  Token,
  Percent,
  Currency,
  simulateTransaction,
} = require('@raydium-io/raydium-sdk');
const { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const {
  Keypair,
  Commitment,
  Connection,
  PublicKey,
  ComputeBudgetProgram,
  KeyedAccountInfo,
  TransactionMessage,
  VersionedTransaction,
  Transaction,
} = require('@solana/web3.js');
const base58 = require('bs58');

const config = require("../../config.json")

const network = 'mainnet-beta';

const Info = {
  error: "error",
  info: "info",
  success: "success",
  warning: "warning",
  normal: "normal"
}

const pools = []

const SOL = new PublicKey(
  'So11111111111111111111111111111111111111112'
);

const RAYDIUM_LIQUIDITY_PROGRAM_ID_V4 = MAINNET_PROGRAM_ID.AmmV4;
const OPENBOOK_PROGRAM_ID = MAINNET_PROGRAM_ID.OPENBOOK_MARKET;


let existingLiquidityPools = new Set();
let existingOpenBookMarkets = new Set();
let existingTokenAccounts = new Map();

let wallet
let quoteTokenAddress
const retry = async (fn, { retries, retryIntervalMs }) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await sleep(retryIntervalMs);
    return retry(fn, { retries: retries - 1, retryIntervalMs });
  }
};


const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
async function getAllAccountsV4(connection) {
  const { span } = LIQUIDITY_STATE_LAYOUT_V4;
  const accounts = await connection.getProgramAccounts(
    RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
    {
      dataSlice: { offset: 0, length: 0 },
      commitment: 'confirmed',
      filters: [
        { dataSize: span },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
            bytes: SOL.toBase58(),
          },
        },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId'),
            bytes: OPENBOOK_PROGRAM_ID.toBase58(),
          },
        },
      ],
    },
  );

  return accounts.map(
    (info) => ({
      id: info.pubkey,
      version: 4,
      programId: RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
    })
  );
}

async function getAccountPoolKeysFromAccountDataV4(connection, id, accountData, commitment) {
  const marketInfo = await connection.getAccountInfo(accountData.marketId, {
    commitment: commitment || 'confirmed',
    dataSlice: {
      offset: 253, // eventQueue
      length: 32 * 3,
    },
  });
  const MINIMAL_MARKET_STATE_LAYOUT_V3 = struct([
    publicKey('eventQueue'),
    publicKey('bids'),
    publicKey('asks'),
  ]);
  const minimalMarketData = MINIMAL_MARKET_STATE_LAYOUT_V3.decode(
    marketInfo.data
  );

  return {
    id,
    baseMint: accountData.baseMint,
    quoteMint: accountData.quoteMint,
    lpMint: accountData.lpMint,
    baseDecimals: accountData.baseDecimal.toNumber(),
    quoteDecimals: accountData.quoteDecimal.toNumber(),
    lpDecimals: 5,
    version: 4,
    programId: RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
    authority: Liquidity.getAssociatedAuthority({
      programId: RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
    }).publicKey,
    openOrders: accountData.openOrders,
    targetOrders: accountData.targetOrders,
    baseVault: accountData.baseVault,
    quoteVault: accountData.quoteVault,
    marketVersion: 3,
    marketProgramId: accountData.marketProgramId,
    marketId: accountData.marketId,
    marketAuthority: Market.getAssociatedAuthority({
      programId: accountData.marketProgramId,
      marketId: accountData.marketId,
    }).publicKey,
    marketBaseVault: accountData.baseVault,
    marketQuoteVault: accountData.quoteVault,
    marketBids: minimalMarketData.bids,
    marketAsks: minimalMarketData.asks,
    marketEventQueue: minimalMarketData.eventQueue,
    withdrawQueue: accountData.withdrawQueue,
    lpVault: accountData.lpVault,
    lookupTableAccount: PublicKey.default,
  };
}
async function getTokenAccounts(connection, owner) {
  const tokenResp = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });

  const accounts = [];
  for (const { pubkey, account } of tokenResp.value) {
    accounts.push({
      pubkey,
      programId: account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
    });
  }

  return accounts;
}

async function getAllMarketsV3(connection) {
  const { span } = MARKET_STATE_LAYOUT_V3;
  const accounts = await connection.getProgramAccounts(OPENBOOK_PROGRAM_ID, {
    dataSlice: { offset: 0, length: 0 },
    commitment: 'confirmed',
    filters: [
      { dataSize: span },
      {
        memcmp: {
          offset: MARKET_STATE_LAYOUT_V3.offsetOf('quoteMint'),
          bytes: SOL.toBase58(),
        },
      },
    ],
  });

  return accounts.map(info => ({
    id: info.pubkey,
    programId: OPENBOOK_PROGRAM_ID,
  }));
}
async function init(solanaConnection, owner, addInfo) {
  wallet = Keypair.fromSecretKey(base58.decode(owner));
  console.log(`Wallet Address: ${wallet.publicKey.toString()}`);
  addInfo({ type: Info.warning, text: `Wallet address: ${wallet.publicKey.toBase58()}` })
  const allLiquidityPools = await getAllAccountsV4(solanaConnection);
  existingLiquidityPools = new Set(allLiquidityPools.map(p => p.id.toString()));
  const allMarkets = await getAllMarketsV3(solanaConnection);
  existingOpenBookMarkets = new Set(allMarkets.map(p => p.id.toString()));
  const tokenAccounts = await getTokenAccounts(solanaConnection, wallet.publicKey);
  addInfo({ type: Info.success, text: `Total markets ${existingOpenBookMarkets.size}` })
  addInfo({ type: Info.success, text: `Total Pools ${existingOpenBookMarkets.size}` })
  console.log(`Total USDC markets ${existingOpenBookMarkets.size}`);
  console.log(`Total USDC pools ${existingLiquidityPools.size}`);
  tokenAccounts.forEach(ta => {
    existingTokenAccounts.set(ta.accountInfo.mint.toString(), {
      mint: ta.accountInfo.mint,
      address: ta.pubkey
    });
  });
  const token = tokenAccounts.find(acc => acc.accountInfo.mint.toString() === SOL.toString());
  if (!token) {
    console.log("No USDC in wallet")
    console.log("Please send some USDC to this wallet and restart the sniper.")
    return
  }
  quoteTokenAddress = token.pubkey;
}

async function processRaydiumPool(updatedAccountInfo, owner, solanaConnection, buyAmount, addInfo, connection) {
  const userKp = Keypair.fromSecretKey(base58.decode(owner));
  addInfo({ type: Info.normal, text: `New pool created. PoolId: ${updatedAccountInfo.accountId.toBase58()}` })
  let accountData;
  try {
    accountData = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
    console.log("🚀 ~ processRaydiumPool ~ accountData:", accountData)
    const bal = await connection.getBalance(userKp.publicKey)
    if (bal < buyAmount) {
      addInfo({ type: Info.error, text: "Insufficient balance in wallet" })
      return
    }
    const poolkeys = await PoolKeys.fetchPoolKeyInfo(accountData.baseMint, new PublicKey('So11111111111111111111111111111111111111112'))
    console.log("🚀 ~ processRaydiumPool ~ poolkeys:", poolkeys)
    await buy(updatedAccountInfo.accountId, accountData, userKp, solanaConnection, buyAmount, addInfo);
    // await buyToken(accountData.baseMint.toString(), poolkeys.id.toBase58(), accountData.baseDecimal, buyAmount, 100, userKp, false, addInfo)

    console.log("buy action")
  } catch (e) {
    console.log({ ...accountData, error: e }, `Failed to process pool`, e);
  }
}

async function processOpenBookMarket(updatedAccountInfo, solanaConnection) {
  let accountData;
  try {
    accountData = MARKET_STATE_LAYOUT_V3.decode(updatedAccountInfo.accountInfo.data);
    if (existingTokenAccounts.has(accountData.baseMint.toString())) {
      return;
    }
    const destinationAccount = await getOrCreateAssociatedTokenAccount(solanaConnection, wallet, accountData.baseMint, wallet.publicKey);
    existingTokenAccounts.set(accountData.baseMint.toString(), {
      address: destinationAccount.address,
      mint: destinationAccount.mint
    });
    console.log(accountData, `Created destination account: ${destinationAccount.address}`);
  } catch (e) {
    console.log({ ...accountData, error: e }, `Failed to process market`);
  }
}
async function buy(accountId, accountData, userKp, solanaConnection, buyAmount, addInfo) {
  const [poolKeys, latestBlockhash] = await Promise.all([
    getAccountPoolKeysFromAccountDataV4(solanaConnection, accountId, accountData),
    solanaConnection.getLatestBlockhash({ commitment: 'confirmed' }),
  ]);
  let tokenAccountOut
  if (!existingTokenAccounts.get(poolKeys.baseMint.toString()))
    tokenAccountOut = await getOrCreateAssociatedTokenAccount(solanaConnection, userKp, accountData.baseMint, userKp.publicKey);
  else 
  tokenAccountOut = existingTokenAccounts.get(poolKeys.baseMint.toString())
  const { innerTransaction, address } = Liquidity.makeSwapFixedInInstruction({
    poolKeys,
    userKeys: {
      tokenAccountIn: quoteTokenAddress,
      tokenAccountOut: tokenAccountOut.address,
      owner: userKp.publicKey,
    },
    amountIn: buyAmount * 1000000,
    minAmountOut: 0,
  }, poolKeys.version);
  console.log("🚀 ~ buy ~ innerTransaction:", innerTransaction)
  const tx = new Transaction()
  innerTransaction.instructions.map(ix => tx.add(ix))
  tx.blockhash = (await solanaConnection.getLatestBlockhash('confirmed')).blockhash
  tx.feePayer = userKp.publicKey
  console.log("============>", await simulateTransaction(solanaConnection, [tx]))
  const messageV0 = new TransactionMessage({
    payerKey: userKp.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 30000 }),
      ...innerTransaction.instructions,
    ],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([wallet, ...innerTransaction.signers]);
  const rawTransaction = transaction.serialize();
  const signature = await retry(() => solanaConnection.sendRawTransaction(rawTransaction, { skipPreflight: true }), { retryIntervalMs: 10, retries: 50 });

  if (signature) {
    addInfo({ type: "success", text: "Successfully bought from new pool" })
    pools.push(poolKeys);
  }

  console.log({
    ...accountData,
    url: `https://solscan.io/tx/${signature}?cluster=${network}`,
  }, 'Buy');
}

// runListener function default export
export default async (solanaConnection, owner, buyAmount, percentToSell, addInfo, isSniping, onePoolOnly = undefined) => {
  addInfo({ type: Info.normal, text: "Initializing..." })
  console.log(onePoolOnly ? "\n\tWaiting for a pool to be created" : "\n\tSniping SOL pools")
  await init(solanaConnection, owner, addInfo);
  const raydiumSubscriptionId = solanaConnection.onProgramAccountChange(RAYDIUM_LIQUIDITY_PROGRAM_ID_V4, async (updatedAccountInfo) => {
    const existing = existingLiquidityPools.has(updatedAccountInfo.accountId.toString());

    if (!existing) {
      existingLiquidityPools.add(updatedAccountInfo.accountId.toString());
      const _ = await processRaydiumPool(updatedAccountInfo, owner, solanaConnection, buyAmount, addInfo, solanaConnection);
    }
  }, 'confirmed', [
    { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
    { memcmp: { offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'), bytes: SOL.toBase58() } },
    { memcmp: { offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId'), bytes: OPENBOOK_PROGRAM_ID.toBase58() } }
  ]);

  const openBookSubscriptionId = solanaConnection.onProgramAccountChange(OPENBOOK_PROGRAM_ID, async (updatedAccountInfo) => {
    const existing = existingOpenBookMarkets.has(updatedAccountInfo.accountId.toString());

    if (!existing) {
      existingOpenBookMarkets.add(updatedAccountInfo.accountId.toString());
      const _ = await processOpenBookMarket(updatedAccountInfo, solanaConnection);
    }
  }, 'confirmed', [
    { dataSize: MARKET_STATE_LAYOUT_V3.span },
    { memcmp: { offset: MARKET_STATE_LAYOUT_V3.offsetOf('quoteMint'), bytes: SOL.toBase58() } }
  ]);

  console.log(`Listening for raydium changes: ${raydiumSubscriptionId}`);
  console.log(`Listening for open book changes: ${openBookSubscriptionId}`);

  const a = setInterval(() => {
    // if (pools.length) {
    //   for (let i = 0; i < pools.length; i++) {
    //     const poolKeys = pools[i];
    //     sell(solanaConnection, poolKeys, buyAmount * percentToSell);
    //   }
    // }
    if (isSniping[0] == false) return true
  }, 10000);
  if (a == true) return
};


async function getBalance(connection, mint) {
  const { publicKey, nonce } = findProgramAddress(
    [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
  );
  let tokenBalance = await connection.getTokenAccountBalance(
    publicKey
  );
  console.log("🚀 ~  tokenBalance:", tokenBalance.value.amount)
  return tokenBalance.value.amount
}

export async function sell(poolKeys, amount, sellWhenhigherThan, addInfo) {
  const connection = new Connection(config.rpc_endpoint)
  const tokenIn = existingTokenAccounts.get(
    poolKeys.baseMint.toString(),
  )
  if (!tokenIn) {
    console.log("No token in wallet")
    return
  }
  const tokenBalance = Number(await getBalance(connection, poolKeys.baseMint))
  if (tokenBalance < amount) {
    addInfo({ type: Info.error, text: "Token balance is not enough" })
  }
  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    amountIn: new TokenAmount(new Token(TOKEN_PROGRAM_ID, poolKeys.baseMint, poolKeys.baseDecimals), parseBigNumberish(amount)),
    currencyOut: new Currency(9, 'USDC', 'USDC'),
    slippage: new Percent(100, 100),
  });
  const profit = amountOut.raw.toNumber() / 10 ** 9
  if (profit < sellWhenhigherThan)
    return
  console.log("Profit reached the standard, token will be sold: ", poolKeys.baseMint.toBase58())
  const { innerTransaction, address } = Liquidity.makeSwapFixedInInstruction(
    {
      poolKeys,
      userKeys: {
        tokenAccountIn: tokenIn.address,
        tokenAccountOut: SOL,
        owner: wallet.publicKey,
      },
      amountIn: tokenBalance,
      minAmountOut: 0,
    },
    poolKeys.version,
  );
  const blockhash = (await connection.getLatestBlockhash()).blockhash
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 30000 }),
      ...innerTransaction.instructions,
    ],
  }).compileToV0Message();
  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([wallet, ...innerTransaction.signers]);
  const rawTransaction = transaction.serialize();
  const signature = await retry(
    () =>
      connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
      }),
    { retryIntervalMs: 10, retries: 50 }, // TODO handle retries more efficiently
  );
  if (signature) {
    addInfo({ type: "success", text: "Successfully sold token" })
    pools.push(poolKeys)
  }
  console.log(`Visit https://solscan.io/tx/${signature}`);
}



