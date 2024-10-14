export type Size = 'small' | 'medium' | 'large';

export type Token = {
  label: string;
  value: string;
  iconUrl?: string;
  data: {
    symbol: string;
    decimals: number;
    displaySymbol: string;
    address?: `0x${string}`;
  }
}

export type TokenBalance = {
  decimals: number; formatted: string; symbol: string; value: bigint;
};

const resolveIcon = (token: string) => {
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token}/logo.png`
}

//BSC TOKEN MAP
export const tokenMap: Record<string,Token> = {
  bnb: {
    label: 'BNB',
    value: 'bnb',
    iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
    data: {symbol: "BNB", decimals: 18, displaySymbol: "BNB"}
  },
  eth: {
    label: 'ETH',
    value: 'eth',
    iconUrl: resolveIcon('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
    data: {symbol: "ETH", decimals: 18, displaySymbol: "ETH", address: '0xd66c6B4F0be8CE5b39D52E0Fd1344c389929B378'}
  },
  usdt: {
    label: 'USDT',
    value: 'usdt',
    iconUrl: resolveIcon('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
    data: {symbol: "USDT", decimals: 18, displaySymbol: "USDT", address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'}
  }
}
