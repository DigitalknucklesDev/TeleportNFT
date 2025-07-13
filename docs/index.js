// Load from config
const CONTRACT_ADDRESS = window.CONTRACT_ADDRESS;
const CONTRACT_ABI = window.CONTRACT_ABI;

// DOM elements
const nftImage = document.getElementById("nftImage");
const overlay = document.getElementById("overlay");
const statusEl = document.getElementById("status");
const sound = document.getElementById("teleport-sound");
const toggleBtn = document.getElementById("teleport-toggle");
const floatBtn = document.getElementById("teleport-float");

// State order for toggling
const stateOrder = ["CID_MERGED", "CID_SENDING", "CID_DEFAULT_2", "CID_GHOST"];
let currentIndex = 0;

let tokenId = 1; // Default fallback

const ipfsGateway = cid =>
  cid.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${cid.slice(7)}` : `https://ipfs.io/ipfs/${cid}`;

// Define all state CIDs
const stateCIDs = {
  CID_MERGED: window.CID_MERGED,
  CID_SENDING: window.CID_SENDING,
  CID_DEFAULT_2: window.CID_DEFAULT_2,
  CID_GHOST: window.CID_GHOST
};

window.onload = () => {
  // Get tokenId from query param if available
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("id")) {
    tokenId = parseInt(urlParams.get("id"));
  }

  // Static background image
  document.getElementById("background-layer").style.backgroundImage =
    `url("https://ipfs.io/ipfs/bafybeibk5wnczn3q3jhig2mjwb7i6mlfavzkp6wq72pt3b743cjy3s55om")`;

  statusEl.textContent = `📦 Viewing Token #${tokenId}`;

  // Setup toggle button
  toggleBtn.addEventListener("click", handleToggle);
  floatBtn.addEventListener("click", handleToggle);

  document.getElementById("teleport-fab").addEventListener("click", handleToggle);
  // Start with initial state
  simulateTeleport(stateOrder[currentIndex]);
};

function handleToggle() {
  currentIndex = (currentIndex + 1) % stateOrder.length;
  const nextKey = stateOrder[currentIndex];
  simulateTeleport(nextKey);
}

function simulateTeleport(cidKey) {
  const newCID = stateCIDs[cidKey];
  if (!newCID) {
    statusEl.textContent = "⚠️ CID not available.";
    return;
  }

  // Block user toggling during animation
  toggleBtn.disabled = true;

  if (cidKey === "CID_SENDING") {
    teleportTransition(() => {
      overlay.src = ipfsGateway(newCID);
      overlay.classList.add("shift-right");
      overlay.classList.remove("hidden");
      statusEl.textContent = `✈️ Sending...`;

      // Wait until overlay (GIF) fully loads before starting transition timer
      overlay.onload = () => {
        setTimeout(() => {
          overlay.classList.add("hidden");
          simulateTeleport("CID_DEFAULT_2");

          // Reset current index to CID_DEFAULT_2
          currentIndex = stateOrder.indexOf("CID_DEFAULT_2");
          toggleBtn.disabled = false;
        }, 2000); // ⏱️ Adjust timing to match half of your .gif loop
      };
    });
  } else {
    teleportTransition(() => {
      nftImage.src = ipfsGateway(newCID);
      overlay.classList.add("hidden");
      statusEl.textContent = `🖼️ Showing: ${cidKey.replace("CID_", "")}`;
      toggleBtn.disabled = false;
    });
  }
}

function showDefault2State() {
  const defaultCID = stateCIDs["CID_DEFAULT_2"];
  if (!defaultCID) {
    statusEl.textContent = "⚠️ CID_DEFAULT_2 not available.";
    return;
  }

  nftImage.src = ipfsGateway(defaultCID);
  nftImage.onload = () => {
    statusEl.textContent = "🖼️ Showing: DEFAULT_2";
  };

  nftImage.style.visibility = "visible";
  overlay.classList.add("hidden");

  currentIndex = (stateOrder.indexOf("CID_DEFAULT_2") + 1) % stateOrder.length;
  toggleBtn.disabled = false;
}

function teleportTransition(callback) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
  nftImage.classList.add("shake");
  document.body.classList.add("flash");

  setTimeout(() => {
    nftImage.classList.remove("shake");
    document.body.classList.remove("flash");
    callback();
  }, 600);
}
