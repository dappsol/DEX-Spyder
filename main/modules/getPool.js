var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { Connection, PublicKey } = require("@solana/web3.js");
// const fs_1 = __importDefault(require("fs"));
const config = require('../../config.json')
const get_keypair_1 = require("./get_keypair");
const { Liquidity, MARKET_STATE_LAYOUT_V3, Market, Token, TOKEN_PROGRAM_ID, Percent, TokenAmount, ASSOCIATED_TOKEN_PROGRAM_ID } = require("@raydium-io/raydium-sdk");
const { getAssociatedTokenAddress } = require("@solana/spl-token");
const { BN } = require("bn.js");
// var config_txt = fs_1.default.readFileSync('config.json', 'utf8');
// var config_obj = JSON.parse(config_txt);
const config_obj = require('../../config.json')
const connection = new Connection(config_obj.rpc_endpoint);
const owner = (0, get_keypair_1.get_wallet)('config.json');

class PoolKeys {
  static SOLANA_ADDRESS = 'So11111111111111111111111111111111111111112'
  static RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
  static OPENBOOK_ADDRESS = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';
  static SOL_DECIMALS = 9

  static async fetchMarketId(connection, baseMint, quoteMint, commitment) {
    const accounts = await connection.getProgramAccounts(
      new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
      {
        commitment,
        filters: [
          { dataSize: MARKET_STATE_LAYOUT_V3.span },
          {
            memcmp: {
              offset: MARKET_STATE_LAYOUT_V3.offsetOf("baseMint"),
              bytes: baseMint.toBase58(),
            },
          },
          {
            memcmp: {
              offset: MARKET_STATE_LAYOUT_V3.offsetOf("quoteMint"),
              bytes: quoteMint.toBase58(),
            },
          },
        ],
      }
    );
    if (accounts.length == 0)
      return null
    return accounts.map(({ account }) => MARKET_STATE_LAYOUT_V3.decode(account.data))[0].ownAddress
  }

  static async fetchMarketInfo(marketId) {
    const marketAccountInfo = await connection.getAccountInfo(marketId);
    if (!marketAccountInfo) {
      throw new Error('Failed to fetch market info for market id ' + marketId.toBase58());
    }

    return MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
  }

  static async generateV4PoolInfo(baseMint, baseDecimals, quoteMint, marketID) {
    const poolInfo = Liquidity.getAssociatedPoolKeys({
      version: 4,
      marketVersion: 3,
      baseMint: baseMint,
      quoteMint: quoteMint,
      baseDecimals: 0,
      quoteDecimals: this.SOL_DECIMALS,
      programId: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
      marketId: marketID,
      marketProgramId: new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
    });

    return { poolInfo }
  }

  static async fetchPoolKeyInfo(baseMint, quoteMint) {
    const marketId = await this.fetchMarketId(connection, baseMint, quoteMint, 'finalized')
    console.log("🚀 ~ PoolKeys ~ fetchPoolKeyInfo ~ marketId:", marketId)
    if (!marketId) return null
    const marketInfo = await this.fetchMarketInfo(marketId);
    const baseMintInfo = await connection.getParsedAccountInfo(baseMint);
    const baseDecimals = baseMintInfo.value.data.parsed.info.decimals

    const V4PoolInfo = await this.generateV4PoolInfo(baseMint, baseDecimals, quoteMint, marketId)
    const lpMintInfo = await connection.getParsedAccountInfo(V4PoolInfo.poolInfo.lpMint);

    const result = {
      id: V4PoolInfo.poolInfo.id,
      marketId: marketId,
      baseMint: baseMint,
      quoteMint: quoteMint,
      baseVault: V4PoolInfo.poolInfo.baseVault,
      quoteVault: V4PoolInfo.poolInfo.quoteVault,
      lpMint: V4PoolInfo.poolInfo.lpMint,
      baseDecimals: baseDecimals,
      quoteDecimals: this.SOL_DECIMALS,
      lpDecimals: lpMintInfo.value.data.parsed.info.decimals,
      version: 4,
      programId: new PublicKey(this.RAYDIUM_POOL_V4_PROGRAM_ID),
      authority: V4PoolInfo.poolInfo.authority,
      openOrders: V4PoolInfo.poolInfo.openOrders,
      targetOrders: V4PoolInfo.poolInfo.targetOrders,
      withdrawQueue: new PublicKey("11111111111111111111111111111111"),
      lpVault: new PublicKey("11111111111111111111111111111111"),
      marketVersion: 3,
      marketProgramId: new PublicKey(this.OPENBOOK_ADDRESS),
      marketAuthority: Market.getAssociatedAuthority({ programId: new PublicKey(this.OPENBOOK_ADDRESS), marketId: marketId }).publicKey,
      marketBaseVault: marketInfo.baseVault,
      marketQuoteVault: marketInfo.quoteVault,
      marketBids: marketInfo.bids,
      marketAsks: marketInfo.asks,
      marketEventQueue: marketInfo.eventQueue,
      lookupTableAccount: PublicKey.default
    }
    return result
  }
  static async getStatus(baseMint) {
    let tokenBalance
    try {
      if (!baseMint) {
        return null
      } else {
        const tokenAccount = await getAssociatedTokenAddress(baseMint, owner.publicKey)
        const info = await connection.getTokenAccountBalance(tokenAccount)
        if (!info.value.uiAmount) throw new Error('No balance found')
        tokenBalance = info.value.amount
      }
    } catch (error) { return null }
    try {
      const poolKeys = await this.fetchPoolKeyInfo(new PublicKey(baseMint), new PublicKey(this.SOLANA_ADDRESS))
      const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys })
      const currencyOut = new Token(TOKEN_PROGRAM_ID, poolKeys.quoteMint, poolKeys.quoteDecimals)
      const amountIn25 = new TokenAmount(new Token(TOKEN_PROGRAM_ID, poolKeys.baseMint, poolKeys.baseDecimals), new BN(tokenBalance / 4))
      const amountIn50 = new TokenAmount(new Token(TOKEN_PROGRAM_ID, poolKeys.baseMint, poolKeys.baseDecimals), new BN(tokenBalance / 2))
      const amountInAll = new TokenAmount(new Token(TOKEN_PROGRAM_ID, poolKeys.baseMint, poolKeys.baseDecimals), new BN(tokenBalance))
      const slippage = 15
      const { amountOut: amountOut25, minAmountOut: minAmountOut25, currentPrice } = Liquidity.computeAmountOut({
        poolKeys,
        poolInfo,
        amountIn: amountIn25,
        currencyOut,
        slippage: new Percent(slippage, 100)
      });
      const { amountOut: amountOut50, minAmountOut: minAmountOut50 } = Liquidity.computeAmountOut({
        poolKeys,
        poolInfo,
        amountIn: amountIn50,
        currencyOut,
        slippage: new Percent(slippage, 100)
      });
      const { amountOut: amountOutAll, minAmountOut: minAmountOutAll } = Liquidity.computeAmountOut({
        poolKeys,
        poolInfo,
        amountIn: amountInAll,
        currencyOut,
        slippage: new Percent(slippage, 100)
      });
      const result1 = {
        amountOut25,
        amountOut50,
        amountOutAll
      }
      const result = {
        amountOut25: amountOut25.raw.toNumber() / 10 ** amountOut25.currency.decimals,
        amountOut50: amountOut50.raw.toNumber() / 10 ** amountOut50.currency.decimals,
        amountOutAll: amountOutAll.raw.toNumber() / 10 ** amountOutAll.currency.decimals,
      }
      return result
    } catch (error) {
      console.log("No pool exists for this token, try again with other token")
      await sleep(2000)
      return null
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = PoolKeys;