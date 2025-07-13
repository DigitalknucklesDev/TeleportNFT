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
let tokenId = 1;

const ipfsGateway = cid =>
  cid.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${cid.slice(7)}` : `https://ipfs.io/ipfs/${cid}`;

// CID state mapping
const stateCIDs = {
  CID_MERGED: window.CID_MERGED,
  CID_SENDING: window.CID_SENDING,
  CID_DEFAULT_2: window.CID_DEFAULT_2,
  CID_GHOST: window.CID_GHOST
};

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("id")) {
    tokenId = parseInt(urlParams.get("id"));
  }

  document.getElementById("background-layer").style.backgroundImage =
    `url("https://ipfs.io/ipfs/bafybeibk5wnczn3q3jhig2mjwb7i6mlfavzkp6wq72pt3b743cjy3s55om")`;

  statusEl.textContent = `📦 Viewing Token #${tokenId}`;

  // Bind toggle buttons
  toggleBtn.addEventListener("click", handleToggle);
  floatBtn.addEventListener("click", handleToggle);

  simulateTeleport(stateOrder[currentIndex]);
};

function handleToggle() {
  currentIndex = (currentIndex + 1) % stateOrder.length;
  simulateTeleport(stateOrder[currentIndex]);
}

function simulateTeleport(cidKey) {
  const newCID = stateCIDs[cidKey];
  if (!newCID) {
    statusEl.textContent = "⚠️ CID not available.";
    return;
  }

  // Disable both buttons during transition
  toggleBtn.disabled = true;
  floatBtn.disabled = true;

  if (cidKey === "CID_SENDING") {
    teleportTransition(() => {
      // Hide base image while showing overlay
      nftImage.style.visibility = "hidden";
      overlay.classList.add("shift-right");
      overlay.classList.remove("hidden");

      // Reset src to force onload trigger
      overlay.onload = null;
      overlay.src = "";
      overlay.src = ipfsGateway(newCID);
      statusEl.textContent = `✈️ Sending...`;

      overlay.onload = () => {
        setTimeout(() => {
          overlay.classList.add("hidden");
          nftImage.style.visibility = "visible";
          simulateTeleport("CID_DEFAULT_2");

          currentIndex = stateOrder.indexOf("CID_DEFAULT_2");
        }, 2500);
      };
    });
  } else {
    teleportTransition(() => {
      overlay.classList.add("hidden");
      nftImage.src = ipfsGateway(newCID);
      nftImage.style.visibility = "visible";
      nftImage.onload = () => {
        statusEl.textContent = `🖼️ Showing: ${cidKey.replace("CID_", "")}`;
      };

      toggleBtn.disabled = false;
      floatBtn.disabled = false;
    });
  }
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
