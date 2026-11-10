// Prints the SHA-256 hash of the ALU logo so it can be screenshotted for the
// report and pasted into the README.
//
// Usage: node scripts/hash-logo.js [path-to-file]
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const logoPath = path.resolve(
  process.argv[2] || path.join(__dirname, "..", "alu-logo.png")
);

const logoFile = fs.readFileSync(logoPath);
const hash = crypto.createHash("sha256").update(logoFile).digest("hex");

console.log("File:          ", logoPath);
console.log("Size (bytes):  ", logoFile.length);
console.log("SHA-256:       ", hash);
console.log("bytes32 value: ", "0x" + hash);
