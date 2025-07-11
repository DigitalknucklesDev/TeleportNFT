import fs from "fs";

const deployed = {
  TELEPORT_NFT: "0xYourNFT...",
  ACCOUNT_IMPL: "0xAccountImpl...",
  REGISTRY: "0xRegistry...",
  BACKGROUND_CID: "ipfs://...",
  CID_DEFAULT_1: "ipfs://...",
  CID_DEFAULT_2: "ipfs://...",
  CID_MERGED: "ipfs://...",
  CID_EMPTY: "ipfs://...",
  CID_MERGED_SENDING: "ipfs://...",
  CID_SENDING: "ipfs://..."
};

let config = fs.readFileSync("config.template.js", "utf-8");

for (const [key, value] of Object.entries(deployed)) {
  config = config.replaceAll(`__${key}__`, value);
}

fs.writeFileSync("config.js", config);
console.log("✅ config.js injected with deployed values");