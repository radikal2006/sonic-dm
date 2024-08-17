# sonic-dm
اسکریپت خاص سونیک ، برای مولتی.زن ها 
این اسکریپت از یک ولت تا 100 ولت برای شما هر 24 ساعت 100 تراکنش میزنه و بعد از 100 تراکنش متوقف میشه تا 24 ساعت اینده
و شما فقط روزانه باید برید و باکس هارو کلایم کنید

**1. نصب Node.js و npm**
```
sudo apt update
sudo apt install -y nodejs npm
```
**بررسی نصب:**
`node -v
npm -v`
**2. ایجاد پوشه پروژه و ورود به آن:**
`mkdir my-solana-project
cd my-solana-project`
**3. راه‌اندازی npm و ایجاد فایل package.json:**
`npm init -y`
**4. نصب وابستگی‌ها**
`npm install @solana/web3.js dotenv bs58 axios`
اگر همه باهم نصب نشدند باید یکی یکی نصب کنید...
`npm install @solana/web3.js`
`npm install dotenv`
`npm install bs58`
`npm install axios`

**5. ویرایش فایل .env**
`nano .env`
در خط اول پرایوت کی کیف پول های خودتون رو باید جایگذاری کنید...
در خط دوم ادرس کیف پول های تون رو (کیف پول ها باید فاست داشته باشن)
و بخش سوم و چهارم رو دست نزنید
بخش سوم مقدار توکن ارسالی در هرتراکنش هست و بخش چهارم RPC سونیک
`PRIVATE_KEYS=key1,key2,key3
RECIPIENTS=recipient1,recipient2,recipient3
TRANSFER_AMOUNT=1000000
RPC_URL=https://devnet.sonic.game`
**اجرای اسکریپت**
`node multiWalletTransfer.js`
