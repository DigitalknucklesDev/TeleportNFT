let contractAddress = window.CONTRACT_ADDRESS;
let registryAddress = window.ERC6551_REGISTRY_ADDRESS;
let implementationAddress = window.TELEPORT_ACCOUNT_ADDRESS;
let nftContractAddress = window.NFT_CONTRACT_ADDRESS;

let provider, signer, contract, registry;
let tokenId;
let userAddress;

const imgEl = document.getElementById("nft-img");
const statusEl = document.getElementById("status");
const teleportBtn = document.getElementById("teleport-btn");
const messageIcon = document.getElementById("message");
const teleportSound = document.getElementById("teleport-sound");
const bgEl = document.getElementById("background-layer");

const agentDisplay = document.createElement("div");
agentDisplay.style.color = "#0ff";
agentDisplay.style.fontSize = "13px";
agentDisplay.style.marginTop = "10px";
document.body.appendChild(agentDisplay);

const tbaBalanceDisplay = document.createElement("div");
tbaBalanceDisplay.style.color = "#fff";
tbaBalanceDisplay.style.fontSize = "12px";
tbaBalanceDisplay.style.marginTop = "4px";
document.body.appendChild(tbaBalanceDisplay);

let cooldownEndsAt = 0;

const ipfsGateway = cid =>
  typeof cid === "string" && cid.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${cid.slice(7)}`
    : cid;

window.onload = async () => {
  bgEl.style.backgroundImage = `url(${ipfsGateway(window.BACKGROUND_CID)})`;

  if (!window.ethereum) {
    statusEl.textContent = "🦊 MetaMask required.";
    teleportBtn.disabled = true;
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    const contractABI = await fetch("contractABI.json").then(res => res.json());
    const registryABI = await fetch("registryABI.json").then(res => res.json());

    const nftABI = [
      "function balanceOf(address) view returns (uint256)",
      "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)",
      "function ownerOf(uint256) view returns (address)"
    ];

    contract = new ethers.Contract(contractAddress, contractABI, signer);
    nftContract = new ethers.Contract(nftContractAddress, nftABI, provider);
    registry = new ethers.Contract(registryAddress, registryABI, provider);

    teleportBtn.addEventListener("click", onTeleport);

    const ownedTokenIds = await getOwnedTokens(userAddress);
    renderTokenGallery(ownedTokenIds);

    const urlParams = new URLSearchParams(window.location.search);
    const urlTokenId = parseInt(urlParams.get("id"));
    if (!isNaN(urlTokenId) && ownedTokenIds.includes(urlTokenId)) {
      selectToken(urlTokenId);
    } else if (ownedTokenIds.length > 0) {
      selectToken(ownedTokenIds[0]);
    } else {
      statusEl.textContent = "❌ No TeleportNFTs found in your wallet.";
    }

    setInterval(updateCooldown, 1000);
    listenToEvents();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Connection failed.";
  }
};

async function getOwnedTokens(address) {
  try {
    const balance = await nftContract.balanceOf(address);
    const ids = [];

    for (let i = 0; i < balance; i++) {
      const id = await nftContract.tokenOfOwnerByIndex(address, i);
      ids.push(id.toNumber());
    }

    return ids;
  } catch (err) {
    console.warn("Enumerable not supported. Fallback to brute-force.");
    const ids = [];
    for (let i = 0; i < 100; i++) {
      try {
        const owner = await nftContract.ownerOf(i);
        if (owner.toLowerCase() === address.toLowerCase()) {
          ids.push(i);
        }
      } catch {}
    }
    return ids;
  }
}

function renderTokenGallery(tokenIds) {
  const existingGallery = document.getElementById("token-gallery");
  if (existingGallery) existingGallery.remove();

  const gallery = document.createElement("div");
  gallery.id = "token-gallery";
  gallery.style.display = "flex";
  gallery.style.flexWrap = "wrap";
  gallery.style.justifyContent = "center";
  gallery.style.gap = "10px";
  gallery.style.margin = "10px 0";

  tokenIds.forEach(async id => {
    const state = await contract.getState(nftContractAddress, tokenId);
    const state = await contract.getState(nftContractAddress, id);
    const pairId = await contract.tokenPair(nftContractAddress, id);
    const isCooldown = state.isCooldown;
    const isMerged = state.isMerged;

    const btn = document.createElement("button");
    btn.textContent = `#${id} ${isMerged ? '🧬' : ''} ${isCooldown ? '⏳' : '🟢'} Pair: ${pairId}`;
    btn.className = "nft-button";
    btn.style.padding = "6px 12px";
    btn.style.background = "#111";
    btn.style.color = "#0ff";
    btn.style.border = "1px solid #0ff";
    btn.style.cursor = "pointer";
    btn.onclick = () => selectToken(id);
    gallery.appendChild(btn);
  });

  document.body.insertBefore(gallery, imgEl);
}

async function selectToken(id) {
  tokenId = id;
  statusEl.textContent = `Selected Token #${tokenId}`;
  await refreshUI();
}

async function refreshUI() {
  try {
    const state = await contract.getState(nftContractAddress, tokenId);
    cooldownEndsAt = Number(state.lastTeleport) + 86400;

    const imageCID = determineImageCID(state);
    imgEl.src = ipfsGateway(imageCID);

    messageIcon.textContent = state.isCooldown ? "⏳ Cooldown active" : "🟢 Ready";
    messageIcon.className = state.isCooldown ? "message-icon active" : "message-icon muted";

    teleportBtn.disabled = false;
    await updateAgentDisplay();
  } catch (err) {
    console.error("refreshUI error:", err);
    statusEl.textContent = "❌ Could not fetch state.";
  }
}

function determineImageCID(state) {
  const { isMerged, isCooldown, currentCID } = state;

  if (isMerged && isCooldown) return window.CID_MERGED_SENDING;
  if (!isMerged && isCooldown) return window.CID_SENDING;

  switch (currentCID) {
    case window.CID_MERGED: return window.CID_MERGED;
    case window.CID_DEFAULT_1: return window.CID_DEFAULT_1;
    case window.CID_DEFAULT_2: return window.CID_DEFAULT_2;
    case window.CID_EMPTY: return window.CID_EMPTY;
    default: return currentCID;
  }
}

function updateCooldown() {
  const now = Math.floor(Date.now() / 1000);
  const diff = cooldownEndsAt - now;

  if (diff > 0) {
    statusEl.textContent = `⏳ Cooldown: ${diff}s`;
    teleportBtn.classList.add("btn-disabled");
  } else {
    statusEl.textContent = `🟢 Ready`;
    teleportBtn.classList.remove("btn-disabled");
  }
}

async function onTeleport() {
  try {
    teleportBtn.disabled = true;
    statusEl.textContent = "🚀 Teleporting...";

    const toId = tokenId === 1 ? 2 : 1;
    const tx = await contract.teleport(nftContractAddress, tokenId, toId);
    await tx.wait();

    statusEl.textContent = "✅ Teleport complete!";
    await refreshUI();
  } catch (err) {
    console.error("Teleport error:", err);
    statusEl.textContent = "❌ Teleport failed.";
  } finally {
    teleportBtn.disabled = false;
  }
}

function listenToEvents() {
  contract.on("TeleportTriggered", async (_nft, fromId, toId) => {
    if ([fromId, toId].map(Number).includes(tokenId)) {
      teleportSound.currentTime = 0;
      teleportSound.play();
      document.body.style.filter = "invert(1)";
      setTimeout(() => (document.body.style.filter = "invert(0)"), 600);
      await refreshUI();
    }
  });

  contract.on("CooldownStarted", async (_nft, tId) => {
    if (Number(tId) === tokenId) await refreshUI();
  });
}

async function updateAgentDisplay() {
  try {
    const network = await provider.getNetwork();
    const chainId = network.chainId;
    const tbaAddress = await registry.account(
      implementationAddress,
      chainId,
      nftContractAddress,
      tokenId,
      0
    );
    agentDisplay.textContent = `Executor (Agent): ${tbaAddress}`;

    const balance = await provider.getBalance(tbaAddress);
    tbaBalanceDisplay.textContent = `💰 TBA Balance: ${ethers.utils.formatEther(balance)} ETH`;
  } catch (err) {
    console.warn("ERC-6551 resolution failed:", err);
    agentDisplay.textContent = "Executor (Agent): Unknown";
    tbaBalanceDisplay.textContent = "";
  }
}
