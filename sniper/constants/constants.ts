import { Commitment } from "@solana/web3.js";
import config from '../../config.json'


export const NETWORK = 'mainnet-beta';
export const COMMITMENT_LEVEL: Commitment = config.COMMITMENT_LEVEL as Commitment;
export const RPC_ENDPOINT = config.RPC_ENDPOINT;
export const RPC_WEBSOCKET_ENDPOINT = config.RPC_WEBSOCKET_ENDPOINT;
export const LOG_LEVEL = config.LOG_LEVEL;
export const CHECK_IF_MINT_IS_RENOUNCED = config.CHECK_IF_MINT_IS_RENOUNCED;
export const USE_SNIPE_LIST = config.USE_SNIPE_LIST;
export const SNIPE_LISTS = config.SNIPE_LISTS;
export const SNIPE_LIST_REFRESH_INTERVAL = Number(config.SNIPE_LIST_REFRESH_INTERVAL);
export const AUTO_SELL = config.AUTO_SELL;
export const MAX_SELL_RETRIES = Number(config.MAX_SELL_RETRIES);
export const AUTO_SELL_DELAY = Number(config.AUTO_SELL_DELAY);
export const PRIVATE_KEY = config.PRIVATE_KEY;
export const QUOTE_MINT = config.QUOTE_MINT;
export const QUOTE_AMOUNT = config.QUOTE_AMOUNT;
export const MIN_POOL_SIZE = config.MIN_POOL_SIZE;
export const MAX_POOL_SIZE = config.MAX_POOL_SIZE;
export const ONE_TOKEN_AT_A_TIME = config.ONE_TOKEN_AT_A_TIME;
export const SLIPPAGE = config.SLIPPAGE;

