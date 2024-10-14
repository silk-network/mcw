
import {
  createPublicClient,
  formatEther,
  stringify,
  type Hex,
  http, maxUint256,
  type PublicClient, Chain,
} from "viem";
import {appEnv} from "../appEnv.ts";
import {enclaveWalletAbi, chainVaultAbi, cryptoFacetAbi} from "../abi.ts";
import {useRecoilState} from "recoil";
import {sessionAtom, SessionModel} from "../atoms/session-atom.ts";
import {useEffect, useMemo, useRef, useState} from "react";
import {useAccount, useReadContract} from "wagmi";
import {randomBytes} from "crypto";
import {bscTestnet, hardhat, mainnet, sapphireTestnet} from "viem/chains";
import {useNexusWatch} from "./useNexusWatch.ts";

//

// let enclaveRead: PublicClient;
// let enclaveWrite: WalletClient;
// let signerAddress: Hex;

export function useEnclaveService  () {
  const {chain: destinationChain, address: recipientAddress} = useAccount();
  const [sessionObj, setSessionObj] = useRecoilState<SessionModel>(sessionAtom);
  // const [monitorExecutor, setMonitorExecutor] = useState(false);
  // const [executorEventComplete, setExecutorEventComplete] = useState(false);
  const [signerAddress, setSignerAddress] = useState<Hex>();
  const [balance, setBalance] = useState(0n);
  const [error, setError] = useState('');
  const publicClientRef = useRef<PublicClient>(null);
  const { startWatching, confirmedHash } = useNexusWatch();


  // const busFee = useReadContract({
  //   address: appEnv.CHAIN_VAULT_ADDR,
  //   abi: chainVaultAbi,
  //   functionName: 'estimateIOFee',
  //   args: []
  // });

  useEffect(() => {
    if (destinationChain && recipientAddress) {
      if (sessionObj.chainId !== destinationChain.id || sessionObj.address !== recipientAddress) {
        console.log("chain", destinationChain.name);
        setSessionObj({
          ...sessionObj,
          chainId: destinationChain.id,
          address: recipientAddress,
          chainName: destinationChain.name
        });
        updateChains();
      }
    }
  }, [destinationChain, recipientAddress])

  async function updateChains() {

    let sapphireChain: Chain = appEnv.SAPPHIRE_NETWORK === 'localnet' ? hardhat : null;

    if (!sapphireChain) {
      sapphireChain = {
        ...sapphireTestnet,
        rpcUrls: {
          default: {
            http: ['https://oasis-sapphire-testnet.core.chainstack.com/717a67183dd6eb1fe88d7652eb772827'],
            webSocket: ['wss://oasis-sapphire-testnet.core.chainstack.com/717a67183dd6eb1fe88d7652eb772827'],
          },
        }
      }
    }

    //@ts-ignore
    //TODO - point to Sapphire testnet
    publicClientRef.current = createPublicClient({ chain: sapphireChain, transport: http() })

    try {
      const addr = await publicClientRef.current.readContract({
        address: appEnv.ENCLAVE_WALLET_ADDR,
        abi: cryptoFacetAbi,
        functionName: 'getSignerAddress',
        args: []
      });

      setSignerAddress(addr);

      console.log('signerAddress', addr);

      if (addr === "0x0000000000000000000000000000000000000000") {
        console.error('Signer address not found');
      }
    }
    catch(e) {
      setError(`Unable to connect to the Enclave smart contracts on "${appEnv.SAPPHIRE_NETWORK}"`);
    }
  }

  async function getBalance() {

    console.log('getBalance', appEnv.ENCLAVE_WALLET_ADDR, recipientAddress);

    try {
      const result = await publicClientRef.current.readContract({
        address: appEnv.ENCLAVE_WALLET_ADDR,
        abi: enclaveWalletAbi,
        functionName: 'getBalance',
        args: [BigInt(destinationChain.id), recipientAddress]
      });

      console.log('connected', formatEther(result));

      setBalance(result);

      return result;
    }
    catch(e) {
      return 0n;
    }
  }

  async function getTokenBalance(asset: Hex) {

    const result = await publicClientRef.current.readContract({
      address: appEnv.ENCLAVE_WALLET_ADDR,
      abi: enclaveWalletAbi,
      functionName: 'getTokenBalance',
      args: [BigInt(destinationChain.id), recipientAddress, asset]
    })

    console.log('connected', formatEther(result));

    return result;
  }

  const getWithdrawIntent = async (amount: bigint) => {

    const nonce = randomBytes(24).toString('hex');
    console.log('nonce', nonce);
    const intent = { signer: signerAddress, amount, recipient: recipientAddress, nonce: BigInt('0x' + nonce), deadline: maxUint256 };
    console.log('intent', intent);
    const options = {
      account: recipientAddress,
      address: appEnv.ENCLAVE_WALLET_ADDR,
      abi: enclaveWalletAbi,
      functionName: 'signWithdrawIntent',
      args: [intent, BigInt(destinationChain.id), appEnv.CHAIN_VAULT_ADDR]
    } as const;

    let sig = await publicClientRef.current.readContract(options);

    console.log('intent.sig', sig);

    return {intent, sig};
  }

  const startMonitoring = (address: string) => {
    console.log('startMonitoring', address);
    startWatching(address);
  }

  return {
    error,
    balance,
    getBalance,
    getTokenBalance,
    getWithdrawIntent,
    startMonitoring,
    enclaveHash: confirmedHash
  }

}
