// viewer.js (Redacted version for CID preview gallery without contract write)

import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js';

const nftContractAddress = window.NFT_CONTRACT_ADDRESS;
const ipfsGateway = (cid) =>
  typeof cid === 'string' && cid.startsWith('ipfs://')
    ? `https://ipfs.io/ipfs/${cid.slice(7)}`
    : cid;

let provider, signer, nftContract, userAddress;
const galleryRoot = document.getElementById("gallery-root");
const connectBtn = document.getElementById("connect-btn");

const cidSwapMap = window.CID_SWAP_MAP || {}; // Optional object: { tokenId: { default: cid, alt: cid } }

connectBtn?.addEventListener("click", init);
window.onload = init;

async function init() {
  if (!window.ethereum) {
    galleryRoot.innerHTML = `<p>🦊 MetaMask required.</p>`;
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    const nftABI = await fetch("nftABI.json").then(res => res.json());
    nftContract = new ethers.Contract(nftContractAddress, nftABI, provider);

    const tokenIds = await fetchOwnedTokens(userAddress);
    if (tokenIds.length === 0) {
      galleryRoot.innerHTML = `<p>❌ No NFTs found in this collection.</p>`;
    } else {
      renderGallery(tokenIds);
    }
  } catch (err) {
    console.error("Viewer init error:", err);
    galleryRoot.innerHTML = `<p>❌ Connection failed.</p>`;
  }
}

async function fetchOwnedTokens(address) {
  const maxTokenId = 1000; // adjust to your supply cap
  const owned = [];

  for (let i = 0; i < maxTokenId; i++) {
    try {
      const owner = await nftContract.ownerOf(i);
      if (owner.toLowerCase() === address.toLowerCase()) {
        owned.push(i);
      }
    } catch (_) {
      // Not minted or doesn't exist
    }
  }

  return owned;
}

async function renderGallery(tokenIds) {
  galleryRoot.innerHTML = "";

  for (const tokenId of tokenIds) {
    const container = document.createElement("div");
    container.style.margin = "20px";
    container.style.padding = "10px";
    container.style.background = "#111";
    container.style.border = "1px solid #0ff";
    container.style.borderRadius = "10px";
    container.style.maxWidth = "320px";
    container.style.textAlign = "center";

    const metadata = await fetchMetadata(tokenId);
    const img = document.createElement("img");
    img.src = ipfsGateway(metadata.image);
    img.alt = `Token #${tokenId}`;
    img.style.width = "100%";
    img.style.borderRadius = "8px";
    img.style.border = "2px solid #0ff";

    const label = document.createElement("p");
    label.innerText = `#${tokenId} – ${metadata.name || "Unnamed"}`;

    container.appendChild(img);
    container.appendChild(label);

    if (cidSwapMap[tokenId]) {
      const swapBtn = document.createElement("button");
      swapBtn.innerText = "🔁 Swap Image";
      swapBtn.onclick = () => {
        const current = img.src;
        img.src = current.includes(cidSwapMap[tokenId].alt)
          ? ipfsGateway(cidSwapMap[tokenId].default)
          : ipfsGateway(cidSwapMap[tokenId].alt);
      };
      container.appendChild(swapBtn);
    }

    galleryRoot.appendChild(container);
  }
}

async function fetchMetadata(tokenId) {
  try {
    const uri = await nftContract.tokenURI(tokenId);
    const url = ipfsGateway(uri);
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.error(`Metadata fetch failed for #${tokenId}:`, err);
    return { name: `Token #${tokenId}`, image: "" };
  }
}
