import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    formatEther,
    Address,
    PublicClient,
    WalletClient,
    TransactionReceipt
} from 'viem';
// CHANGE 1: Import the chain definition for Foundry/Anvil
import { foundry } from 'viem/chains';
import { privateKeyToAccount, PrivateKeyAccount } from 'viem/accounts';
import fs from 'fs';

// --- CONFIGURATION FOR ANVIL ---

// CHANGE 2: Point RPC URL to your local Anvil instance
const ANVIL_RPC_URL: string = "http://127.0.0.1:8545"; 

// CHANGE 3: Use a private key from the Anvil startup log
const PRIVATE_KEY: Address = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; 

const AMOUNT_PER_ADDRESS: string = "0.5";
const CSV_FILE_PATH: string = 'wallet_addresses.csv'; // Make sure this file exists

// The retry wrapper isn't strictly necessary for a stable local node, but we can leave it.
async function withRpcRetry<TClient, TResult>(
    action: (client: TClient) => Promise<TResult>,
    clients: { primary: TClient; backup: TClient }
): Promise<TResult> {
    try {
        // For local testing, we only need to try the primary client.
        return await action(clients.primary);
    } catch (err: any) {
        console.error("Local Anvil RPC call failed. Ensure Anvil is running.", err.message);
        throw err;
    }
}

// --- MAIN LOGIC ---
async function main(): Promise<void> {
    const fileContent: string = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const addresses: Address[] = (fileContent.match(/0x[a-fA-F0-9]{40}/g) || []) as Address[];
    const uniqueAddresses: Address[] = [...new Set(addresses)];
    console.log(`Found ${uniqueAddresses.length} unique addresses to process.`);

    const account: PrivateKeyAccount = privateKeyToAccount(PRIVATE_KEY);
    const amountInWei: bigint = parseEther(AMOUNT_PER_ADDRESS);

    // CHANGE 4: Add the `chain` object to the clients
    const publicClients = {
        primary: createPublicClient({ chain: foundry, transport: http(ANVIL_RPC_URL) }) as PublicClient,
        // Backup client points to the same local instance.
        backup: createPublicClient({ chain: foundry, transport: http(ANVIL_RPC_URL) }) as PublicClient,
    };
    const walletClients = {
        primary: createWalletClient({ chain: foundry, account, transport: http(ANVIL_RPC_URL) }) as WalletClient,
        backup: createWalletClient({ chain: foundry, account, transport: http(ANVIL_RPC_URL) }) as WalletClient,
    };

    const sentAddresses: Address[] = [];
    const skippedAddresses: { address: Address; reason: string }[] = [];
    const failedAddresses: { address: Address; reason: string }[] = [];
    
    // The rest of the logic remains the same
    for (let i = 0; i < uniqueAddresses.length; i++) {
        const to: Address = uniqueAddresses[i];
        const logPrefix: string = `[${i + 1}/${uniqueAddresses.length}] -> ${to}`;

        try {
            const balanceInWei = await withRpcRetry(
                (client) => client.getBalance({ address: to }),
                publicClients
            );
            const balanceInEth: number = parseFloat(formatEther(balanceInWei));

            if (balanceInEth >= parseFloat(AMOUNT_PER_ADDRESS)) {
                console.log(`⚠️ ${logPrefix}: Skipped. Balance is ${balanceInEth} ETH.`);
                skippedAddresses.push({ address: to, reason: `Balance sufficient (${balanceInEth} ETH)` });
                continue;
            }

            const hash = await withRpcRetry(
                (client) => client.sendTransaction({ account, chain:foundry, to, value: amountInWei }),
                walletClients
            );
            console.log(`✅ ${logPrefix}: Sent. Tx Hash: ${hash}`);
            
            const receipt: TransactionReceipt = await publicClients.primary.waitForTransactionReceipt({ hash });
            
            if (receipt.status === 'success') {
                console.log(`👍 ${logPrefix}: Confirmed successfully.`);
                sentAddresses.push(to);
            } else {
                throw new Error('Transaction failed after being mined (reverted).');
            }
        } catch (err: any) {
            console.error(`❌ ${logPrefix}: Failed. Reason: ${err.message}`);
            failedAddresses.push({address: to, reason: err.message});
        }
    }
        // --- FINAL SUMMARY REPORT ---
    console.log("\n--- ✅ TRANSACTION COMPLETE ✅ ---");
    console.log(`\nSuccessfully Sent: ${sentAddresses.length}`);
    console.log(`Skipped:           ${skippedAddresses.length}`);
    console.log(`Failed:            ${failedAddresses.length}`);

    if (skippedAddresses.length > 0) {
        console.log("\n--- ⚠️ Skipped Addresses ---");
        skippedAddresses.forEach(s => console.log(`${s.address}: ${s.reason}`));
    }

    if (failedAddresses.length > 0) {
        console.log("\n--- ❌ Failed Addresses ---");
        failedAddresses.forEach(f => console.log(`${f.address}: ${f.reason}`));
    }
    
}

main().catch(error => {
    console.error("An unexpected error occurred:", error);
});
