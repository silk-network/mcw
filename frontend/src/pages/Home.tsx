
import {DepositAmountInput} from "../components/DepositAmountInput.tsx";
import {tokenMap} from "../components/types.ts";
import {WithdrawAmountInput} from "../components/WithdrawAmountInput.tsx";
import {useState} from "react";

export const Home = () => {


  return (
    <section className="mt-5 flex flex-col items-center gap-10">
      <div className="text-2xl font-bold text-center">MultiChain Wallet</div>
      <DepositAmountInput token={tokenMap['bnb']} />
      <WithdrawAmountInput />
    </section>
  );
}