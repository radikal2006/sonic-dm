require('dotenv').config();
const { Keypair, PublicKey, Transaction, SystemProgram, Connection } = require('@solana/web3.js');
const bs58 = require('bs58');
const axios = require('axios');

// بارگذاری کلیدهای خصوصی و گیرنده‌ها از فایل .env
const privateKeys = process.env.PRIVATE_KEYS.split(',');
const recipients = process.env.RECIPIENTS.split(',');
const transferAmount = parseInt(process.env.TRANSFER_AMOUNT);
const rpcUrl = process.env.RPC_URL || 'https://devnet.sonic.game'; // استفاده از RPC سفارشی از فایل .env

// ایجاد یک اتصال به شبکه سولانا با RPC سفارشی
const connection = new Connection(rpcUrl, 'confirmed');

// تابع برای بارگذاری کیف پول از کلید خصوصی
function loadKeypair(privateKey) {
    const decoded = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decoded);
}

// تابع برای انتخاب تصادفی یک گیرنده از لیست
function getRandomRecipient() {
    const randomIndex = Math.floor(Math.random() * recipients.length);
    return new PublicKey(recipients[randomIndex]);
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
    for (let i = 0; i < privateKeys.length; i++) {
        const payer = loadKeypair(privateKeys[i]);
        console.log(`Wallet ${i + 1}: ${payer.publicKey.toBase58()}`);

        for (let j = 0; j < 100; j++) {
            const recipientPublicKey = getRandomRecipient();

            try {
                const signature = await transferTokens(payer, recipientPublicKey, transferAmount);
                console.log(`Transaction ${j + 1}/100 for Wallet ${i + 1} completed with signature: ${signature}`);
            } catch (error) {
                console.error(`Transaction ${j + 1}/100 for Wallet ${i + 1} failed: ${error.message}`);
            }
        }
    }
}

// زمان‌بندی اجرای اسکریپت هر 24 ساعت
setInterval(() => {
    console.log('Starting transactions...');
    performTransactions();
}, 24 * 60 * 60 * 1000); // 24 ساعت

// اولین اجرا
performTransactions();
