import React, { InputHTMLAttributes, CSSProperties } from "react";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import createSVGMask from "lib/createSVGMask";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  style?: CSSProperties;
  label?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste?: any;
  unit?: string;
  isDisabled?: boolean;
  hasError?: boolean;
  errorLabel?: string | Function;
  placeholder?: string;
  width: string;
  noDisable?: boolean
}

const Wrapper = styled.div<Partial<InputProps>>`
position: relative;
  box-sizing: border-box;
  justify-self: flex-start; // This is what prevent the child item strech inside grid column
  border: 1px solid #393534;
  background: #39353420;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  width: ${({ width }) => width};
  max-width: 100%;
  border-radius: 25px;
  color: #cfcecd;
  padding-right: 3px;
  height: 47px;
`;

const InputStyled = styled.input`
  flex: 1 1 auto;
  /* justify-self: flex-start; */
  padding: 8px;
  border: none;
  border-radius: 20px;
  min-width: 0;
  background-color: #6e624120;
  padding: 0 15px;
  height: 40px;
  color: white;
  text-align: center;
  :focus {
    outline: none;
  }
`;


const InnerElement = styled.div`
  width: 180px;
  text-align: center;
`;

const Input = (props: InputProps) => {

  const width = Number(props.width.slice(0, -2))
  function generateSquareMask() {
    const dimensions = width + 10 // safe distance
    if (isNaN(dimensions)) {
      console.log("width error")
      return 50
    }
    return dimensions
  }

  return (
    <Wrapper width={props.width}>
      <Border
        as={motion.div}
        animate={{ '--border-angle': ["0turn", "1turn"] } as any}
        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        size={generateSquareMask()}
        buttonwidth={width - 5}
        buttonheight={47}
      />
      <InnerElement>{props.label}</InnerElement>
      {props.noDisable ?
        <InputStyled {...props} /> :
        <InputStyled disabled {...props} />
      }
    </Wrapper>
  );
};


const Border = styled.div<{ size: number, buttonwidth: number, buttonheight: number }>`
  --border-size: 15px;
  --border-angle: 0turn;
  pointer-events: none;
  background-image: 
      conic-gradient(
        from var(--border-angle) at 50% 50%,
        rgba(255, 255, 255, 0.5) 0deg, rgba(255, 255, 255, 0) 60deg, rgba(255, 255, 255, 0) 310deg, rgba(255, 255, 255, 0.5) 360deg);
  background-size: calc(100% - (var(--border-size) * 2))
      calc(100% - (var(--border-size) * 2)), 
      cover;
  position: absolute;
  bottom: calc(50% - ${p => p.size / 2}px);
  left: calc(50% - ${p => p.size / 2}px);
  /* it should be square */
  width: ${p => p.size}px;
  height: ${p => p.size}px;
  background-position: center center;
  background-repeat: no-repeat;
  
  mask: url(${p => createSVGMask(p.buttonwidth + 4, p.buttonheight + 4)});
  mask-size: ${p => p.buttonwidth + 4}px ${p => p.buttonheight + 4}px;
  mask-position: center center;
  mask-repeat: no-repeat;
  mask-mode: alpha;
`

export default Input