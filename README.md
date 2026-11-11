# ALU Logo dApp

[DemoVideo: Individual_Assignment2-DApp-Integration_smartContract](https://youtu.be/fiC_qeBMTC0)

A web page that lets anyone check whether a logo file is the real ALU logo, and lets ALU register logos and distribute ALUT ownership shares. It is the frontend for the two contracts from Formative 1, which are reused here without changes.

## How it connects

| Part | Role |
| --- | --- |
| `contracts/ALUAssetRegistry.sol` | ERC-721. Stores each logo's SHA-256 hash, name, date and registering wallet. |
| `contracts/ALULogoToken.sol` | ERC-20. 1,000,000 ALUT ownership shares. |
| `frontend/` | Plain HTML, CSS and JavaScript, with no framework or build step. |
| `frontend/contracts.js` | Addresses and ABIs. `scripts/deploy.js` writes this file on every deploy. |

The page reads from the blockchain through a direct RPC connection, so reading needs no wallet and no gas. To change anything, it uses ethers.js with the user's wallet, and the wallet asks the user to approve each transaction.

## ALU logo SHA-256 hash

`alu-logo.png`, as a `bytes32` value:

```
0x838feb1f605244ddeaed00732d80e8603127202ab8c93db9b1e57fa1a7dfec76
```

## Run it

You need Node.js and a browser with MetaMask.

```bash
npm install                                              # all dependencies, including http-server
npx hardhat test                                         # 13 tests: 8 from Formative 1 + 5 frontend tests
npx hardhat node                                         # terminal 1: local blockchain
npx hardhat run scripts/deploy.js --network localhost    # terminal 2: deploy and register the logo
npx http-server frontend -p 3000 -c-1                    # terminal 2: serve the page
```

Then open http://localhost:3000.

## Public version on Sepolia

`docs/` holds the same page, connected to the contracts already deployed on Sepolia, so anyone can use it without running a blockchain. GitHub Pages serves it from the `/docs` folder of `main`:

https://josep-prog.github.io/Individual_Assignment2-DApp-Integration_smartContract/

Verifying a logo needs no wallet. Registering needs a wallet on Sepolia with test ETH, and only the deployer wallet can send shares. Run `npm run build:site` after changing anything in `frontend/`.

## Connect a wallet and use each feature

1. In MetaMask, import Hardhat account #0, the contract owner. `npx hardhat node` prints its private key. These keys are public, so never send real money to them.
2. Click **Connect Wallet**. MetaMask asks to add and switch to the Hardhat Local network, then to connect.
3. **Verify a Logo:** upload a file or paste a hash. No wallet is needed. The page shows a green or red result.
4. **Register a Logo:** choose a file, then enter a name and file type. Approve in MetaMask, and the page shows the new token ID. A file that is already registered is refused.
5. **Token Dashboard:** shows total supply, your balance and percentage, and three example holders. Only the owner sees the form for sending shares.

If you restart the local blockchain, clear the account's activity data in MetaMask's settings. Otherwise, transactions can fail with a nonce error.

## Versions

Node.js 22.23.3, Hardhat 2.29.1, ethers.js 6.17.0, Solidity 0.8.24, OpenZeppelin Contracts 5.0.2, http-server 14.1.1, jsdom 24.1.3. No frontend framework.

## Known issues and limitations

- `ownershipPercentage()` returns whole numbers, so holdings under 1% show as 0%.
- Verification always checks against the official logo's token ID, which is token 1 after a fresh deploy.
- The dashboard's example holders are fixed in `scripts/deploy.js`.
- Disconnect makes the page forget the wallet. The site's permission stays in MetaMask until you remove it there.

## Credits

Uses [ethers.js](https://docs.ethers.org/v6/), [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/), [Hardhat](https://hardhat.org/), [http-server](https://www.npmjs.com/package/http-server), [jsdom](https://github.com/jsdom/jsdom) and the browser's [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest).
