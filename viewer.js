let contractAddress = window.CONTRACT_ADDRESS;
let registryAddress = window.ERC6551_REGISTRY_ADDRESS;
let implementationAddress = window.TELEPORT_ACCOUNT_ADDRESS;
let nftContractAddress = window.NFT_CONTRACT_ADDRESS;

let provider, signer, contract, registry;
let tokenId;

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

let cooldownEndsAt = 0;

const ipfsGateway = cid =>
  typeof cid === "string" && cid.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${cid.slice(7)}`
    : cid;

window.onload = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  tokenId = parseInt(urlParams.get("id") || "1");

  bgEl.style.backgroundImage = `url(${ipfsGateway(window.BACKGROUND_CID)})`;

  if (!window.ethereum) {
    statusEl.textContent = "🦊 MetaMask required.";
    teleportBtn.disabled = true;
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    const contractABI = await fetch("contractABI.json").then(res => res.json());
    const registryABI = await fetch("registryABI.json").then(res => res.json());

    contract = new ethers.Contract(contractAddress, contractABI, signer);
    registry = new ethers.Contract(registryAddress, registryABI, provider);

    teleportBtn.addEventListener("click", onTeleport);

    await refreshUI();
    setInterval(updateCooldown, 1000);
    listenToEvents();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Connection failed.";
  }
};

async function refreshUI() {
  try {
    const state = await contract.getState(nftContractAddress, tokenId);
    cooldownEndsAt = Number(state.lastTeleport) + 86400;

    const imageCID = determineImageCID(state);
    imgEl.src = ipfsGateway(imageCID);

    messageIcon.textContent = state.isCooldown ? "⏳ Cooldown active" : "🟢 Ready";
    messageIcon.className = state.isCooldown ? "message-icon active" : "message-icon muted";

    teleportBtn.disabled = false;
    statusEl.textContent = `Token #${tokenId}`;

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
    const chainId = await provider.getNetwork().then(n => n.chainId);
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
