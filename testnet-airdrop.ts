import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    formatEther,
    Address,
    PublicClient,
    WalletClient,
    TransactionReceipt,
    Chain
} from 'viem';
import { sepolia, foundry } from 'viem/chains';
import { privateKeyToAccount, PrivateKeyAccount } from 'viem/accounts';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// --- DYNAMIC CONFIGURATION ---
const ACTIVE_NETWORK = process.env.NETWORK;

// CHANGE 1: Update the config type to include an optional secondary RPC URL
type NetworkConfig = {
    rpcUrl: string;
    rpcUrlSub?: string; // Optional secondary URL
    privateKey: Address;
    chain: Chain;
    amount: string;
    delayMs: number;
};

let config: NetworkConfig;

if (ACTIVE_NETWORK === 'anvil') {
    console.log("🔥 Running in Anvil (Local) mode.");
    config = {
        rpcUrl: process.env.ANVIL_RPC_URL!,
        privateKey: process.env.ANVIL_PRIVATE_KEY! as Address,
        chain: foundry,
        amount: "0.5",
        delayMs: 100
    };
} else if (ACTIVE_NETWORK === 'sepolia') {
    console.log("🌍 Running in Sepolia (Testnet) mode.");
    config = {
        rpcUrl: process.env.SEPOLIA_RPC_URL!,
        rpcUrlSub: process.env.SEPOLIA_RPC_URL_SECONDARY, // Load the secondary URL
        privateKey: process.env.SEPOLIA_PRIVATE_KEY! as Address,
        chain: sepolia,
        amount: "0.5",
        delayMs: 2000
    };
} else {
    throw new Error(`Invalid or missing NETWORK in .env file.`);
}

if (!config.rpcUrl || !config.privateKey || config.privateKey === "0xYourSepoliaPrivateKey") {
    throw new Error(`Missing required config for "${ACTIVE_NETWORK}" in .env file.`);
}

const CSV_FILE_PATH: string = 'wallet_addresses.csv';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// CHANGE 2: A more robust retry function
async function withRpcRetry<TClient, TResult>(
    action: (client: TClient) => Promise<TResult>,
    clients: { primary: TClient; secondary?: TClient | null }
): Promise<TResult> {
    try {
        return await action(clients.primary);
    } catch (err: any) {
        const errorMessage: string = err.message.toLowerCase();
        // Check for common network-related errors
        const isNetworkError = ['timeout', 'failed to fetch', 'disconnected', 'server error', '503'].some(e => errorMessage.includes(e));

        if (isNetworkError && clients.secondary) {
            console.warn(`⚠️ Primary RPC failed. Retrying with backup... (Error: ${err.message})`);
            return await action(clients.secondary);
        } else {
            // If it's not a network error (e.g., "transaction reverted") or there's no backup, throw it.
            throw err;
        }
    }
}

// --- MAIN LOGIC ---
async function main(): Promise<void> {
    const fileContent: string = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const addresses: Address[] = (fileContent.match(/0x[a-fA-F0-9]{40}/g) || []) as Address[];
    const uniqueAddresses: Address[] = [...new Set(addresses)];
    console.log(`Found ${uniqueAddresses.length} unique addresses to process on the ${config.chain.name} network.`);

    const account: PrivateKeyAccount = privateKeyToAccount(config.privateKey);
    const amountInWei: bigint = parseEther(config.amount as `${number}`);
    console.log(`Faucet Address: ${account.address}`);
    console.log(`Amount to send per address: ${config.amount} ETH`);

    // CHANGE 3: Create primary and secondary clients
    const publicClients = {
        primary: createPublicClient({ chain: config.chain, transport: http(config.rpcUrl) }),
        secondary: config.rpcUrlSub ? createPublicClient({ chain: config.chain, transport: http(config.rpcUrlSub) }) : null
    };
    const walletClients = {
        primary: createWalletClient({ chain: config.chain, account, transport: http(config.rpcUrl) }),
        secondary: config.rpcUrlSub ? createWalletClient({ chain: config.chain, account, transport: http(config.rpcUrlSub) }) : null
    };

    const sentAddresses: Address[] = [];
    const skippedAddresses: { address: Address; reason: string }[] = [];
    const failedAddresses: { address: Address; reason: string }[] = [];
    
    for (const [index, to] of uniqueAddresses.entries()) {
        const logPrefix: string = `[${index + 1}/${uniqueAddresses.length}] -> ${to}`;

        try {
            // CHANGE 4: Wrap all blockchain calls in the retry function
            const balanceInWei = await withRpcRetry((client) => client.getBalance({ address: to }), publicClients);
            const balanceInEth: number = parseFloat(formatEther(balanceInWei));

            if (balanceInEth >= parseFloat(config.amount)) {
                console.log(`⚠️ ${logPrefix}: Skipped. Balance sufficient (${balanceInEth} ETH)`);
                skippedAddresses.push({ address: to, reason: `Balance sufficient (${balanceInEth} ETH)` });
                continue;
            }

            const hash = await withRpcRetry(
                (client) => client.sendTransaction({ account, chain: config.chain, to, value: amountInWei }),
                walletClients
            );
            console.log(`✅ ${logPrefix}: Sent. Tx Hash: ${hash}`);
            
            const receipt = await withRpcRetry(
                (client) => client.waitForTransactionReceipt({ hash }),
                publicClients
            );
            
            if (receipt.status === 'success') {
                console.log(`👍 ${logPrefix}: Confirmed successfully.`);
                sentAddresses.push(to);
            } else {
                throw new Error('Transaction failed after being mined (reverted).');
            }
        } catch (err: any) {
            console.error(`❌ ${logPrefix}: Failed. Reason: ${err.message}`);
            failedAddresses.push({ address: to, reason: err.message });
        }
        
        if (index < uniqueAddresses.length - 1) {
            await sleep(config.delayMs);
        }
    }
    
    // --- FINAL SUMMARY REPORT (unchanged) ---
    console.log("\n--- ✅ TRANSACTION COMPLETE ✅ ---");

    console.log("\n--- TRANSACTION SUMMARY ---");
    console.log(`✅ Successful: ${sentAddresses.length}`);
    console.log(`⚠️ Skipped:    ${skippedAddresses.length}`);
    console.log(`❌ Failed:      ${failedAddresses.length}`);
    console.log("\n\n--- SKIPPED / FAILED ADDRESSES ---");
    for (const address of skippedAddresses) {
    console.log(`⚠️ Skipped: ${address.address}`);
    }
    for (const address of failedAddresses) {
    console.log(`❌ Failed: ${address.address}`);
    }

    console.log("\n\n--- FAILED REASONS ---");

    for (const address of failedAddresses) {
    console.log(`\n❌ Failed: ${address.address} \nReason: ${address.reason}\n`);
  }
        // ...
}

main().catch(error => {
    console.error("\nAn unexpected script error occurred:", error);
});
