import { ConnectButton } from '@rainbow-me/rainbowkit';

export const Header = () => {

  return (
    <>
      <div className="flex flex-row-reverse p-4 items-center gap-8 ">
        <ConnectButton accountStatus="avatar" />
        <a className="text-blue-400 underline text-sm" href="https://www.bnbchain.org/en/testnet-faucet" target="_blank" rel="noreferrer">
          Get Testnet BNB
        </a>
      </div>
    </>
  );
}
