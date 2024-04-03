import { Keypair, PublicKey } from "@solana/web3.js";
import styled from "styled-components"
import Input from "./Input";
import base58 from "bs58";
import { useEffect, useState } from "react";
import NormalButton from "pages/Normal";
import Loader from "../pages/Loader"


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
    setBuyAmount(options.buyAmonut.toString())
    setSlippage(options.slippage)
  }, [])
  const handelKpChange = (e: any) => {
    setKeyStr(e.target.value)
  }

  const handleSlippageChange = (e: any) => {
    setSlippage(e.target.value)
  }
  const handleSetBuyAmount = (e: any) => {
    setBuyAmount(e.target.value)
  }

  const onSetKey = () => {
    if (!keyStr) return
    try {
      const kp = Keypair.fromSecretKey(base58.decode(keyStr))
      setOptions({ ...options, keypair: kp, pubkey: kp.publicKey })
    } catch (error) {
      console.log("Input keypair string is incorrect")
      setKeyStr('')
    }
  }

  const onSetSlippage = () => {
    const num = Number(slippage)
    if (isNaN(num) || num > 100 || num < 0) {
      console.log("Invalid slippage")
      setSlippage(options.slippage)
      return
    }
    setOptions({ ...options, slippage: num })
  }

  const onSetBuyAmount = () => {
    const num = parseFloat(buyAmount)
    console.log("🚀 ~ onSetBuyAmount ~ num:", num)
    if (isNaN(num) || num <= 0) {
      console.log("Invalid amount")
      setBuyAmount(options.buyAmonut.toString())
      return
    }
    setOptions({ ...options, buyAmount: num })
  }

  const pubkey = options.pubkey ? options.pubkey.toBase58() : "Wallet not defined"
  return (
    <Wrapper>
      <div>
        <Section>
          <Input value={keyStr} onChange={handelKpChange} type="password" label="Secret Key" width="500px" />
          <NormalButton onClick={onSetKey}>Set Wallet</NormalButton>
        </Section>
        <Pubkey><span style={{ fontSize: "0.9rem", marginLeft: 40 }}>Wallet Address</span>  : {pubkey}</Pubkey>
        <Section>
          <Input value={slippage} onChange={handleSlippageChange} label="Slipage" width="350px" />
          <NormalButton onClick={onSetSlippage}>Set Slippage</NormalButton>
        </Section>
        <Section>
          <Input value={buyAmount} onChange={handleSetBuyAmount} label="Buy Amount (SOL)" width="350px" />
          <NormalButton onClick={onSetBuyAmount}>Set Amount</NormalButton>
        </Section>
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
const Section = styled.div`
  display: flex;
  gap: 30px;
  margin-top: 20px;
`

