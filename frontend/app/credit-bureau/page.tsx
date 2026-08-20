import { Metadata } from 'next';
import { CreditBureauView } from '@/core/credit-bureau';

export const metadata: Metadata = {
  title: 'Sanad On-Chain Credit Bureau | Attestcoin Protocol on Creditcoin CC3',
  description: 'Cryptographically vet borrowers by verifying real historical activity on Ethereum DeFi lending platforms (Aave, Compound, Maple) via Creditcoin CC3 BlockProver precompiles.',
};

export default function CreditBureauPage() {
  return <CreditBureauView />;
}
