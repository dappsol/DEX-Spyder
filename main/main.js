"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
const utils_1 = __importDefault(require("./utils"));
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./modules/config");
const fs_1 = __importDefault(require("fs"));
const cli_spinners_1 = __importDefault(require("cli-spinners"));
const fetch_token_1 = require("./modules/fetch_token");
const request_1 = require("request");
const hwid_1 = require("hwid");
const get_keypair_1 = require("./modules/get_keypair");
const web3_js_1 = require("@solana/web3.js");
const pool_keys_1 = require("./modules/pool_keys");
const compute_1 = require("./modules/compute");
const swap_1 = require("./modules/swap");
const get_accounts_1 = require("./modules/get_accounts");
const PoolKeys = require("./modules/getPool");
const runListener = require("./modules/snipe");
//control variables
var choice = 0;
//key auth instance
//spinner function
const Spinner = cli_spinners_1.default.dots4;
let i = 0;
let animationInterval;
const updateSpinner = () => {
  const frame = Spinner.frames[i % Spinner.frames.length];
  process.stdout.cursorTo(0);
  process.stdout.write('\t' + frame);
  i++;
};
const startSpinner = () => {
  animationInterval = setInterval(updateSpinner, Spinner.interval);
};
const stopSpinner = () => {
  clearInterval(animationInterval);
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
};
//creating interface
const rl = readline_1.default.createInterface({
  input: process.stdin,
  output: process.stdout
});
//clearing-resetting screen
function clear_screen() {
  console.clear();
}
//sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
//saving license for ease of use
function save_license(new_license) {
  var config_txt = fs_1.default.readFileSync('config.json', 'utf8');
  var config_obj = JSON.parse(config_txt);
  //updating config
  config_obj.license = new_license;
  //writing new config
  const new_config = JSON.stringify(config_obj);
  fs_1.default.writeFileSync('config.json', new_config);
}
//authenticating
function verify_license(license) {
  return __awaiter(this, void 0, void 0, function* () {
    startSpinner();
    // post request to URL:
    // https://api.cactusweb.io/api/v1/devices
    // Headers:
    // content-type: application/json
    // Body:
    // {
    //    key: '[licenseKey]',
    //    device: '[deviceId]',
    //    id: '6473bfaa496af9a7ca1291c6'
    // }
    let hwid = yield (0, hwid_1.getHWID)();
    const options = {
      url: 'https://api.cactusweb.io/api/v1/devices',
      headers: {
        'content-type': 'application/json'
      },
      body: {
        key: license,
        device: hwid,
        id: '6473bfaa496af9a7ca1291c6'
      },
      json: true
    };
    (0, request_1.post)(options, (err, res, body) => {
      var res; return __awaiter(this, void 0, void 0, function* () {
        if (err) {
          console.error('Error, please try again later');
          throw err;
        }
        res = res;
        if (res.statusCode == 200) {
          stopSpinner();
          console.log(chalk_1.default.green("\n\tLicense Verified!"));
          save_license(license);
          yield sleep(1500);
          main();
        }
        else {
          stopSpinner();
          console.log(chalk_1.default.red("\n\tInvalid License!"));
          yield sleep(1500);
          process.exit(0);
        }
      });
    });
    // if (res.statusCode == 200) {
    //     stopSpinner()
    //     console.log(chalk.green("\n\tLicense Verified!"));
    //     save_license(license);
    //     await sleep(1500);
    //     main();
    // } else {
    //     stopSpinner()
    //     console.log(chalk.red("\n\tInvalid License!"));
    //     await sleep(1500);
    //     process.exit(0);
    // }
  });
}
//program start
//initial authentication
//(async () => {
//
//    startSpinner()
//    stopSpinner()
//
//    var config_txt = fs.readFileSync('config.json','utf8');
//    var config_obj:config = JSON.parse(config_txt);
//    const license = config_obj.license;
//    if (license != ''){
//        await verify_license(license)
//    }else{
//        rl.question("\tLicense : ", async (lic) => {
//        await verify_license(lic);
//        });
//    }
//})();
main();
function start_swapping(connection, is_snipe, amount_in, pool, slip, owner) {
  return __awaiter(this, void 0, void 0, function* () {
    console.log(chalk_1.default.greenBright('\tinputs valid\n'));
    console.log(chalk_1.default.white(`\t[1] - ${chalk_1.default.blueBright(is_snipe ? 'Snipe' : 'Sell')}`));
    console.log(chalk_1.default.white('\t[2] - Return'));
    rl.question(`\n\t${is_snipe ? '[Sniper]' : '[Exit Position]'} - choice: `, (answer) => __awaiter(this, void 0, void 0, function* () {
      const ans = parseInt(answer);
      if (ans == 1) {
        finished = false;
        const SwapSpinner = cli_spinners_1.default.dots4;
        let i = 0;
        let animationInterval;
        const updateSwapSpinner = () => {
          const frame = Spinner.frames[i % Spinner.frames.length];
          process.stdout.cursorTo(0);
          process.stdout.write(chalk_1.default.blueBright('\tSwapping' + frame));
          i++;
        };
        const startSwapSpinner = () => {
          animationInterval = setInterval(updateSwapSpinner, SwapSpinner.interval);
        };
        const stopSwapSpinner = () => {
          clearInterval(animationInterval);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
        };
        startSpinner();
        var finished = false;
        const pool_keys = yield (0, pool_keys_1.fetchPoolKeys)(connection, new web3_js_1.PublicKey(pool));
        var token_in_key;
        var token_out_key;
        if (is_snipe) {
          token_in_key = pool_keys.quoteMint;
          token_out_key = pool_keys.baseMint;
        }
        else {
          token_in_key = pool_keys.baseMint;
          token_out_key = pool_keys.quoteMint;
        }
        while (!finished) {
          const computation = yield (0, compute_1.compute)(connection, pool_keys, token_in_key, token_out_key, amount_in, slip);
          const amountOut = computation[0];
          const minAmountOut = computation[1];
          const currentPrice = computation[2];
          const executionPrice = computation[3];
          const priceImpact = computation[4];
          const fee = computation[5];
          const amountIn = computation[6];
          stopSpinner();
          console.log(`\n\tAmount out: ${amountOut.toFixed()},\n\tMin Amount out: ${minAmountOut.toFixed()}`);
          if (priceImpact.toFixed() > 5) {
            console.log(chalk_1.default.red(`\tpriceImpact: ${priceImpact.toFixed()}`));
          }
          else if (priceImpact.toFixed() < 5 && priceImpact.toFixed() > 1) {
            console.log(chalk_1.default.yellowBright(`\tpriceImpact: ${priceImpact.toFixed()}`));
          }
          else {
            console.log(chalk_1.default.green(`\tpriceImpact: ${priceImpact.toFixed()}`));
          }
          console.log('\n');
          startSwapSpinner();
          const token_accounts = yield (0, get_accounts_1.getTokenAccountsByOwner)(connection, owner.publicKey);
          const swap_status = yield (0, swap_1.swap)(connection, pool_keys, owner, token_accounts, is_snipe, amountIn, minAmountOut);
          stopSwapSpinner();
          if (swap_status == 0) {
            console.log(chalk_1.default.greenBright('\tSwap successful!'));
            rl.question("\tpress enter to return..", () => __awaiter(this, void 0, void 0, function* () {
              snipe_menu();
            }));
            break;
          }
          else {
            console.log(chalk_1.default.red('\tSwap failed, retrying...'));
            continue;
          }
        }
      }
      else if (ans == 2) {
        snipe_menu();
      }
      else {
        console.log(chalk_1.default.red("\n\tInvalid choice"));
        yield sleep(1000);
        snipe_menu();
      }
    }));
  });
}
function snipe_choice() {
  return __awaiter(this, void 0, void 0, function* () {
    clear_screen();

    utils_1.default.aff_logo();
    utils_1.default.aff_title();
    utils_1.default.aff_snipe_option();
    const owner = (0, get_keypair_1.get_wallet)('config.json');
    var config_txt = fs_1.default.readFileSync('config.json', 'utf8');
    var config_obj = JSON.parse(config_txt);
    const slip = config_obj.slippage;
    const connection = new web3_js_1.Connection(config_obj.rpc_endpoint);
    rl.question("\n\tPool ID: ", (answer) => __awaiter(this, void 0, void 0, function* () {
      const pool = answer
      rl.question("\n\tAmount in(enter 'MAX' for max amount): ", (answer) => __awaiter(this, void 0, void 0, function* () {
        console.log('\n\t');
        startSpinner();
        var res;
        const amount_in = parseFloat(answer);
        const is_max = answer;
        const token_amount = yield (0, fetch_token_1.get_token_amount)(pool, true);
        stopSpinner();
        if (token_amount == -1) {
          console.log(chalk_1.default.red("\n\tInvalid Pool ID or an error has occured."));
          yield sleep(1000);
          snipe_menu();
        }
        else if (token_amount == -2) {
          console.log(chalk_1.default.red("\n\tSol Balance less than 0.01"));
          yield sleep(1000);
          snipe_menu();
        }
        else if (token_amount == 0) {
          console.log(chalk_1.default.red("\n\tNo balance found."));
          yield sleep(1000);
          snipe_menu();
        }
        else {
          if (is_max.toUpperCase() == 'MAX') {
            if (token_amount < 0.00001) {
              console.log(chalk_1.default.red("\n\tInput too small."));
              yield sleep(1000);
              snipe_menu();
            }
            else {
              yield start_swapping(connection, true, token_amount, pool, slip, owner);
            }
          }
          else if (isNaN(amount_in)) {
            console.log(chalk_1.default.red("\n\tInvalid Input."));
            yield sleep(1000);
            snipe_menu();
          }
          else {
            if (amount_in > token_amount) {
              console.log(chalk_1.default.red("\n\tinsufficient balance."));
              yield sleep(1000);
              snipe_menu();
            }
            else {
              if (amount_in < 0.00001) {
                console.log(chalk_1.default.red("\n\tInput too small."));
                yield sleep(1000);
                snipe_menu();
              }
              else {
                yield start_swapping(connection, true, amount_in, pool, slip, owner);
              }
            }
          }
        }
      }));
    }));
  });
}

function sell_choice() {
  return __awaiter(this, void 0, void 0, function* () {
    clear_screen();
    utils_1.default.aff_logo();
    utils_1.default.aff_title();
    utils_1.default.aff_sell_option();
    const owner = (0, get_keypair_1.get_wallet)('config.json');
    var config_txt = fs_1.default.readFileSync('config.json', 'utf8');
    var config_obj = JSON.parse(config_txt);
    const slip = config_obj.slippage;
    const connection = new web3_js_1.Connection(config_obj.rpc_endpoint);
    rl.question("\n\tPool ID: ", (answer) => __awaiter(this, void 0, void 0, function* () {
      const pool = answer;

      console.log("")
      rl.question("\n\tInput number of token to sell: \
      \n\tInput MAX to sell all token \
      \n\tInput A to sell 25% of token \
      \n\tInput B to sell 50% of token\n\n", (answer) => __awaiter(this, void 0, void 0, function* () {
        console.log('\n\t');
        startSpinner();
        var res;
        const amount_in = parseFloat(answer);
        const is_max = answer;
        const token_amount = yield (0, fetch_token_1.get_token_amount)(pool, false);
        stopSpinner();
        if (token_amount == -1) {
          console.log(chalk_1.default.red("\n\tInvalid Pool ID or an error has occured."));
          yield sleep(1000);
          snipe_menu();
        }
        else if (token_amount == -2) {
          console.log(chalk_1.default.red("\n\tSol Balance less than 0.01"));
          yield sleep(1000);
          snipe_menu();
        }
        else if (token_amount == 0) {
          console.log(chalk_1.default.red("\n\tNo balance found."));
          yield sleep(1000);
          snipe_menu();
        }
        else {
          if (is_max.toUpperCase() == 'MAX')
            yield start_swapping(connection, false, token_amount, pool, slip, owner);
          else if (is_max.toUpperCase() == 'A')
            yield start_swapping(connection, false, token_amount / 4, pool, slip, owner);
          else if (is_max.toUpperCase() == 'B')
            yield start_swapping(connection, false, token_amount / 2, pool, slip, owner);
          else if (isNaN(amount_in)) {
            console.log(chalk_1.default.red("\n\tInvalid Input."));
            yield sleep(1000);
            snipe_menu();
          } else {
            if (amount_in > token_amount) {
              console.log(chalk_1.default.red("\n\tinsufficient balance."));
              yield sleep(1000);
              snipe_menu();
            }
            else {
              yield start_swapping(connection, false, amount_in, pool, slip, owner);
            }
          }
        }
      }));
    }));
  });
}


function usage() {
  clear_screen();
  utils_1.default.aff_logo();
  utils_1.default.aff_title();
  utils_1.default.aff_guide();
  rl.question("\n\tpress enter to return..", () => __awaiter(this, void 0, void 0, function* () {
    snipe_menu();
  }));
}




function token_snipe() {
  return __awaiter(this, void 0, void 0, function* () {
    var config_txt = fs_1.default.readFileSync('config.json', 'utf8');
    var config_obj = JSON.parse(config_txt);
    const owner = config_obj.wallet;
    const slip = config_obj.slippage;
    const connection = new web3_js_1.Connection(config_obj.rpc_endpoint);
    if (!owner || owner == 'None') {
      console.log(chalk_1.default.red("\n\tPlease add a wallet in settings"));
      yield sleep(1500);
      main();
    } else {
      clear_screen();
      utils_1.default.aff_logo();
      utils_1.default.aff_title();
      rl.question(chalk_1.default.white('\t[Sniper Mode] - Input the token mint address or 0 to go back: '), (answer) => __awaiter(this, void 0, void 0, function* () {
        if (answer === "0") {
          main()
        } else if (!answer) {
          console.log('answer => ', answer)
          console.log(chalk_1.default.red("\tInput the mint address."));
          yield sleep(1500);
          token_snipe();
        } else {
          try {
            // const mintAddress = new web3_js_1.PublicKey(answer.trim())
            // console.log("🚀 ~ rl.question ~ mintAddress:", mintAddress)
            // connection.getParsedAccountInfo(mintAddress).then(info => {
            //   console.log(info, "===XXX===XXX")
            //   if (!info) throw new Error("Invalid token mint address")
            // })
            console.log("\n\tFetching pool information from token mint address")
            startSpinner();
            PoolKeys.fetchPoolKeyInfo(
              new web3_js_1.PublicKey(answer.trim()),
              new web3_js_1.PublicKey("So11111111111111111111111111111111111111112")
            ).then(info => {
              if (info) console.log("\tPool Id: ", info.id.toBase58())
              try {

                PoolKeys.getStatus(new web3_js_1.PublicKey(answer.trim())).then(status => {

                  if (status == null) {
                    console.log("\n\tWallet has no token, or no pool exists, try again with other token")
                    main()
                  } else {
                    console.log("\t", status.amountOut25, "SOL will be earned if you sell 25%")
                    console.log("\t", status.amountOut50, "SOL will be earned if you sell 50%")
                    console.log("\t", status.amountOutAll, "SOL will be earned if you sell all")
                  }
                  stopSpinner();
                  if (!info) {
                    rl.question(chalk_1.default.white("\tPool doesn't exist, do you want to wait for liquidity pool to be created? (press 'n' for No, any key for yes) "), (answer) => __awaiter(this, void 0, void 0, function* () {
                      if (answer == "n") {
                        // clear_screen();
                        main()
                      }
                      clear_screen();
                      utils_1.default.aff_logo();
                      utils_1.default.aff_title();
                      rl.question(chalk_1.default.white('\t[Settings] - USDC amount to buy each token: '), (answer) => __awaiter(this, void 0, void 0, function* () {
                        const usdcAmount = parseFloat(answer)
                        if (isNaN(usdcAmount)) {
                          settings_menu()
                        } else if (usdcAmount <= 0) {
                          console.log("\n\tUSDC amount must be larger than 0.\n")
                          settings_menu()
                        } else {
                          rl.question(chalk_1.default.white('\t Input the percent, when profit is same with this percent, tokens will be sold: '), (answer) => __awaiter(this, void 0, void 0, function* () {
                            const percentToSell = parseFloat(answer)
                            if (isNaN(percentToSell)) {
                              console.log("\n\tInvalid number\n")
                              settings_menu()
                            } else if (percentToSell <= 0) {
                              console.log("\n\tInvalid percent, input amount which is larger than 0.")
                              settings_menu()
                            } else {
                              runListener(connection, owner, usdcAmount, percentToSell, "onePool")
                            }
                          }));
                        }
                      }))

                    }))
                  } else {
                    const pool = info.id.toBase58()
                    rl.question("\n\tTo sell, input 1, to buy input 2:\n", (answer) => __awaiter(this, void 0, void 0, function* () {
                      const choice = parseInt(answer)
                      if (choice == 1) {
                        // to sell tokens
                        clear_screen();
                        utils_1.default.aff_logo();
                        utils_1.default.aff_title();
                        utils_1.default.aff_sell_option();

                        rl.question("\n\tInput number of token to sell: \
                   \n\tInput MAX to sell all token \
                   \n\tInput A to sell 25% of token \
                   \n\tInput B to sell 50% of token\n\n", (answer) => __awaiter(this, void 0, void 0, function* () {
                          console.log('\n\t');
                          startSpinner();
                          const amount_in = parseFloat(answer);
                          const is_max = answer;
                          const token_amount = yield (0, fetch_token_1.get_token_amount)(pool, false);
                          console.log("🚀 ~ rl.question ~ token_amount:", token_amount)
                          stopSpinner();
                          if (token_amount == -1) {
                            console.log(chalk_1.default.red("\n\tInvalid Pool ID or an error has occured."));
                            yield sleep(1500);
                            token_snipe();
                          }
                          else if (token_amount == -2) {
                            console.log(chalk_1.default.red("\n\tSol Balance less than 0.01"));
                            yield sleep(1500);
                            token_snipe();
                          }
                          else if (token_amount == 0) {
                            console.log(chalk_1.default.red("\n\tNo balance found."));
                            yield sleep(1500);
                            token_snipe();
                          }
                          else {
                            if (is_max.toUpperCase() == 'MAX')
                              yield start_swapping(connection, false, token_amount, pool, slip, owner);
                            else if (is_max.toUpperCase() == 'A')
                              yield start_swapping(connection, false, token_amount / 4, pool, slip, owner);
                            else if (is_max.toUpperCase() == 'B')
                              yield start_swapping(connection, false, token_amount / 2, pool, slip, owner);
                            else if (isNaN(amount_in)) {
                              console.log(chalk_1.default.red("\n\tInvalid Input."));
                              yield sleep(1500);
                              token_snipe();
                            }
                            else {
                              if (amount_in > token_amount) {
                                console.log(chalk_1.default.red("\n\tinsufficient balance."));
                                yield sleep(1500);
                                token_snipe();
                              }
                              else {
                                yield start_swapping(connection, false, amount_in, pool, slip, owner);
                              }
                            }
                          }
                        }));
                      } else if (choice == 2) {
                        //to buy tokens
                        clear_screen();
                        utils_1.default.aff_logo();
                        utils_1.default.aff_title();
                        utils_1.default.aff_snipe_option();
                        rl.question("\n\tAmount in(enter 'MAX' for max amount): ", (answer) => __awaiter(this, void 0, void 0, function* () {
                          console.log('\n\t');
                          startSpinner();
                          var res;
                          const amount_in = parseFloat(answer);
                          const is_max = answer;
                          const token_amount = yield (0, fetch_token_1.get_token_amount)(pool, true);
                          stopSpinner();
                          if (token_amount == -1) {
                            console.log(chalk_1.default.red("\n\tInvalid Pool ID or an error has occured."));
                            yield sleep(1500);
                            token_snipe();
                          }
                          else if (token_amount == -2) {
                            console.log(chalk_1.default.red("\n\tSol Balance less than 0.01"));
                            yield sleep(1500);
                            token_snipe();
                          }
                          else if (token_amount == 0) {
                            console.log(chalk_1.default.red("\n\tNo balance found."));
                            yield sleep(1500);
                            token_snipe();
                          }
                          else {
                            if (is_max.toUpperCase() == 'MAX') {
                              if (token_amount < 0.00001) {
                                console.log(chalk_1.default.red("\n\tInput too small."));
                                yield sleep(1500);
                                token_snipe();
                              }
                              else {
                                yield start_swapping(connection, true, token_amount, pool, slip, owner);
                              }
                            }
                            else if (isNaN(amount_in)) {
                              console.log(chalk_1.default.red("\n\tInvalid Input."));
                              yield sleep(1500);
                              token_snipe();
                            }
                            else {
                              if (amount_in > token_amount) {
                                console.log(chalk_1.default.red("\n\tinsufficient balance."));
                                yield sleep(1500);
                                token_snipe();
                              }
                              else {
                                if (amount_in < 0.00001) {
                                  console.log(chalk_1.default.red("\n\tInput too small."));
                                  yield sleep(1500);
                                  token_snipe();
                                }
                                else {
                                  yield start_swapping(connection, true, amount_in, pool, slip, owner);
                                }
                              }
                            }
                          }
                        }));
                      }
                    }));
                  }
                  snipe_menu()
                })
              } catch (error) {
                console.log("Pool doesn't exist, please go with another mint address")
                snipe_menu()
              }
            })
          } catch (error) {
            console.log("Error has happened while sniping, back to menu", error)
          }
        }
      }));
    }
  });
}

function snipe_menu() {
  return __awaiter(this, void 0, void 0, function* () {
    var config_txt = fs_1.default.readFileSync('config.json', 'utf8');
    console.log("🚀 ~ return__awaiter ~ config_txt:", config_txt)
    var config_obj = JSON.parse(config_txt);
    const wallet = config_obj.wallet;
    if (wallet === 'None') {
      console.log(chalk_1.default.red("\n\tPlease add a wallet in settings"));
      yield sleep(1500);
      main();
    }
    else {
      clear_screen();
      utils_1.default.aff_logo();
      utils_1.default.aff_title();
      utils_1.default.aff_sniper_menu();
      rl.question(chalk_1.default.white('\t[Sniper Mode] - Choice: '), (answer) => __awaiter(this, void 0, void 0, function* () {
        choice = parseInt(answer);
        if (choice == 1) {
          snipe_choice();
        }
        else if (choice == 2) {
          sell_choice();
        }
        else if (choice == 3) {
          usage();
        }
        else if (choice == 4) {
          main();
        }
        else {
          console.log(chalk_1.default.red("\tInvalid choice."));
          yield sleep(1500);
          snipe_menu();
        }
      }));
    }
  });
}

// sniping all usdc pool when launch
function snipe_all_usd() {
  return __awaiter(this, void 0, void 0, function* () {
    var config_txt = fs_1.default.readFileSync('config.json', 'utf8');
    var config_obj = JSON.parse(config_txt);
    const owner = config_obj.wallet;
    const slip = config_obj.slippage;
    const connection = new web3_js_1.Connection(config_obj.rpc_endpoint);
    if (!owner || owner == 'None') {
      console.log(chalk_1.default.red("\n\tPlease add a wallet in settings"));
      yield sleep(1500);
      main();
    } else {
      clear_screen();
      utils_1.default.aff_logo();
      utils_1.default.aff_title();
      rl.question(chalk_1.default.white('\t[Settings] - USDC amount to buy each token: \n\tpress X to go to main menu:'), (answer) => __awaiter(this, void 0, void 0, function* () {
        const usdcAmount = parseFloat(answer)
        if (answer.toUpperCase() == "X") {
          main()
        } else if (isNaN(usdcAmount)) {
          snipe_all_usd()
        } else if (usdcAmount <= 0) {
          console.log("\n\tUSDC amount must be larger than 0.\n")
          snipe_all_usd()
        } else {
          rl.question(chalk_1.default.white('\t Input the percent, when profit is same with this percent, tokens will be sold: '), (answer) => __awaiter(this, void 0, void 0, function* () {
            const percentToSell = parseFloat(answer)
            if (isNaN(percentToSell)) {
              console.log("\n\tInvalid number\n")
              snipe_all_usd()
            } else if (percentToSell <= 0) {
              console.log("\n\tInvalid percent, input amount which is larger than 0.")
              snipe_all_usd()
            } else {
              runListener(connection, owner, usdcAmount, percentToSell)
            }
          }));
        }
      }))
    }
  })
} 1

//settings menu
function settings_menu() {
  return __awaiter(this, void 0, void 0, function* () {
    clear_screen();
    utils_1.default.aff_logo();
    utils_1.default.aff_title();
    utils_1.default.aff_settings_menu();
    rl.question(chalk_1.default.white('\t[Settings] - Choice: '), (answer) => __awaiter(this, void 0, void 0, function* () {
      choice = parseInt(answer);
      if (choice == 1) {
        rl.question(chalk_1.default.white('\t[Settings] - New RPC Endpoint: '), (answer) => __awaiter(this, void 0, void 0, function* () {
          const res = yield (0, config_1.update_rpc)(answer);
          yield sleep(1000);
          if (res === 1) {
            console.log(chalk_1.default.red('\tInvalid RPC Value'));
            yield sleep(1000);
            settings_menu();
          }
          else {
            console.log('\tRPC Updated');
            yield sleep(1000);
            settings_menu();
          }
        }));
      }
      else if (choice == 2) {
      }
      else if (choice == 3) {
        rl.question(chalk_1.default.white('\t[Settings] - New Slippage(0-100): '), (answer) => __awaiter(this, void 0, void 0, function* () {
          const res = (0, config_1.update_slippage)(answer);
          if (res === 1) {
            console.log(chalk_1.default.red('\tInvalid Slippage Value'));
            yield sleep(1000);
            settings_menu();
          }
          else {
            console.log('\tSlippage Updated!');
            yield sleep(1000);
            settings_menu();
          }
        }));
      }
      else if (choice == 4) {
        rl.question(chalk_1.default.white('\t[Settings] - Enter Private Key: '), (answer) => __awaiter(this, void 0, void 0, function* () {
          const res = (0, config_1.update_wallet)(answer);
          if (res === 1) {
            console.log(chalk_1.default.red('\tInvalid Input or Wallet Not Found'));
            yield sleep(1000);
            settings_menu();
          }
          else {
            console.log('\tWallet Updated!');
            yield sleep(1000);
            settings_menu();
          }
        }));
      }
      else if (choice == 5) {
        clear_screen();
        utils_1.default.aff_logo();
        utils_1.default.aff_title();
        (0, config_1.show_config)();
        rl.question(chalk_1.default.white('\n\tpress enter to return..'), (answer) => {
          settings_menu();
        });
      }
      else if (choice == 6) {
        main();
      }
      else {
        console.log(chalk_1.default.red("\tInvalid choice."));
        yield sleep(1500);
        settings_menu();
      }
    }));
  })
}
//main menu
function main() {
  return __awaiter(this, void 0, void 0, function* () {
    // console.clear();
    utils_1.default.aff_logo();
    utils_1.default.aff_title();
    utils_1.default.aff_main_menu();
    rl.question(chalk_1.default.white('\t[Main] - Choice: '), (answer) => __awaiter(this, void 0, void 0, function* () {
      choice = parseInt(answer);

      if (choice == 1) {
        token_snipe();
      }
      else if (choice == 2) {
        snipe_menu();
      }
      else if (choice == 3) {
        snipe_all_usd();
      }
      else if (choice == 4) {
        settings_menu();
      }
      else if (choice == 5) {
        process.exit();
      }
      else {
        console.log(chalk_1.default.red("\tInvalid choice."));
        yield sleep(1500);
        main();
      }
    }));
  })
}
module.exports = {
  main
};
