import {useEffect, useRef, useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {appEnv} from "../appEnv.ts";

type NexusTx = {
  total_count: number,
  events: {
    eth_tx_hash: string,
  }[]
}

function fetchReq<T>(url: string): Promise<T> {
  return fetch(url).then(res => res.json());
}

async function getTxCount() {
  const result = await fetchReq<NexusTx>(`https://testnet.nexus.oasis.io/v1/sapphire/events?limit=1&rel=${appEnv.DEPLOYER_ADDRESS}`);
  return { count: result.total_count, hash: result.events[0].eth_tx_hash };
}

async function isAddressConfirmed(address: string, tx: string) {
  const result = await fetchReq<{transactions:[{body:{data:string}}]}>(`https://testnet.nexus.oasis.io/v1/sapphire/transactions/${tx}`);
  if (result && result.transactions) {
    const base64Data = result.transactions[0].body.data;
    const hexData = Buffer.from(base64Data, 'base64').toString('hex');
    // console.log('Checking hexData2', address, hexData);
    return hexData.includes(address.slice(2).toLowerCase());
  }
  return false;
}

export const useNexusWatch = () => {

  const [address, setAddress] = useState('');
  const [confirmedHash, setConfirmedHash] = useState('');
  const [startTxCount, setStartTxCount] = useState(0);
  const timerRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    }
  }, []);

  const query = useQuery({
    queryKey: ['nexusWatch', startTxCount],
    queryFn: async () => {

      console.log('Nexus queryFn', startTxCount);

      if (!address || !startTxCount) return Promise.resolve(true);

      const tx = await getTxCount();
      console.log(`Checking tx count: ${tx.count}`, startTxCount);
      if (tx.count > startTxCount) {
        const isConfirmed = await isAddressConfirmed(address, tx.hash);
        console.log(`Address confirmed: ${isConfirmed}`, address);
        if (isConfirmed) {
          setStartTxCount(0);
          setConfirmedHash('0x' + tx.hash);
          setAddress('');
        }
        else {
          setStartTxCount(tx.count);
        }
      }

      timerRef.current = setTimeout(() => queryClient.invalidateQueries({ queryKey: ['nexusWatch', startTxCount] }), 5000);
      console.log('Rechecking in 5 seconds');

      return Promise.resolve(true);
    },
  })

  async function startWatching(address: string) {
    console.log(`Watching address: ${address}`);
    setAddress(address);
    setConfirmedHash('');

    const tx = await getTxCount()
    setStartTxCount(tx.count);
    console.log(`Watching address, startTxCount: ${tx.count}`);

    queryClient.invalidateQueries({ queryKey: ['nexusWatch', startTxCount] })
  }

  function stopWatching() {
    setAddress('');
    setStartTxCount(0);
    setConfirmedHash('');
  }

  return {
    startWatching,
    stopWatching,
    confirmedHash
  };
}