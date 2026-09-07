# Sanad On-Chain Credit Bureau (Frontend Core)

This folder contains the core frontend components and hooks for the **Sanad On-Chain Credit Bureau** powered by the **Attestcoin Protocol** on **Creditcoin CC3 Testnet**.

## Directory Structure

- `credit-bureau-view.tsx`: The primary interactive credit bureau interface.
  - Preset borrower archetypes (Prime Whale, Active Retail, High Risk).
  - Ethereum Mainnet DeFi event discovery scanner.
  - Attestcoin cryptographic pipeline progress monitor (Merkle siblings & continuity roots).
  - On-chain Trust Score gauge (0-1000) & credit tier badge.
  - Preferential Shariah gold pawnshop lending terms calculator.
- `sanad-credit-oracle.ts`: Smart contract addresses, ABI, and Creditcoin CC3 precompile constants (`BlockProver: 0xFD2`, `ChainInfo: 0xFD3`).
- `types.ts`: TypeScript interfaces for events, summaries, and profiles.
- `index.ts`: Barrel exports for the credit bureau module.
