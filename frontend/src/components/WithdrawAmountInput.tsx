import AmountInput from "./AmountInput.tsx";
import {TokenBalance, tokenMap} from "./types.ts";
import {useEffect, useMemo, useRef, useState} from "react";
import {formatUnits, parseEther} from "viem";
import {useAccount, useWaitForTransactionReceipt, useWriteContract} from "wagmi";
import {useEnclaveService} from "../hooks/useEnclaveService.ts";
import {ActionIcon, Button} from "@mantine/core";
import {chainVaultAbi, enclaveWalletAbi} from "../abi.ts";
import {appEnv} from "../appEnv.ts";
import {ConfirmModal} from "./ConfirmModal.tsx";
import {SCSelect} from "./SCSelect.tsx";
import {Stack} from "@mui/material";
import {IconCheck} from "@tabler/icons-react";
import {useRecoilState} from "recoil";
import {sessionAtom, SessionModel} from "../atoms/session-atom.ts";

type Props = {
  depositBalance?: bigint,
};


export function WithdrawAmountInput({ }: Props) {

  const account = useAccount()
  const {balance, getBalance, getWithdrawIntent, error, enclaveHash, startMonitoring} = useEnclaveService();
  const [selectedToken, setSelectedToken] = useState('bnb');
  const { chain, address } = useAccount();
  const [amountInput, setAmountInput] = useState('');
  const [sapphireBalance, setSapphireBalance] = useState<TokenBalance>();
  const [sessionObj, setSessionObj] = useRecoilState<SessionModel>(sessionAtom);
  const [errorMessage, setErrorMessage] = useState('');
  const confirmRef = useRef({ open: () => {} });

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (error) {
      confirmRef.current.open();
    }
  }, [error]);

  useMemo(() => {
    if (enclaveHash) {
      setSessionObj({...sessionObj, withdrawStep: 3 });
      refresh();
    }

  }, [enclaveHash]);

  useMemo(() => {
    const data = tokenMap[selectedToken].data;
    setSapphireBalance({ decimals: data.decimals, formatted: formatUnits(balance, data.decimals), symbol: data.symbol, value: balance });
  }, [balance, selectedToken]);


  const { data: withdrawHash, isPending: isWritePending, writeContract } = useWriteContract();
  // const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const onWithdraw = () => {
    console.log("onWithdraw", amountInput);
    setErrorMessage('');
    getWithdrawIntent(parseEther(amountInput))
      .then((data) => {
        console.log("getWithdrawIntent", data);
        writeContract({
          chain, account: address,
          abi: chainVaultAbi,
          address: appEnv.CHAIN_VAULT_ADDR,
          functionName: 'withdraw',
          args: [data.intent, data.sig]
        }, {
          onSuccess: (data) => {
            setSessionObj({...sessionObj, withdrawStep: 1 })
          },
          onSettled: (data, error) => {
            console.log("onSettled", data, error);
            if (error) {
              setErrorMessage(error.message.split('.')[0]);
              setSessionObj({...sessionObj, withdrawStep: 0 })
            }
            else {
              setSessionObj({...sessionObj, withdrawStep: 2})
              startMonitoring(account.address);
            }
          }
        })
      })
    .catch((error) => {
      console.error("onWithdraw", error);
      setErrorMessage(error.toString().split('.')[0]);
      setSessionObj({...sessionObj, withdrawStep: 0 })
    });
  }

  function refresh(){
    setErrorMessage('');
    getBalance();
  }

  function onAmountChange(val: string, error?: string) {
    setAmountInput(val);
    if (error !== sessionObj.withdrawInputError) {
      setSessionObj({...sessionObj, withdrawInputError: error})
    }
  }

  function genBscLink(tx: string) {
    return <a className="underline" style={{color: 'lightskyblue'}} href={`https://testnet.bscscan.com/tx/${tx}`} target="_blank">{tx.substring(0,20)}...</a>
  }

  function genOasisLink(tx: string) {
    return <a className="underline" style={{color: 'lightskyblue'}} href={`https://explorer.oasis.io/testnet/sapphire/tx/${tx}`} target="_blank">{tx.substring(0,20)}...</a>
  }

  return (
    <div className="flex flex-col gap-6 p-8 w-1/3 h-1/3 bg-neutral-900">
      <div>
        Authorize the Enclave Wallet to withdraw from Vault.
      </div>
      <div className="flex gap-3 w-full items-center">
        <AmountInput token={tokenMap[selectedToken]} onValueChange={onAmountChange} balance={sapphireBalance}/>
        <SCSelect model={Object.values(tokenMap)} defaultValue="eth" value={selectedToken} onChange={(val) => setSelectedToken(val)} />
      </div>
      {errorMessage && <div className="text-red-500">{errorMessage}</div>}
      <div className="flex gap-2">
        <Button variant="outlined" onClick={() => refresh()}>Refresh</Button>
        <Button variant="contained" className="w-full rounded-full" onClick={onWithdraw} disabled={isWritePending || !!sessionObj.withdrawInputError}>Withdraw</Button>
      </div>
      <Stack spacing={1} visibility={sessionObj.withdrawStep < 1 ? 'hidden' : 'visible'}>
        <div className="flex gap-2 items-center">
          <ActionIcon style={{borderRadius: 24}} size="lg" loading={sessionObj.withdrawStep === 1} variant={sessionObj.withdrawStep < 1 ? 'outline' : ''}>
            {sessionObj.withdrawStep > 1 && <IconCheck size={18} stroke={1.5}/>}
          </ActionIcon>
          <div>Vault withdrawal {sessionObj.withdrawStep <= 1 ? sessionObj.withdrawStepStatus : 'confirmed'}</div>
          <div>{withdrawHash && genBscLink(withdrawHash)}</div>
        </div>
        <div className="flex gap-2 items-center">
          <ActionIcon style={{borderRadius: 24}} size="lg" loading={sessionObj.withdrawStep === 2} variant={sessionObj.withdrawStep < 2 ? 'outline' : ''}>
            {sessionObj.withdrawStep > 1 && <IconCheck size={18} stroke={1.5}/>}
          </ActionIcon>
          <span>Enclave Wallet update {sessionObj.withdrawStep <= 2 ? sessionObj.withdrawStepStatus : 'confirmed'}</span>
          <div>{enclaveHash && genOasisLink(enclaveHash)}</div>
        </div>
      </Stack>
      <ConfirmModal ref={confirmRef} title="Check your connection" message={error}></ConfirmModal>
    </div>
  )
}