// Page behaviour: wallet connection, navigation, forms and messages.
// Logic that the automated tests also run lives in logic.js.

const config = window.DAPP;
const $ = (id) => document.getElementById(id);

// Reads go straight to the node, so the page works without a wallet.
const reader = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId, { staticNetwork: true });
const registry = new ethers.Contract(config.registryAddress, config.registryAbi, reader);
const token = new ethers.Contract(config.tokenAddress, config.tokenAbi, reader);

// Both stay null until a wallet connects. The signer is what sends transactions.
let account = null;
let signer = null;

function showNotice(text) {
  $("notice").textContent = text;
  $("notice").hidden = !text;
}

// Removes results left over from a previous wallet or network.
function clearFormMessages() {
  $("registerMessage").textContent = "";
  $("shareMessage").textContent = "";
}

// Asks the wallet directly, because it may have changed network since connecting.
async function onCorrectNetwork() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  return Number(chainId) === config.chainId;
}

const wrongNetworkText = "Wrong network. Please switch your wallet to " + config.chainName + ".";

// Turns wallet and contract errors into a sentence a user can act on.
function friendlyError(error) {
  if (error.code === "ACTION_REJECTED") return "You cancelled this in your wallet.";
  return error.reason || "Could not reach the blockchain. Please try again.";
}

// Shows the section a navigation button points to and hides the others.
document.querySelectorAll("nav button").forEach((button) => {
  button.onclick = () => {
    document.querySelectorAll(".page").forEach((page) => {
      page.hidden = page.id !== button.dataset.page;
    });
  };
});

// Switches the wallet to the dApp's network. Error 4902 means the wallet
// does not know that network yet, so it is added instead.
async function useCorrectNetwork() {
  const chainId = "0x" + config.chainId.toString(16);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId,
        chainName: config.chainName,
        rpcUrls: [config.rpcUrl],
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      }],
    });
  }
}

async function connect() {
  if (!window.ethereum) {
    showNotice("No wallet found. Install MetaMask to register logos or send shares. You can still verify logos without one.");
    return;
  }
  try {
    await useCorrectNetwork();
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await loadWallet();
  } catch (error) {
    showNotice(friendlyError(error));
  }
}

// Runs on connect and whenever the wallet changes account or network.
async function loadWallet() {
  const wallet = new ethers.BrowserProvider(window.ethereum);
  signer = await wallet.getSigner();
  account = await signer.getAddress();
  const network = await wallet.getNetwork();
  showNotice(Number(network.chainId) === config.chainId ? "" : wrongNetworkText);
  clearFormMessages();
  await refresh();
}

// Makes the page forget the wallet. The site's permission stays in MetaMask.
function disconnect() {
  account = null;
  signer = null;
  showNotice("");
  clearFormMessages();
  refresh();
}

async function refresh() {
  try {
    await refreshDashboard();
  } catch (error) {
    showNotice(friendlyError(error));
  }
}

// Redraws the header and dashboard from the contract's current values.
async function refreshDashboard() {
  $("connect").hidden = Boolean(account);
  $("disconnect").hidden = !account;
  $("totalSupply").textContent = await readSupply(token);

  $("holders").replaceChildren();
  for (const holder of config.exampleHolders) {
    const row = $("holders").insertRow();
    row.insertCell().textContent = holder.label;
    row.insertCell().textContent = shortAddress(holder.address);
    row.insertCell().textContent = formatNumber(await token.balanceOf(holder.address));
    row.insertCell().textContent = (await token.ownershipPercentage(holder.address)) + "%";
  }

  if (!account) {
    $("walletInfo").textContent = "";
    $("myBalance").textContent = "Connect your wallet";
    $("myPercent").textContent = "Connect your wallet";
    $("shareForm").hidden = true;
    $("ownerMessage").textContent = "Connect the owner wallet to send shares.";
    return;
  }

  const balance = formatNumber(await token.balanceOf(account));
  const isOwner = (await token.owner()) === account;
  $("walletInfo").textContent = shortAddress(account) + " | " + balance + " ALUT";
  $("myBalance").textContent = balance + " ALUT";
  $("myPercent").textContent = (await token.ownershipPercentage(account)) + "%";
  $("shareForm").hidden = !isOwner;
  $("ownerMessage").textContent = isOwner ? "" : "Only the contract owner can send shares. This wallet is not the owner.";
}

// Shows a green or red verdict in plain language.
function showResult(result) {
  const box = $("verifyResult");
  box.hidden = false;
  box.className = result.authentic ? "good" : "bad";
  box.textContent = (result.authentic ? "✔ " : "⚠ ") + result.text;
  if (result.authentic) {
    const details = document.createElement("p");
    details.textContent = result.name + " | Registered on " + result.date + " by " + result.registeredBy;
    box.append(details);
  }
}

async function verify(hash) {
  try {
    showResult(await checkLogo(registry, config.logoTokenId, hash));
  } catch (error) {
    showNotice(friendlyError(error));
  }
}

$("verifyFile").onchange = async (event) => {
  const file = event.target.files[0];
  if (file) await verify(await hashFile(file));
};

$("verifyHashButton").onclick = async () => {
  const hash = normalizeHash($("verifyHash").value);
  if (hash) await verify(hash);
  else showResult({ authentic: false, text: "That is not a valid fingerprint. Please check it and try again." });
};

$("registerFile").onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  $("preview").src = URL.createObjectURL(file);
  $("preview").hidden = false;
  $("contentHash").value = await hashFile(file);
  $("registerMessage").textContent = "";
};

$("registerForm").onsubmit = async (event) => {
  event.preventDefault();
  const message = $("registerMessage");
  if (!signer) {
    message.textContent = "Please connect your wallet first.";
    return;
  }
  // Browsers skip "required" on read-only fields, so check for a hash here.
  const hash = $("contentHash").value;
  if (!hash) {
    message.textContent = "Please choose an image file first.";
    return;
  }
  try {
    if (!(await onCorrectNetwork())) {
      message.textContent = wrongNetworkText;
      return;
    }
    // Checking first spares the user a failed transaction and its gas.
    if (await registry.registeredHashes(hash)) {
      message.textContent = "This file is already registered. Each file can only be registered once.";
      return;
    }
    message.textContent = "Please approve the transaction in your wallet...";
    const transaction = await registry.connect(signer).registerAsset($("assetName").value, $("fileType").value, hash);
    message.textContent = "Waiting for confirmation...";
    const receipt = await transaction.wait();
    // AssetRegistered is the last event the contract emits.
    const tokenId =registry.interface.parseLog(receipt.logs.at(-1)).args.tokenId;
    message.textContent = "Success! Your logo is registered as token ID " + tokenId + ".";
  } catch (error) {
    message.textContent = friendlyError(error);
  }
};

$("shareForm").onsubmit = async (event) => {
  event.preventDefault();
  const message = $("shareMessage");
  const recipient = $("recipient").value.trim();
  const amount = BigInt($("amount").value);
  try {
    if (!(await onCorrectNetwork())) {
      message.textContent = wrongNetworkText;
    } else if (!ethers.isAddress(recipient)) {
      message.textContent = "That wallet address is not valid.";
    } else if (amount <= 0n) {
      message.textContent = "The amount must be greater than zero.";
    } else if (amount > (await token.balanceOf(account))) {
      message.textContent = "You do not have enough ALUT.";
    } else {
      message.textContent = "Please approve the transaction in your wallet...";
      await sendShares(token.connect(signer), recipient, amount);
      message.textContent = "Done! " + formatNumber(amount) + " ALUT sent.";
      await refresh();
    }
  } catch (error) {
    message.textContent = friendlyError(error);
  }
};

$("connect").onclick = connect;
$("disconnect").onclick = disconnect;

// Keeps the page in step with changes made inside the wallet.
if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (!account) return;
    if (accounts.length) loadWallet();
    else disconnect();
  });
  window.ethereum.on("chainChanged", () => {
    if (account) loadWallet();
  });
}

refresh();

