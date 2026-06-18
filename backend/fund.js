require('dotenv').config();
const { ethers } = require('ethers');
const web3Service = require('./services/web3Service');

const addresses = [
    '0xcfdcfec2fb1e04141bb7a7db1bdf45542b048486',
    '0x21f591855af66cdb916b347bf1d7694c042cd2b1'
];

async function fundUsers() {
    await web3Service.init();

    for (const address of addresses) {
        console.log(`\nFunding ${address}...`);
        try {
            // Send 1000 CTX
            console.log("Sending 1000 CTX...");
            await web3Service.transferTokens(address, 1000);
            console.log("Successfully sent 1000 CTX.");
            
            // Check Sepolia ETH balance
            const ethBalance = await web3Service.provider.getBalance(address);
            console.log(`Current ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
            
            // Optional: Send a tiny amount of ETH for gas if Treasury has enough
            const treasuryEth = await web3Service.provider.getBalance(web3Service.treasuryWallet.address);
            if (treasuryEth > ethers.parseEther("0.003") && ethBalance < ethers.parseEther("0.001")) {
                console.log("Sending 0.001 Sepolia ETH for gas...");
                const tx = await web3Service.treasuryWallet.sendTransaction({
                    to: address,
                    value: ethers.parseEther("0.001")
                });
                await tx.wait();
                console.log("Successfully sent ETH.");
            }
        } catch (error) {
            console.error(`Failed to fund ${address}:`, error.message);
        }
    }
}

fundUsers().then(() => {
    console.log("\nDone!");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
