function shortAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

async function hashFile(file) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return "0x" + hex;
}

function normalizeHash(text) {
  const clean = text.trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(clean) ? "0x" + clean : null;
}

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

async function readSupply(token) {
  return formatNumber(await token.totalSupply());
}

async function sendShares(token, recipient, amount) {
  const transaction = await token.distributeShares(recipient, amount);
  await transaction.wait();
}

if (typeof module !== "undefined") {
  module.exports = { hashFile, normalizeHash, checkLogo, readSupply, sendShares };
}

