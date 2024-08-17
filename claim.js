const fs = require('fs');
require('colors');
const solana = require('@solana/web3.js');
const axios = require('axios').default;
const base58 = require('bs58');
const nacl = require('tweetnacl');
const { connection } = require('./src/solanaUtils');
const { HEADERS } = require('./src/headers');
const { displayHeader } = require('./src/displayUtils');
const moment = require('moment');

const PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));

function getKeypair(privateKey) {
  const decodedPrivateKey = base58.decode(privateKey);
  return solana.Keypair.fromSecretKey(decodedPrivateKey);
}

async function getToken(privateKey) {
  try {
    const { data } = await axios({
      url: 'https://odyssey-api-beta.sonic.game/auth/sonic/challenge',
      params: {
        wallet: getKeypair(privateKey).publicKey,
      },
      headers: HEADERS,
    });

    const sign = nacl.sign.detached(
      Buffer.from(data.data),
      getKeypair(privateKey).secretKey
    );
    const signature = Buffer.from(sign).toString('base64');
    const publicKey = getKeypair(privateKey).publicKey;
    const encodedPublicKey = Buffer.from(publicKey.toBytes()).toString(
      'base64'
    );
    const response = await axios({
      url: 'https://odyssey-api-beta.sonic.game/auth/sonic/authorize',
      method: 'POST',
      headers: HEADERS,
      data: {
        address: publicKey,
        address_encoded: encodedPublicKey,
        signature,
      },
    });

    return response.data.data.token;
  } catch (error) {
    console.log(`Error fetching token: ${error}`.red);
  }
}

async function getProfile(token) {
  try {
    const { data } = await axios({
      url: 'https://odyssey-api-beta.sonic.game/user/rewards/info',
      method: 'GET',
      headers: { ...HEADERS, Authorization: token },
    });

    return data.data;
  } catch (error) {
    console.log(`Error fetching profile: ${error}`.red);
  }
}

async function doTransactions(tx, keypair, retries = 3) {
  try {
    const bufferTransaction = tx.serialize();
    const signature = await connection.sendRawTransaction(bufferTransaction);
    await connection.confirmTransaction(signature);
    return signature;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying transaction... (${retries} retries left)`.yellow);
      await new Promise((res) => setTimeout(res, 1000));
      return doTransactions(tx, keypair, retries - 1);
    } else {
      console.log(`Error in transaction: ${error}`.red);
      throw error;
    }
  }
}

async function openAllMysteryBoxes(token, keypair) {
  const profile = await getProfile(token);
  const availableBoxes = profile.ring_monitor;

  for (let i = 0; i < availableBoxes; i++) {
    try {
      console.log(`[ ${moment().format('HH:mm:ss')} ] Opening box ${i + 1} of ${availableBoxes}`.yellow);
      const { data } = await axios({
        url: 'https://odyssey-api-beta.sonic.game/user/rewards/mystery-box/build-tx',
        method: 'GET',
        headers: { ...HEADERS, Authorization: token },
      });

      const txBuffer = Buffer.from(data.data.hash, 'base64');
      const tx = solana.Transaction.from(txBuffer);
      tx.partialSign(keypair);
      const signature = await doTransactions(tx, keypair);
      const response = await axios({
        url: 'https://odyssey-api-beta.sonic.game/user/rewards/mystery-box/open',
        method: 'POST',
        headers: { ...HEADERS, Authorization: token },
        data: {
          hash: signature,
        },
      });

      if (response.data.success) {
        console.log(`[ ${moment().format('HH:mm:ss')} ] Box ${i + 1} opened successfully! Status: ${response.data.status} | Amount: ${response.data.data.amount}`.green);
      }
    } catch (error) {
      console.log(`[ ${moment().format('HH:mm:ss')} ] Error opening box ${i + 1}: ${error}`.red);
      continue;
    }
  }

  console.log(`[ ${moment().format('HH:mm:ss')} ] All boxes opened!`.cyan);
}

async function claimAllRewards(token) {
  let counter = 1;
  let maxCounter = 3;

  while (counter <= maxCounter) {
    try {
      const { data } = await axios({
        url: 'https://odyssey-api.sonic.game/user/transactions/rewards/claim',
        method: 'POST',
        headers: { ...HEADERS, Authorization: token },
        data: {
          stage: counter,
        },
      });

      console.log(
        `[ ${moment().format('HH:mm:ss')} ] Daily claim for stage ${counter} has been successful! Stage: ${counter} | Status: ${
          data.data.claimed
        }`
      );

      counter++;
    } catch (error) {
      if (error.response.data.message === 'interact task not finished') {
        console.log(
          `[ ${moment().format(
            'HH:mm:ss'
          )} ] Error claiming for stage ${counter}: ${
            error.response.data.message
          }`.red
        );
        counter++;
      } else if (
        error.response &&
        (error.response.data.code === 100015 ||
          error.response.data.code === 100016)
      ) {
        console.log(
          `[ ${moment().format(
            'HH:mm:ss'
          )} ] Already claimed for stage ${counter}, proceeding to the next stage...`
            .cyan
        );
        counter++;
      } else {
        console.log(
          `[ ${moment().format('HH:mm:ss')} ] Error claiming: ${
            error.response.data.message
          }`.red
        );
      }
    }
  }

  console.log(`[ ${moment().format('HH:mm:ss')} ] All rewards claimed!`.green);
}

async function processPrivateKey(privateKey) {
  try {
    const publicKey = getKeypair(privateKey).publicKey.toBase58();
    const token = await getToken(privateKey);
    const profile = await getProfile(token);

    if (profile.wallet_balance > 0) {
      const balance = profile.wallet_balance / solana.LAMPORTS_PER_SOL;
      const ringBalance = profile.ring;
      const availableBoxes = profile.ring_monitor;
      console.log(
        `Hello ${publicKey}! Welcome to our bot. Here are your details:`.green
      );
      console.log(`Solana Balance: ${balance} SOL`.green);
      console.log(`Ring Balance: ${ringBalance}`.green);
      console.log(`Available Box(es): ${availableBoxes}`.green);
      console.log('');

      console.log(`[ ${moment().format('HH:mm:ss')} ] Claiming all rewards...`.yellow);
      await claimAllRewards(token);

      console.log(`[ ${moment().format('HH:mm:ss')} ] Opening all mystery boxes...`.yellow);
      await openAllMysteryBoxes(token, getKeypair(privateKey));

      console.log(`[ ${moment().format('HH:mm:ss')} ] All tasks completed!`.cyan);
    } else {
      console.log(
        `There might be errors if you don't have sufficient balance or the RPC is down. Please ensure your balance is sufficient and your connection is stable`
          .red
      );
    }
  } catch (error) {
    console.log(`Error processing private key: ${error}`.red);
  }
  console.log('');
}

(async () => {
  try {
    displayHeader();
    for (let i = 0; i < PRIVATE_KEYS.length; i++) {
      const privateKey = PRIVATE_KEYS[i];
      await processPrivateKey(privateKey);
      if (i < PRIVATE_KEYS.length - 1) {
        const continueNext = readlineSync.keyInYNStrict(
          `Do you want to process next private key?`
        );
        if (!continueNext) break;
      }
    }
    console.log('All private keys processed.'.cyan);
  } catch (error) {
    console.log(`Error in bot operation: ${error}`.red);
  } finally {
    console.log(
      'Thanks for having us! Subscribe: https://t.me/HappyCuanAirdrop'.magenta
    );
  }
})();

