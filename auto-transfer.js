const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const connection = new web3.Connection('https://devnet.sonic.game', 'confirmed');

const privateKey = process.env.PRIVATE_KEY;
const recipientAddress = process.env.RECIPIENT_ADDRESS;

if (!privateKey || !recipientAddress) {
  console.error('Missing PRIVATE_KEY or RECIPIENT_ADDRESS in the .env file');
  process.exit(1);
}

const fromWallet = web3.Keypair.fromSecretKey(bs58.decode(privateKey));
const recipientPublicKey = new web3.PublicKey(recipientAddress);

const sol = 1000000000;
const lamportsToSend = Math.floor(0.0001 * sol); // Convert SOL to lamports

let transactionCount = 0;

const getRandomDelay = () => {
  return Math.floor(Math.random() * 6 + 15) * 1000; // 15-20 seconds
};

const transferToRecipient = async () => {
  try {
    const balanceMainWallet = await connection.getBalance(fromWallet.publicKey);

    if (balanceMainWallet >= lamportsToSend) {
      console.log('Wallet A balance:', balanceMainWallet);

      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: fromWallet.publicKey,
          toPubkey: recipientPublicKey,
          lamports: lamportsToSend,
        })
      );

      const signature = await web3.sendAndConfirmTransaction(connection, transaction, [fromWallet]);
      console.log('Transfer signature:', signature);

      transactionCount++;
      console.log(`Transaction #${transactionCount} completed`);

      if (transactionCount >= 100) {
        console.log('Reached 100 transactions, waiting for 24 hours...');
        setTimeout(() => {
          transactionCount = 0;
          transferToRecipient();
        }, 24 * 60 * 60 * 1000); // Wait for 24 hours
      } else {
        const delay = getRandomDelay();
        console.log(`Next transfer in ${delay / 1000} seconds`);
        setTimeout(transferToRecipient, delay);
      }
    } else {
      console.log('Not enough balance to transfer');
    }
  } catch (error) {
    console.error('Error during transfer:', error.message);
  }
};

transferToRecipient();
