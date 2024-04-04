import { useEffect, useState } from "react"
import styled from "styled-components"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { AnimatePresence, motion } from "framer-motion"
import Stars from "@/c/GlowingButton/Stars"
import Intro from "@/c/GlowingButton/Intro"
import Browser from "@/c/GlowingButton/Browser"
import Special from "./Special"
import Setting from "@/c/Settings"
import Dashboard from "@/c/Dashboard"
import base58 from "bs58"
import { PRIVATE_KEY, RPC_ENDPOINT } from "sniper/constants"
import { SOL, SPL_ACCOUNT_LAYOUT, TOKEN_PROGRAM_ID, Token, TokenAccount } from "@raydium-io/raydium-sdk"
import { NATIVE_MINT, getAccount, getAssociatedTokenAddress, getMint } from "@solana/spl-token"
import { runListener } from "sniper/buy"

export interface OptionProps {
  keypair: Keypair | null;
  pubkey: PublicKey | null;
  slippage: number;
  buyAmonut: number;
}
export enum InfoEnum {
  error = "error",
  info = "info",
  success = "success",
  warning = "warning",
  normal = "normal"
}
export interface InfoType {
  type: InfoEnum,
  text: string
}
export interface TokenInfo {
  mint: PublicKey,
  owner: PublicKey,
  amount: number,
  decimal: number
}
const keypair = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
const pubkey = keypair.publicKey
const connection = new Connection(RPC_ENDPOINT)

export default function Home() {
  const [options, setOptions] = useState<OptionProps>({
    keypair: null,
    pubkey: null,
    slippage: 50,
    buyAmonut: 0.005
  })

  const [activeTab, setActiveTab] = useState(ActiveTab.Setting)
  const [bg, setBg] = useState(0)
  const [_, setShow] = useState(false)
  const [info, setInfo] = useState<InfoType[]>([])
  const [isSniping, setSniping] = useState<boolean>(false)
  const [tokenAccounts, setTokenAccounts] = useState<TokenInfo[]>([])

  const addInfo = (newInfo: InfoType) => {
    setInfo((s: InfoType[]) => {
      if (!s.map(elm => elm.text).includes(newInfo.text)) {
        let length = s.push(newInfo)
        if (length > 12)
          s.shift()
        const newState = [...s]
        return newState
      }
      return s
    })
  }

  const updateTokens = async () => {
    if (!keypair.publicKey) return
    const walletTokenAccount = await connection.getTokenAccountsByOwner(keypair.publicKey, {
      programId: TOKEN_PROGRAM_ID
    });
    const tokenAccountsInfo: TokenAccount[] = walletTokenAccount.value.map((j) => ({
      pubkey: j.pubkey,
      programId: j.account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(j.account.data)
    }))
    let detailedInfo = []
    for (let i = 0; i < tokenAccountsInfo.length; i++) {
      let tk = tokenAccountsInfo[i]
      const mintInfo = await getMint(connection, tk.accountInfo.mint)
      if (tk.accountInfo.amount.toNumber() != 0)
        detailedInfo.push({ ...tk.accountInfo, decimal: mintInfo.decimals })
    }
    return detailedInfo
  }
  const startSniping = () => {
    if (!options.keypair || !options.pubkey) {
      addInfo({ type: InfoEnum.error, text: "Wallet not set, please set main wallet in config file" })
      return
    }
    connection.getBalance(options.pubkey).then(bal => {
      if (bal == 0) {
        addInfo({ type: InfoEnum.error, text: "Not enough SOL in wallet" })
        return
      }
      getAssociatedTokenAddress(NATIVE_MINT, options.keypair!.publicKey).then((wAta: any) => {
        console.log("🚀 ~ getAssociatedTokenAddress ~ wAta:", wAta)
        getAccount(connection, wAta).then((info) => {
          connection.getTokenAccountBalance(wAta).then((wBal: any) => {
            console.log('______', wBal)
            if (parseFloat(wBal.value.amount) > 0) {
              setSniping(true)
              runListener(addInfo)
            } else
              addInfo({ type: InfoEnum.error, text: "Not enough WSOL in wallet" })
          }).catch(e => {
            addInfo({ type: InfoEnum.error, text: "No WSOL in wallet, please wrap some SOL to WSOL" })
          })
        }).catch((e) => {
          addInfo({ type: InfoEnum.error, text: "No WSOL in wallet, please wrap some SOL to WSOL" })
        })
      })
    })
  }
  useEffect(() => {
    let tokenAccountsTemp: TokenInfo[] = [];
    updateTokens().then((tkAccs: any) => {
      if (tkAccs?.length == 0 || !tkAccs)
        return
      tkAccs.map((elem: any) => tokenAccountsTemp.push({ mint: elem.mint, amount: elem.amount.toNumber(), owner: elem.owner, decimal: elem.decimal }))
      setTokenAccounts(tokenAccountsTemp)
    })
  }, [options.keypair, info])

  useEffect(() => {
    setOptions({ ...options, keypair, pubkey })
    setTimeout(() => {
      setShow(true)
    }, 200)
  }, [])

  setTimeout(() => {
    const newBg = bg < BACKGROUNDS.length - 1 ? bg + 1 : 0
    setBg(newBg)
  }, 10000)

  return (
    <Container bg={BACKGROUNDS[bg]}>
      <Stars />
      <Intro />

      <Browser m="20px 0 0 0" activeTab={activeTab} onActiveTabChange={(activeIndex: any) => setActiveTab(activeIndex)}>
        <AnimatePresence exitBeforeEnter={true}>

          {activeTab === 1 &&
            <Content
              as={motion.div}
              key={ActiveTab.Setting}
              variants={variants}
              initial="hidden"
              animate="open"
              exit="out"
            >
              <Setting options={options} setOptions={setOptions} />
            </Content>
          }

          {activeTab === 2 &&
            <Content
              as={motion.div}
              key={ActiveTab.Dashboard}
              variants={variants}
              initial="hidden"
              animate="open"
              exit="out"
            >
              <Dashboard
                tokenAccounts={tokenAccounts}
                onActiveTabChange={() => setActiveTab(1)}
                options={options}
                setOptions={setOptions}
                info={info}
                isSniping={isSniping}
                addInfo={addInfo}
              />
            </Content>
          }
        </AnimatePresence>
      </Browser>
      {(options.keypair && !isSniping) ?
        <Notice
          onClick={startSniping}
          as={motion.div}
          initial={{ opacity: 1, y: 200 }}
          animate={activeTab === 2 ? {
            opacity: 1,
            y: 0,
            zIndex: 10
          } : {
            opacity: 1,
            y: -450,
            zIndex: -3
          }}
          transition={{
            duration: .5
          }}
        >
          <span>{isSniping ? "Stop Sniping" : "Start sniping from new pools"}</span>
        </Notice> :
        (isSniping && <LoadingButton><Special /></LoadingButton>)
      }
    </Container>
  )
}




/***************************
 * 
 *  UI with Styled component
 * 
 ****************************/


const BACKGROUNDS = [
  "#020308",
  "#010609",
  "#0B020D",
  "#090401",
  "#010902"
]


const Container = styled.div<{ bg: string }>`
  width: 100vw;
  height: 100vh;
  background: radial-gradient(63.94% 63.94% at 50% 0%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%), ${p => p.bg};
  transition: 1s all;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const Content = styled.div`
  display: flex;
  gap: 32px;
  height: calc(100% - 0px);
  width: 100%;
  padding: 30px 30px 0 30px;
`

const Notice = styled.div`
  width: 330px;
  height: 40px;
  padding: 6px 16px;
  background: radial-gradient(63.94% 63.94% at 50% 0%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%), rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(6px);
  border-radius: 6px;
  position: absolute;
  font-family: "Inter";
  bottom: 40px;
  font-size: 14px;
  text-align: center;
  line-height: 24px;
  cursor: pointer;

  span {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 8.85%, #FFFFFF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-fill-color: transparent;
  }
  &:hover {
    background: radial-gradient(63.94% 63.94% at 50% 0%, rgba(255, 255, 255, 0.135) 0%, rgba(255, 255, 255, 0) 100%), rgba(255, 255, 255, 0.05);
    transition: all 0.1s ease-in-out;
  }
  &:active {
    transition: all 0.05s ease-in-out;
    transform: scale(1.1);
  }


  &:before {
    content: "";
    width: calc(100% + 2px);
    height: calc(100% + 2px);
    border-radius: 6px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 74.04%),
    linear-gradient(0deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.04));
    position: absolute;
    top: -1px;
    left: -1px;
    mask: url("data:image/svg+xml,%3Csvg width='330' height='42' viewBox='0 0 330 42' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0.5' y='0.5' width='329' height='42' rx='9.5' stroke='black'/%3E%3C/svg%3E%0A");
    mask-repeat: no-repeat;
    mask-mode: alpha;
    pointer-events: none;
  }
`

enum ActiveTab {
  'Setting' = 1,
  'Dashboard' = 2,
}

const variants = {
  hidden: { opacity: 0, y: 15 },
  open: {
    opacity: 1,
    y: 0,
    transition: {
      duration: .5,
      staggerChildren: 0.1
    }
  },
  out: {
    opacity: 0,
    y: 15,
    transition: {
      duration: .2,
      staggerChildren: 0.1,
      when: "afterChildren"
    },
  }
}


const LoadingButton = styled.div`
  width: 100%;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 40px;
  right: 20px;
  width: 100px;

`