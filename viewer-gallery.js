let nftContractAddress = window.NFT_CONTRACT_ADDRESS;

let provider, signer, nftContract, userAddress;
let selectedTokenId = null;

const imgEl = document.getElementById("nft-img");
const statusEl = document.getElementById("status");
const messageIcon = document.getElementById("message");

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
    if (ownedTokenIds.length === 0) {
      statusEl.textContent = "❌ No NFTs found in your wallet.";
      return;
    }

    renderTokenGallery(ownedTokenIds);
    selectToken(ownedTokenIds[0]);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Error loading viewer.";
  }
};

async function getOwnedTokens(address) {
  const owned = [];
  const maxTokenId = 1000;

  for (let i = 0; i < maxTokenId; i++) {
    try {
      const owner = await nftContract.ownerOf(i);
      if (owner.toLowerCase() === address.toLowerCase()) {
        owned.push(i);
      }
    } catch (err) {
      // Token might not exist, skip
    }
  }
  return owned;
}

function renderTokenGallery(tokenIds) {
  const gallery = document.getElementById("token-gallery");
  gallery.innerHTML = "";

  tokenIds.forEach(id => {
    const btn = document.createElement("button");
    btn.textContent = `#${id}`;
    btn.className = "nft-button";
    btn.onclick = () => selectToken(id);
    gallery.appendChild(btn);
  });
}

async function selectToken(id) {
  selectedTokenId = id;
  statusEl.textContent = `Selected Token #${id}`;
  await refreshMetadata();
}

async function refreshMetadata() {
  try {
    const uri = await nftContract.tokenURI(selectedTokenId);
    const metaUrl = ipfsGateway(uri);
    const metadata = await fetch(metaUrl).then(res => res.json());

    const imageUrl = ipfsGateway(metadata.image);
    imgEl.src = imageUrl;

    messageIcon.textContent = metadata.name || `Token #${selectedTokenId}`;
  } catch (err) {
    console.error("Metadata fetch error:", err);
    messageIcon.textContent = "❌ Failed to load metadata";
  }
}
