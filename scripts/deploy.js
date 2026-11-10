const { ethers, network } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

async function main() {
  // Read the actual logo from the project's main folder.
  const logoPath = path.join(__dirname, "..", "alu-logo.png");

  if (!fs.existsSync(logoPath)) {
    throw new Error(
      "Missing alu-logo.png. Add the official logo to the project folder."
    );
  }

  const logoFile = fs.readFileSync(logoPath);

  // Ethereum expects bytes32 values to start with 0x.
  const contentHash =
    "0x" + crypto.createHash("sha256").update(logoFile).digest("hex");

  const [deployer] = await ethers.getSigners();

  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("Logo SHA-256:", contentHash);

  // 1. Deploy the NFT registry.
  const Registry = await ethers.getContractFactory("ALUAssetRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  // 2. Register the logo and wait for confirmation.
  const transaction = await registry.registerAsset(
    "ALU Official Logo",
    "image/png",
    contentHash
  );
  const receipt = await transaction.wait();

  // Read the token ID from the AssetRegistered event instead of assuming it.
  const registeredEvent = receipt.logs
    .map((log) => registry.interface.parseLog(log))
    .find((parsed) => parsed && parsed.name === "AssetRegistered");
  const tokenId = registeredEvent.args.tokenId;

  const asset = await registry.getAsset(tokenId);
  const [authentic, message] = await registry.verifyLogoIntegrity(
    tokenId,
    contentHash
  );

  // 3. Deploy the ownership-share token, minting the supply to the deployer.
  const LogoToken = await ethers.getContractFactory("ALULogoToken");
  const logoToken = await LogoToken.deploy(deployer.address);
  await logoToken.waitForDeployment();

  const registryAddress = await registry.getAddress();
  const logoTokenAddress = await logoToken.getAddress();

  console.log("\nDeployment complete");
  console.log("Registry address:", registryAddress);
  console.log("Registration tx:", transaction.hash);
  console.log("Logo token ID:", tokenId.toString());
  console.log("Registered name:", asset.assetName);
  console.log("Registered hash:", asset.contentHash);
  console.log("Integrity check:", authentic, "-", message);
  console.log("ALUT contract address:", logoTokenAddress);
  console.log("ALUT total supply:", (await logoToken.totalSupply()).toString());
  console.log(
    "Owner percentage:",
    (await logoToken.ownershipPercentage(deployer.address)).toString() + "%"
  );

  // Save the addresses so they can be reused later (e.g. by the dApp).
  const outputDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, `${network.name}.json`),
    JSON.stringify(
      {
        network: network.name,
        chainId: Number((await ethers.provider.getNetwork()).chainId),
        deployer: deployer.address,
        logoSha256: contentHash,
        ALUAssetRegistry: registryAddress,
        logoTokenId: tokenId.toString(),
        registrationTx: transaction.hash,
        ALULogoToken: logoTokenAddress,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`Addresses saved to deployments/${network.name}.json`);

  const frontendConfig = {
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    chainName: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    registryAddress,
    tokenAddress: logoTokenAddress,
    logoTokenId: tokenId.toString(),
    registryAbi: Registry.interface.fragments.map((fragment) => fragment.format("full")),
    tokenAbi: LogoToken.interface.fragments.map((fragment) => fragment.format("full")),
    exampleHolders: [
      { label: "ALU Administration (owner)", address: deployer.address },
      { label: "Faculty", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
      { label: "Students", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
    ],
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "frontend", "contracts.js"),
    "window.DAPP = " + JSON.stringify(frontendConfig, null, 2) + ";\n"
  );
  console.log("Frontend settings saved to frontend/contracts.js");

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
