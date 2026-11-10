// Calls the already-deployed contracts to show they work on a live network.
// Reads the addresses saved by deploy.js in deployments/<network>.json.
//
// Usage: npx hardhat run scripts/interact.js --network sepolia
const { ethers, network } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// Example stakeholder wallet that receives shares (Hardhat test account #1).
const STAKEHOLDER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const SHARES = 100_000;

async function main() {
  const deployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "deployments", `${network.name}.json`)
    )
  );

  const registry = await ethers.getContractAt(
    "ALUAssetRegistry",
    deployment.ALUAssetRegistry
  );
  const logoToken = await ethers.getContractAt(
    "ALULogoToken",
    deployment.ALULogoToken
  );
  const [owner] = await ethers.getSigners();

  console.log("Network:", network.name);

  // 1. Hash the logo file again and check it against the blockchain record.
  const logoFile = fs.readFileSync(path.join(__dirname, "..", "alu-logo.png"));
  const logoHash =
    "0x" + crypto.createHash("sha256").update(logoFile).digest("hex");

  const asset = await registry.getAsset(deployment.logoTokenId);
  console.log("\ngetAsset:");
  console.log("  Name:         ", asset.assetName);
  console.log("  File type:    ", asset.fileType);
  console.log("  Hash:         ", asset.contentHash);
  console.log("  Registered by:", asset.registeredBy);
  console.log(
    "  Registered at:",
    new Date(Number(asset.registeredAt) * 1000).toISOString()
  );

  const [ok, okMessage] = await registry.verifyLogoIntegrity(
    deployment.logoTokenId,
    logoHash
  );
  console.log("\nverifyLogoIntegrity (real logo): ", ok, "-", okMessage);

  // 2. A tampered file produces a different hash, so the check fails.
  const tamperedFile = Buffer.concat([logoFile, Buffer.from([0])]);
  const tamperedHash =
    "0x" + crypto.createHash("sha256").update(tamperedFile).digest("hex");
  const [bad, badMessage] = await registry.verifyLogoIntegrity(
    deployment.logoTokenId,
    tamperedHash
  );
  console.log("verifyLogoIntegrity (tampered):  ", bad, "-", badMessage);

  // 3. Distribute shares once, so re-running the script does not repeat it.
  if ((await logoToken.balanceOf(STAKEHOLDER)) === 0n) {
    const transaction = await logoToken.distributeShares(STAKEHOLDER, SHARES);
    await transaction.wait();
    console.log(`\ndistributeShares(${STAKEHOLDER}, ${SHARES})`);
    console.log("  tx:", transaction.hash);
  }

  console.log("\nownershipPercentage:");
  console.log(
    "  Owner:      ",
    (await logoToken.ownershipPercentage(owner.address)).toString() + "%",
    `(${await logoToken.balanceOf(owner.address)} ALUT)`
  );
  console.log(
    "  Stakeholder:",
    (await logoToken.ownershipPercentage(STAKEHOLDER)).toString() + "%",
    `(${await logoToken.balanceOf(STAKEHOLDER)} ALUT)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
