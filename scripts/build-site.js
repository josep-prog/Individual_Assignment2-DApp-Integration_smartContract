const { ethers } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

// Builds docs/, a copy of the frontend that talks to the contracts already
// deployed on Sepolia, ready for static hosting such as GitHub Pages.
// Nothing is deployed and no private key is needed.

// Published in the page, so this must be a public URL with no API key in it.
const publicRpcUrl =
  process.env.FRONTEND_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

async function main() {
  const root = path.join(__dirname, "..");
  const site = path.join(root, "docs");
  const deployment = JSON.parse(
    fs.readFileSync(path.join(root, "deployments", "sepolia.json"), "utf8")
  );

  const Registry = await ethers.getContractFactory("ALUAssetRegistry");
  const LogoToken = await ethers.getContractFactory("ALULogoToken");

  fs.mkdirSync(site, { recursive: true });
  for (const file of ["index.html", "style.css", "app.js", "logic.js", "ethers.umd.min.js"]) {
    fs.copyFileSync(path.join(root, "frontend", file), path.join(site, file));
  }

  const config = {
    chainId: deployment.chainId,
    chainName: "Sepolia",
    rpcUrl: publicRpcUrl,
    registryAddress: deployment.ALUAssetRegistry,
    tokenAddress: deployment.ALULogoToken,
    logoTokenId: deployment.logoTokenId,
    registryAbi: Registry.interface.fragments.map((fragment) => fragment.format("full")),
    tokenAbi: LogoToken.interface.fragments.map((fragment) => fragment.format("full")),
    exampleHolders: [
      { label: "ALU Administration (owner)", address: deployment.deployer },
      { label: "Faculty", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
      { label: "Students", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
    ],
  };
  fs.writeFileSync(
    path.join(site, "contracts.js"),
    "window.DAPP = " + JSON.stringify(config, null, 2) + ";\n"
  );

  // Tells GitHub Pages to serve the files as they are.
  fs.writeFileSync(path.join(site, ".nojekyll"), "");

  console.log("Sepolia site written to docs/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
