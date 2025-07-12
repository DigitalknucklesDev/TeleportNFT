// viewer-gallery.js
let nftContractAddress = window.NFT_CONTRACT_ADDRESS;
let provider, signer, nftContract;
let tokenId;
let userAddress;

const imgEl = document.getElementById("nft-img");
const statusEl = document.getElementById("status");
const messageIcon = document.getElementById("message");

const agentDisplay = document.createElement("div");
agentDisplay.style.color = "#0ff";
agentDisplay.style.fontSize = "13px";
agentDisplay.style.marginTop = "10px";
document.querySelector(".content").appendChild(agentDisplay);

const metaDisplay = document.createElement("div");
metaDisplay.style.color = "#0ff";
metaDisplay.style.fontSize = "13px";
metaDisplay.style.marginTop = "5px";
document.querySelector(".content").appendChild(metaDisplay);

const ipfsGateway = cid =>
  typeof cid === "string" && cid.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${cid.slice(7)}`
    : cid;

window.onload = async () => {
  if (!window.ethereum) {
    statusEl.textContent = "🦊 MetaMask required.";
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    const nftABI = await fetch("nftABI.json").then(res => res.json());
    nftContract = new ethers.Contract(nftContractAddress, nftABI, provider);

    const ownedTokenIds = await getOwnedTokens(userAddress);
    renderTokenGallery(ownedTokenIds);

    const urlParams = new URLSearchParams(window.location.search);
    const urlTokenId = parseInt(urlParams.get("id"));
    if (!isNaN(urlTokenId) && ownedTokenIds.includes(urlTokenId)) {
      selectToken(urlTokenId);
    } else if (ownedTokenIds.length > 0) {
      selectToken(ownedTokenIds[0]);
    } else {
      statusEl.textContent = "❌ No NFTs found in your wallet.";
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Connection failed.";
  }
};

async function getOwnedTokens(address) {
  const maxTokenId = 1000;
  const owned = [];

  for (let i = 0; i < maxTokenId; i++) {
    try {
      const owner = await nftContract.ownerOf(i);
      if (owner.toLowerCase() === address.toLowerCase()) {
        owned.push(i);
      }
    } catch (err) {
      // Skip invalid tokens
    }
  }

  return owned;
}

function renderTokenGallery(tokenIds) {
  const existing = document.getElementById("token-gallery");
  if (existing) existing.remove();

  const gallery = document.createElement("div");
  gallery.id = "token-gallery";
  gallery.style.display = "flex";
  gallery.style.flexWrap = "wrap";
  gallery.style.justifyContent = "center";
  gallery.style.gap = "10px";
  gallery.style.marginTop = "10px";

  tokenIds.forEach(id => {
    const btn = document.createElement("button");
    btn.textContent = `Token #${id}`;
    btn.className = "nft-button";
    btn.onclick = () => selectToken(id);
    gallery.appendChild(btn);
  });

  document.querySelector(".content").appendChild(gallery);
}

async function selectToken(id) {
  tokenId = id;
  statusEl.textContent = `Selected Token #${tokenId}`;
  await refreshUI();
}

async function refreshUI() {
  try {
    const tokenURI = await nftContract.tokenURI(tokenId);
    const metadata = await fetch(ipfsGateway(tokenURI)).then(res => res.json());
    const imageCID = metadata.image;

    imgEl.src = ipfsGateway(imageCID);
    messageIcon.textContent = `🧬 Traits Loaded`;
    updateMetaDisplay(metadata);
  } catch (err) {
    console.error("refreshUI error:", err);
    statusEl.textContent = "❌ Failed to load token data.";
  }
}

function updateMetaDisplay(meta) {
  let traits = "";

  if (meta.attributes && Array.isArray(meta.attributes)) {
    traits = meta.attributes.map(attr => {
      return `<div>🔹 <strong>${attr.trait_type}:</strong> ${attr.value}</div>`;
    }).join("");
  }

  metaDisplay.innerHTML = `
    <div>🖼️ <strong>Image:</strong> ${meta.image}</div>
    ${traits}
  `;
}
