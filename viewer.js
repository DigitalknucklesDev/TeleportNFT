const contractAddress = window.CONTRACT_ADDRESS;
const registryAddress = window.ERC6551_REGISTRY_ADDRESS;
const implementationAddress = window.TELEPORT_ACCOUNT_ADDRESS;
const nftContractAddress = window.NFT_CONTRACT_ADDRESS;

let provider, signer, contract, registry, nftContract;
let tokenId, userAddress;

const imgEl = document.getElementById("nft-img");
const statusEl = document.getElementById("status");
const teleportBtn = document.getElementById("teleport-btn");
const messageIcon = document.getElementById("message");
const teleportSound = document.getElementById("teleport-sound");
const bgEl = document.getElementById("background-layer");

const agentDisplay = document.createElement("div");
agentDisplay.className = "agent-bar";
document.body.appendChild(agentDisplay);

const metaDisplay = document.createElement("div");
metaDisplay.className = "agent-bar";
document.body.appendChild(metaDisplay);

let cooldownEndsAt = 0;

const ipfsGateway = cid =>
  typeof cid === "string" && cid.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${cid.slice(7)}`
    : cid;

window.addEventListener("load", async () => {
  try {
    if (!window.ethereum) {
      statusEl.textContent = "🦊 MetaMask required.";
      teleportBtn.disabled = true;
      return;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    const [contractABI, registryABI, nftABI] = await Promise.all([
      fetch("contractABI.json").then(r => r.json()),
      fetch("registryABI.json").then(r => r.json()),
      fetch("nftABI.json").then(r => r.json())
    ]);

    contract = new ethers.Contract(contractAddress, contractABI, signer);
    registry = new ethers.Contract(registryAddress, registryABI, provider);
    nftContract = new ethers.Contract(nftContractAddress, nftABI, provider);

    teleportBtn.addEventListener("click", onTeleport);

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
      statusEl.textContent = "❌ No TeleportNFTs found in wallet.";
    }

    setInterval(updateCooldown, 1000);
    listenToEvents();
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
    updateMetaDisplay(state);
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
      if (teleportSound) {
        teleportSound.currentTime = 0;
        teleportSound.play().catch(() => {});
      }
      document.body.classList.add("flash");
      setTimeout(() => document.body.classList.remove("flash"), 600);
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
    const accountAddress = await registry.account(
      implementationAddress,
      chainId,
      nftContractAddress,
      tokenId,
      0
    );
    agentDisplay.textContent = `Executor (Agent): ${accountAddress}`;
  } catch (err) {
    console.warn("ERC-6551 resolution failed:", err);
    agentDisplay.textContent = "Executor (Agent): Unknown";
  }
}

function updateMetaDisplay(state) {
  metaDisplay.innerHTML = `
    <div>🧬 <strong>isMerged:</strong> ${state.isMerged}</div>
    <div>⏳ <strong>isCooldown:</strong> ${state.isCooldown}</div>
    <div>🖼️ <strong>currentCID:</strong> ${state.currentCID}</div>
  `;
}
