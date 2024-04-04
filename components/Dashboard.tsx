import { useEffect, useState } from "react";
import styled from "styled-components"
import { Connection, PublicKey } from "@solana/web3.js";
import { InfoType, InfoEnum, OptionProps, TokenInfo } from "pages";
import NormalButton from "pages/Normal";
import { RPC_ENDPOINT } from "sniper/constants";
import { customSell } from "sniper/buy";
import { wrapSol } from "sniper/wsol";
import { Section } from "./Settings";
import Input from "./Input";
import { NATIVE_MINT, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";


interface Props {
  options: OptionProps,
  setOptions: any,
  onActiveTabChange: any,
  info: InfoType[],
  addInfo: any,
  isSniping: boolean,
  tokenAccounts: TokenInfo[]
}
interface SelectedToken {
  mint: PublicKey,
  amount: number,
  decimal: number,
}
const connection = new Connection(RPC_ENDPOINT)

export default function Dashboard(props: Props) {
  const { options, setOptions, onActiveTabChange, tokenAccounts, info, addInfo, isSniping } = props
  const [selectedToken, setSelectedToken] = useState<PublicKey | null>(null)
  const [tokenInfo, setTokenInfo] = useState<SelectedToken | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [wSolBal, setWsolBal] = useState<number>(0)
  const [check, setCheck] = useState<number>(0)
  const [claimAmount, setClaimAmount] = useState<string>("")

  const onChangeToken = (e: any) => {
    setSelectedToken(new PublicKey(e.target.value))
    setTokenInfo(() => {
      const newAccount = tokenAccounts.filter(tk => tk.mint.toBase58() == e.target.value)
      return newAccount[0]
    })
  }
  const wrap = async () => {
    const num = parseFloat(claimAmount)
    if (isNaN(num) || !options.keypair) {
      console.log("Invalid params")
      addInfo({ type: "error", text: "Invlid params" })
      return
    }
    await wrapSol(connection, options.keypair, num, addInfo)
  }
  useEffect(() => {
    setTimeout(() => {
      setCheck(check + 1)
    }, 2000);
    if (!options.pubkey) return
    connection.getBalance(options.pubkey).then(bal => setBalance(Math.round(bal / 10 ** 6) / 1000))
    getAssociatedTokenAddress(NATIVE_MINT, options.keypair!.publicKey).then((wAta: any) => {
      getAccount(connection, wAta).then(() => {
        connection.getTokenAccountBalance(wAta).then((bal: any) => {
          setWsolBal(Math.round(Number(bal.value.amount) / 10 ** 6) / 1000)
        })
      }).catch((e) => {
        addInfo({type: "error", text:"No WSOL in wallet, please wrap some SOL to WSOL"})
      })
    })
  }, [check])
  const onSellQuarter = () => customSell(selectedToken!, tokenInfo!.amount / 4)
  const onSellHalf = () => customSell(selectedToken!, tokenInfo!.amount / 2)
  const onSellAll = () => customSell(selectedToken!, tokenInfo!.amount)

  if (!options.keypair) {
    setTimeout(() => {
      onActiveTabChange()
    }, 2000)

    return (
      <Wrapper>You have to set wallet first</Wrapper>
    )
  }
  useEffect(() => {
    console.log(tokenInfo)
  }, [tokenInfo?.mint.toBase58()])
  return (
    <Wrapper>
      <Cmd>
        {info &&
          info.map(({ text, type }, i) => {
            let color: string = ""
            switch (type) {
              case InfoEnum.error:
                color = 'red'
                break
              case InfoEnum.info:
                color = 'yellow'
                break
              case InfoEnum.normal:
                color = 'white'
                break
              case InfoEnum.success:
                color = 'green'
                break
              case InfoEnum.warning:
                color = 'orange'
                break
            }
            return (
              <TextRow key={i}>
                <MainText style={{ color }}>{text}</MainText>
              </TextRow>
            )
          })
        }
      </Cmd>
      <div>
        <TokenNum >Total Tokens: {tokenAccounts.length}</TokenNum>
        <TokenNum><div>Balance:</div> {balance}SOL / {wSolBal}WSOL</TokenNum>
        <TokensPanel>
          <StyledSelect value={selectedToken ? selectedToken.toBase58() : ""} onChange={onChangeToken}>
            <option value="" style={{ display: "none" }}>Select token to sell</option>
            {tokenAccounts.map((account, i) => {
              if (account.mint.toBase58() != "So11111111111111111111111111111111111111112")
                return <option key={i} value={account.mint.toBase58()}>{account.mint.toBase58()}</option>
            }
            )}
          </StyledSelect>
          {tokenInfo &&
            <>
              <Balance>Balance: {Math.round(tokenInfo.amount / 10 ** (tokenInfo.decimal - 2)) / 100}</Balance>
              <Row>
                <SellButton onClick={onSellQuarter}><NormalButton noStar>Sell 25%</NormalButton></SellButton>
                <SellButton onClick={onSellHalf}><NormalButton noStar>Sell 50%</NormalButton></SellButton>
              </Row>
              <AllBox>
                <SellButton onClick={onSellAll}><NormalButton noStar>Sell All</NormalButton></SellButton>
              </AllBox>
            </>
          }
          <Section>
            <Input value={claimAmount} noDisable={true} onChange={(e: any) => setClaimAmount(e.target.value)} type="text" label="$" width="110px" />
            <NormalButton onClick={wrap}>Wrap SOL</NormalButton>
          </Section>
          <div style={{ width: "100%", textAlign: "center", marginTop: 10 }}>
          </div>
        </TokensPanel>
      </div>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  width: 100%;
  height: 94%;
  display: flex;
  /* flex-direction: column; */
  justify-content: center;
  align-items: center;
  font-family: 'Inter V','Inter';
  color: #b9b7ba;
  gap: 30px;
  position: relative;
`;

const Cmd = styled.div`
  width: 70%;
  height: 100%;
  background-color: #2228;
  border: 2px solid #666;
  border-radius: 5px;
  padding: 30px;
`

const TextRow = styled.div`
  width: 100%;
  margin-bottom: 5px;
  display: flex;
  gap: 20px;
  font-size: 12px;
  font-family: 'Courier New', Courier, monospace;
`

const MainText = styled.div`
  width: max-content;
`
const TokensPanel = styled.div`
  width: max-content;
  padding: 5px;
`
const StyledSelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #030303;
  border-radius: 8px; /* Set border radius */
  font-size: 1rem;
  color: #f61 !important;
  outline: none;
  appearance: none; /* Remove default arrow */
  background-color: #5a464630;
  cursor: pointer;
  color: #99c;
  width: 200px;
  text-align: center;

  /* Style the options */
  option {
    padding: 0.5rem 1rem;
    background-color: #3691;
    font-size: 1rem;
    border-bottom: 1px solid #3333;
    color: #669;
    height: 20px;
  }
`;
const TokenNum = styled.div`
  border: 1px solid #22242299;
  background-color: #22242244;
  border-radius: 5%;
  color: #bdbfbd;
  padding: 5px;
  width: 160px;
  margin-left: 25px;
  margin-bottom: 10px;
  text-align: center;
  font-size: 13px;
`

const Balance = styled.div`
  border-bottom: 2px solid #22242299;
  background-color: #2224221c;
  border-radius: 5%;
  color: #bdbfbd;
  padding: 5px;
  width: 160px;
  margin-left: 25px;
  margin-top: 10px;
  text-align: center;
`

const SellButton = styled.div`
  width: 100px;
  /* margin: 20px 0 20px 50px; */
`

const Row = styled.div`
  margin: 5px 0;
  display: flex;
`

const AllBox = styled.div`
  margin-left: 60px;
`