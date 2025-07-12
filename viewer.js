const nftContractAddress = window.NFT_CONTRACT_ADDRESS;
const viewerContractAddress = window.CONTRACT_ADDRESS;

let provider, signer, nftContract;
let tokenId, userAddress;

const imgEl = document.getElementById("nft-img");
const statusEl = document.getElementById("status");
const bgEl = document.getElementById("background-layer");

const agentDisplay = document.createElement("div");
agentDisplay.className = "agent-bar";
document.body.appendChild(agentDisplay);

const metaDisplay = document.createElement("div");
metaDisplay.className = "agent-bar";
document.body.appendChild(metaDisplay);

const ipfsGateway = cid =>
  typeof cid === "string" && cid.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${cid.slice(7)}`
    : cid;

window.addEventListener("load", async () => {
  try {
    if (!window.ethereum) {
      statusEl.textContent = "🦊 MetaMask required.";
      return;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    const nftABI = await fetch("nftABI.json").then(r => r.json());
    nftContract = new ethers.Contract(nftContractAddress, nftABI, provider);

    bgEl.style.backgroundImage = `url(${ipfsGateway(window.BACKGROUND_CID)})`;

    const owned = await getOwnedTokens(userAddress);
    renderTokenGallery(owned);

    const urlParams = new URLSearchParams(window.location.search);
    const urlTokenId = parseInt(urlParams.get("id"));
    if (!isNaN(urlTokenId) && owned.includes(urlTokenId)) {
      selectToken(urlTokenId);
    } else if (owned.length > 0) {
      selectToken(owned[0]);
    } else {
      statusEl.textContent = "❌ No NFTs found.";
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Connection failed.";
  }
});

async function getOwnedTokens(address) {
  const maxTokenId = 1000;
  const owned = [];

  for (let i = 0; i < maxTokenId; i++) {
    try {
      const owner = await nftContract.ownerOf(i);
      if (owner.toLowerCase() === address.toLowerCase()) {
        owned.push(i);
      }
    } catch (err) {}
  }

  return owned;
}

function renderTokenGallery(tokenIds) {
  const existing = document.getElementById("token-gallery");
  if (existing) existing.remove();

  const gallery = document.createElement("div");
  gallery.id = "token-gallery";

  tokenIds.forEach(id => {
    const btn = document.createElement("button");
    btn.textContent = `Token #${id}`;
    btn.className = "nft-button";
    btn.onclick = () => selectToken(id);
    gallery.appendChild(btn);
  });

  document.body.insertBefore(gallery, imgEl);
}

async function selectToken(id) {
  tokenId = id;
  statusEl.textContent = `Selected Token #${tokenId}`;

  try {
    const tokenURI = await nftContract.tokenURI(tokenId);
    const json = await fetch(ipfsGateway(tokenURI)).then(r => r.json());
    imgEl.src = ipfsGateway(json.image);
    metaDisplay.innerHTML = `
      <div><strong>Name:</strong> ${json.name}</div>
      <div><strong>Description:</strong> ${json.description || "N/A"}</div>
    `;
  } catch (err) {
    console.warn("Metadata fetch failed:", err);
    imgEl.src = "";
    metaDisplay.textContent = "Metadata not available.";
  }
}
