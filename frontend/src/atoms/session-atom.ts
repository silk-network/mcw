import {atom} from "recoil";

export type SessionModel = {
  chainId: number;
  chainName: string;
  address: string;
  depositStep: number;
  depositStepStatus: string;
  depositInputError: string;
  withdrawStep: number;
  withdrawStepStatus: string;
  withdrawInputError: string;
}

export const sessionAtom = atom<SessionModel>({
  key: 'sessionAtom',
  default: {
    chainId: 0,
    chainName: '',
    address: '',
    depositStep: 0,
    depositStepStatus: 'pending',
    depositInputError: '',
    withdrawStep: 0,
    withdrawStepStatus: 'pending',
    withdrawInputError: ''
  }
});