-----

# 🚰 Chainlink Constellation Hackathon Faucet

This is a utility script designed to airdrop testnet ETH to multiple wallet addresses. It was created to help quickly distribute funds to participants at the start of the [Chainlink Constellation Hackathon](https://chain.link/hackathon).

The script is built with TypeScript and uses [`viem`](https://www.google.com/search?q=%5Bhttps://viem.sh/%5D\(https://viem.sh/\)) for efficient and robust interaction with Ethereum-based blockchains. It is configurable to work with both a local Anvil node for testing and the public Sepolia testnet for live airdrops.

## ✨ Features

  * **Dynamic Network Configuration**: Easily switch between a local Anvil testnet and the public Sepolia testnet by changing a single variable in the `.env` file.
  * **Batch Processing**: Reads a list of wallet addresses from a `wallet_addresses.csv` file to airdrop funds in bulk.
  * **Balance Check**: Intelligently skips addresses that already have a sufficient balance to save gas and time.
  * **Robust & Resilient**: Includes a retry mechanism with a fallback RPC endpoint to handle unreliable public nodes.
  * **Detailed Reporting**: Provides a clear summary of successful, skipped, and failed transactions after the script completes.

## 📋 Requirements

  * [Node.js](https://nodejs.org/) (v20.x or later recommended)
  * [pnpm](https://pnpm.io/installation) (you can also use `npm` or `yarn` with minor adjustments to commands)

## 🚀 Setup & Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/woogieboogie-jl/hackathon-distributer
    cd hackathon-distributer
    ```

2.  **Install dependencies:**
    This project uses `pnpm`.

    ```bash
    pnpm install
    ```

3.  **Set up your environment variables:**
    Copy the example `.env.example` file to a new file named `.env`.

    ```bash
    cp .env.example .env
    ```

    Now, open the `.env` file and fill in your details, especially your private key for the Sepolia network.

4.  **Prepare your recipient list:**
    Add the Ethereum addresses you want to send funds to into the `wallet_addresses.csv` file. The script will parse any `0x...` address it finds. You can list them one per line or separate them with commas.

    ```csv
    # wallet_addresses.csv

    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
    ```

## ⚙️ Configuration (`.env`)

The `.env` file is used to manage your secret keys and network configurations without hardcoding them into the script.

Create a `.env` file in the project root with the following content (you can use the `.env.example` below as a template):

```ini
# .env.example

# Set the active network for the script to use.
# Options: "anvil" or "sepolia"
NETWORK="sepolia"

# --- Anvil Configuration (for local testing) ---
ANVIL_RPC_URL="http://127.0.0.1:8545"
ANVIL_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# --- Sepolia Configuration (for public testnet) ---
# It is highly recommended to use a secure RPC provider like Alchemy or Infura
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
SEPOLIA_RPC_URL_SECONDARY="https://sepolia.gateway.tenderly.co" # Fallback RPC
SEPOLIA_PRIVATE_KEY="0xYourSepoliaPrivateKey" # !! IMPORTANT: REPLACE WITH YOUR OWN PRIVATE KEY !!
```

***Note:*** Never commit your `.env` file with real private keys to a public repository. The `.gitignore` file should always include `.env`.

## ▶️ Usage & Commands

This project uses `pnpm` scripts defined in `package.json` to run tasks.

  * **To run the airdrop script:**
    This command uses `tsx` to compile and run your TypeScript file in one step. It's the recommended way to run the faucet.

    ```bash
    pnpm exec tsx testnet-airdrop.ts
    ```

    *Before running, make sure you've set the desired `NETWORK` ("anvil" or "sepolia") in your `.env` file.*

  * **To compile your code:**
    This command uses the TypeScript compiler (`tsc`) to check for errors and build the JavaScript output into the `/dist` folder.

    ```bash
    pnpm compile
    ```

  * **To run the compiled JavaScript code:**
    This command runs the output file that was created by the `compile` script.

    ```bash
    pnpm start
    ```

-----

Happy Hacking\!
