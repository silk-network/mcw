import AmountInput from "./AmountInput.tsx";
import {Token, tokenMap} from "./types.ts";
import {useEffect, useMemo, useState} from "react";
import {parseEther} from "viem";
import {
  useAccount,
  useBalance, useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract
} from "wagmi";
import {useQueryClient} from "@tanstack/react-query";
import {appEnv} from "../appEnv.ts";
import {chainVaultAbi} from "../abi.ts";
import {ActionIcon, Button} from "@mantine/core";
import {SCSelect} from "./SCSelect.tsx";
import {sessionAtom, SessionModel} from "../atoms/session-atom.ts";
import {useRecoilState} from "recoil";
import {IconCheck} from "@tabler/icons-react";
import {Stack} from "@mui/material";
import {useEnclaveService} from "../hooks/useEnclaveService.ts";

type Props = {
  token?: Token,
};


export function DepositAmountInput({}: Props) {

  const [amountInput, setAmountInput] = useState('');
  const [selectedToken, setSelectedToken] = useState('bnb');

  const account = useAccount()
  const [sessionObj, setSessionObj] = useRecoilState<SessionModel>(sessionAtom);
  const [errorMessage, setErrorMessage] = useState('');
  const { data:balance, queryKey: queryBalanceKey}  = useBalance({address: account.address, token: tokenMap[selectedToken].data.address});

  const {enclaveHash, startMonitoring} = useEnclaveService();

  const busFee = useReadContract({
    address: appEnv.CHAIN_VAULT_ADDR,
    abi: chainVaultAbi,
    functionName: 'estimateIOFee',
    args: []
  });
  const { data: depositHash, isPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash })

  const queryClient = useQueryClient()

  useEffect(() => {
      queryClient.invalidateQueries({queryKey: queryBalanceKey})
      console.log("DepositAmountInput.useEffect", balance);

      if (isDepositConfirmed) {
        console.log("DepositAmountInput.useEffect.isConfirmed", isDepositConfirmed);
        setSessionObj({...sessionObj, depositStep: 2 })
        startMonitoring(account.address);
      }
  }, [isDepositConfirmed])

  // useMemo(() => {
  //   if (refreshIndex) {
  //     queryClient.invalidateQueries({queryKey: queryBalanceKey})
  //   }
  // }, [refreshIndex, queryClient, queryBalanceKey])

  useMemo(() => {
    if (enclaveHash) {
      setSessionObj({...sessionObj, depositStep: 3 })
    }

  }, [enclaveHash]);

  const onDeposit = () => {
    console.log("onDeposit", amountInput, selectedToken, busFee.data, appEnv.CHAIN_VAULT_ADDR);
    setErrorMessage('');

    writeContract({
      account: undefined,
      chain: undefined,
      address: appEnv.CHAIN_VAULT_ADDR,
      abi: chainVaultAbi,
      functionName: 'deposit',
      args: [],
      value: parseEther(amountInput) + busFee.data
    }, {
      onSuccess: (data) => {
        setSessionObj({...sessionObj, depositStep: 1 })
      },
      onSettled: (data, error) => {
        console.log("onSettled", data, error);
        if (error) {
          setErrorMessage(error.message.split('.')[0]);
          setSessionObj({...sessionObj, depositStep: 0 })
        }
        else {
          setSessionObj({...sessionObj, depositStep: 2 })
        }
      }
    })
  }

  function onAmountChange(val: string, error?: string) {
    setAmountInput(val);
    if (error !== sessionObj.depositInputError) {
      setSessionObj({...sessionObj, depositInputError: error})
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
        Deposit assets to Vault and record balance in the Enclave Wallet
      </div>
      <div className="flex gap-3 w-full items-center">
        <AmountInput token={tokenMap[selectedToken]} onValueChange={onAmountChange} balance={balance}/>
        <SCSelect model={Object.values(tokenMap)} defaultValue="eth" value={selectedToken} onChange={(val) => setSelectedToken(val)} />
      </div>
      {errorMessage && <div className="text-red-500">{errorMessage}</div>}
      <div>
        <Button variant="contained" className="w-full" style={{borderRadius: 24}} onClick={onDeposit} disabled={isPending || !!sessionObj.depositInputError}>Deposit</Button>
      </div>
      <Stack spacing={1} visibility={sessionObj.depositStep < 1 ? 'hidden' : 'visible'}>
        <div className="flex gap-2 items-center">
          <ActionIcon style={{borderRadius: 24}} size="lg" loading={sessionObj.depositStep === 1} variant={sessionObj.depositStep < 1 ? 'outline' : ''}>
            {sessionObj.depositStep > 1 && <IconCheck size={18} stroke={1.5}/>}
          </ActionIcon>
          <div>Vault deposit {sessionObj.depositStep <= 1 ? sessionObj.depositStepStatus : 'confirmed'}</div>
          <div>{depositHash && genBscLink(depositHash)}</div>
        </div>
        <div className="flex gap-2 items-center">
          <ActionIcon style={{borderRadius: 24}} size="lg" loading={sessionObj.depositStep === 2} variant={sessionObj.depositStep < 2 ? 'outline' : ''}>
            {sessionObj.depositStep > 1 && <IconCheck size={18} stroke={1.5}/>}
          </ActionIcon>
          <span>Enclave Wallet update {sessionObj.depositStep <= 2 ? sessionObj.depositStepStatus : 'confirmed'}</span>
          <div>{enclaveHash && genOasisLink(enclaveHash)}</div>
        </div>
      </Stack>
    </div>
  )
}