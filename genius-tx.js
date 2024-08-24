require('dotenv').config();
const { Keypair, Transaction, SystemProgram, Connection } = require('@solana/web3.js');
const bs58 = require('bs58');

// بارگذاری کلیدهای خصوصی از فایل .env
const privateKeys = process.env.PRIVATE_KEYS.split(',');
const transferAmount = parseInt(process.env.TRANSFER_AMOUNT);
const rpcUrl = process.env.RPC_URL || 'https://devnet.sonic.game'; // استفاده از RPC سفارشی از فایل .env

// ایجاد یک اتصال به شبکه سولانا با RPC سفارشی
const connection = new Connection(rpcUrl, 'confirmed');

// تابع برای بارگذاری کیف پول از کلید خصوصی
function loadKeypair(privateKey) {
    const decoded = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decoded);
}

// تابع برای تولید یک آدرس گیرنده تصادفی
function generateRandomRecipient() {
    const randomKeypair = Keypair.generate();
    return randomKeypair.publicKey;
}

// تابع برای انجام تراکنش
async function transferTokens(payer, recipientPublicKey, amount) {
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: recipientPublicKey,
            lamports: amount,
        })
    );

    try {
        const signature = await connection.sendTransaction(transaction, [payer]);
        await connection.confirmTransaction(signature, 'confirmed');
        return signature;
    } catch (error) {
        throw new Error(`Failed to send transaction: ${error.message}`);
    }
}

// تابع اصلی برای انجام تراکنش‌ها
async function performTransactions() {
    for (let j = 0; j < 100; j++) {
        for (let i = 0; i < privateKeys.length; i++) {
            const payer = loadKeypair(privateKeys[i]);
            const recipientPublicKey = generateRandomRecipient();

            try {
                const signature = await transferTokens(payer, recipientPublicKey, transferAmount);
                console.log(`Transaction ${j + 1}/100 for Wallet ${i + 1} completed with signature: ${signature}`);
            } catch (error) {
                console.error(`Transaction ${j + 1}/100 for Wallet ${i + 1} failed: ${error.message}`);
            }

            // وقفه 2 تا 5 ثانیه‌ای بین تراکنش‌ها
            const delay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// زمان‌بندی اجرای اسکریپت هر 24 تا 26 ساعت
setInterval(() => {
    console.log('Starting transactions...');
    performTransactions();
}, (24 * 60 * 60 * 1000) + Math.floor(Math.random() * (7200000))); // 24 تا 26 ساعت

// اولین اجرا
performTransactions();
