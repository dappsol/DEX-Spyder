import { Keypair, PublicKey } from "@solana/web3.js";
import styled from "styled-components"
import Input from "./Input";
import base58 from "bs58";
import { useEffect, useState } from "react";
import Loader from "../pages/Loader"
import { QUOTE_AMOUNT, SLIPPAGE, SNIPE_LISTS } from "sniper/constants";


interface OptionProps {
  keypair: Keypair | null;
  pubkey: PublicKey | null;
  slippage: number;
  buyAmonut: number;
}

interface Props {
  options: OptionProps,
  setOptions: any,
}
export default function Setting(props: Props) {
  const { options, setOptions } = props
  const [keyStr, setKeyStr] = useState<string>("")
  const [slippage, setSlippage] = useState<number>(0)
  const [buyAmount, setBuyAmount] = useState<string>("")
  
  useEffect(() => {
    if (options.keypair)
      setKeyStr(base58.encode(options.keypair.secretKey))
    setBuyAmount(QUOTE_AMOUNT.toString())
    setSlippage(SLIPPAGE)
  }, [options.keypair])
  const handelKpChange = (e: any) => {
    setKeyStr(e.target.value)
  }

  const handleSlippageChange = (e: any) => {
    setSlippage(e.target.value)
  }
  const handleSetBuyAmount = (e: any) => {
    setBuyAmount(e.target.value)
  }
  const pubkey = options.pubkey ? options.pubkey.toBase58() : "Wallet not defined, edit config.json"
  return (
    <Wrapper>
      <div>
        <Section>
          <Input value={keyStr} onChange={handelKpChange} type="password" label="Secret Key" width="500px" />
        </Section>
        <Section>
          <Input value={pubkey} onChange={handelKpChange} label="Wallet Address" width="500px" />
        </Section>
        <Section>
          <Input value={slippage} onChange={handleSlippageChange} label="Slipage" width="350px" />
        </Section>
        <Section>
          <Input value={buyAmount} onChange={handleSetBuyAmount} label="Buy Amount (SOL)" width="350px" />
          {/* <NormalButton onClick={onSetBuyAmount}>Set Amount</NormalButton> */}
        </Section>
        {SNIPE_LISTS.map((e, i) => {
          return (
            <Section key={i}>
              <Input value={e} onChange={handleSetBuyAmount} label={`Tracking Token`} width="350px" />
            </Section>
          )
        })}
        {(options.keypair && options.buyAmonut > 0 && options.slippage >= 0 && options.slippage <= 100) && <Loader />}
      </div>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  width: 100%;
  height: 80%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: 'Inter V','Inter';
`;
const Pubkey = styled.div`
  height: 40px;
  margin: 20px 0;
  color: #cfcecd;
`;
export const Section = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 10px;
`

