import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import styled from "styled-components"
import { InfoType, InfoEnum, OptionProps, TokenInfo } from "pages";
import PoolKeys from '../main/modules/getPool'
import { sellToken } from "main/amm/swapOnlyAmm";
import NormalButton from "pages/Normal";
// import { sell } from "main/modules/snipe";
// import { option } from "@raydium-io/raydium-sdk";


interface Props {
  connection: Connection,
  options: OptionProps,
  setOptions: any,
  tokenAccounts: TokenInfo[],
  // setSniping: any,
  onActiveTabChange: any,
  info: InfoType[],
  addInfo: any,
  isSniping: boolean,
}
interface SelectedToken {
  mint: PublicKey,
  amount: number,
  decimal: number,
}

export default function Dashboard(props: Props) {
  const { options, connection, setOptions, onActiveTabChange, info, addInfo, isSniping, tokenAccounts } = props
  const [selectedToken, setSelectedToken] = useState<PublicKey | null>(null)
  const [tokenInfo, setTokenInfo] = useState<SelectedToken | null>(null)
  const [balance, setBalance] = useState<number>(0)

  const pubkey = options.pubkey ? options.pubkey.toBase58() : "Wallet not defined"
  const onChangeToken = (e: any) => {
    setSelectedToken(new PublicKey(e.target.value))
    setTokenInfo(() => {
      const newAccount = tokenAccounts.filter(tk => tk.mint.toBase58() == e.target.value)
      return newAccount[0]
    })
  }
  const sell = async (dividend: number) => {
    if (!tokenInfo)
      return
    try {
      const poolkeys = await PoolKeys.fetchPoolKeyInfo(tokenInfo.mint, new PublicKey('So11111111111111111111111111111111111111112'))
      // sell(poolkeys, tokenInfo.amount / tokenInfo.decimal, 0, addInfo)
      if (!poolkeys || !options.keypair) {
        addInfo({ type: InfoEnum.error, text: "Failed to get poolkeys, pool may not exist" })
        return
      }
      sellToken(
        poolkeys.baseMint.toBase58(),
        poolkeys.id.toBase58(),
        poolkeys.baseDecimals,
        tokenInfo.amount / 10 ** tokenInfo.decimal, 100,
        options.keypair,
        addInfo
      )

    } catch (error) {
      addInfo({ type: InfoEnum.error, text: "Error in selling token" })
    }
  }
  useEffect(() => {
    if (!options.pubkey) return
    connection.getBalance(options.pubkey).then(bal => setBalance(Math.round(bal / 10 ** 6) / 1000))
  }, [options.keypair, info])
  const onSellQuarter = () => sell(4)
  const onSellHalf = () => sell(2)
  const onSellAll = () => sell(1)

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
        <TokenNum>Balance: {balance}SOL</TokenNum>
        <TokensPanel>
          <StyledSelect value={selectedToken ? selectedToken.toBase58() : ""} onChange={onChangeToken}>
            <option value="" style={{ display: "none" }}>Select token to sell</option>
            {tokenAccounts.map((account, i) =>
              <option key={i} value={account.mint.toBase58()}>{account.mint.toBase58()}</option>
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
  margin-bottom: 20px;
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
  margin: 25px 0;
  display: flex;
`

const AllBox = styled.div`
  margin-left: 60px;
`