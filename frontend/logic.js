// Logic shared by the web page and the automated tests. Nothing here touches
// the page, so the tests can run this exact code in Node.

// Shortens an address for display, for example 0x1234...abcd.
function shortAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

// Computes a file's SHA-256 in the browser and returns it as a bytes32 value.
async function hashFile(file) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return "0x" + hex;
}

// Accepts a pasted hash with or without 0x. Returns null if it is not valid.
function normalizeHash(text) {
  const clean = text.trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(clean) ? "0x" + clean : null;
}

// Asks the registry whether a hash matches, then builds the plain-language
// result. Metadata is only loaded for an authentic logo.
async function checkLogo(registry, tokenId, hash) {
  const [authentic] = await registry.verifyLogoIntegrity(tokenId, hash);
  if (!authentic) {
    return { authentic, text: "Warning: This logo has been modified." };
  }
  const asset = await registry.getAsset(tokenId);
  return {
    authentic,
    text: "Logo Verified: This is the authentic ALU logo",
    name: asset.assetName,
    date: new Date(Number(asset.registeredAt) * 1000).toDateString(),
    registeredBy: shortAddress(asset.registeredBy),
  };
}

// Reads the total ALUT supply, formatted for display.
async function readSupply(token) {
  return formatNumber(await token.totalSupply());
}

// Sends shares and waits until the transaction is confirmed.
async function sendShares(token, recipient, amount) {
  const transaction = await token.distributeShares(recipient, amount);
  await transaction.wait();
}

// Browsers have no "module", so this export only runs under Node.
if (typeof module !== "undefined") {
  module.exports = { hashFile, normalizeHash, checkLogo, readSupply, sendShares };
}

