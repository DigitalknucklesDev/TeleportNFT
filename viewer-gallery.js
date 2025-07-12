<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Simple NFT Viewer</title>
  <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
  <style>
    body {
      background: #111;
      color: #0ff;
      font-family: monospace;
      text-align: center;
      padding: 2rem;
    }
    .nft-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }
    .nft-card {
      background: #222;
      border: 1px solid #0ff;
      padding: 1rem;
      border-radius: 10px;
      max-width: 240px;
    }
    .nft-card img {
      width: 100%;
      border-radius: 8px;
    }
    .swap-btn {
      margin-top: 0.5rem;
      background: #0ff;
      color: #000;
      border: none;
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>🔍 Simple NFT Viewer</h1>
  <button id="connect">Connect Wallet</button>
  <div id="status"></div>
  <div class="nft-container" id="nft-gallery"></div>

  <script>
    const contractAddress = 'YOUR_ERC721_CONTRACT_ADDRESS';
    const contractABIUrl = 'nftABI.json';
    const maxTokenId = 50;

    let provider, signer, nftContract, userAddress;
    let cidMap = {
      default: "ipfs://QmDefaultImage",
      state1: "ipfs://QmState1Image",
      state2: "ipfs://QmState2Image"
    };

    const ipfsGateway = cid =>
      cid.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${cid.slice(7)}` : cid;

    document.getElementById('connect').onclick = async () => {
      if (!window.ethereum) return alert('🦊 MetaMask required');
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();

      const abi = await fetch(contractABIUrl).then(r => r.json());
      nftContract = new ethers.Contract(contractAddress, abi, provider);

      const ownedIds = await getOwnedNFTs(userAddress);
      renderGallery(ownedIds);
    };

    async function getOwnedNFTs(address) {
      const owned = [];
      for (let i = 0; i < maxTokenId; i++) {
        try {
          const owner = await nftContract.ownerOf(i);
          if (owner.toLowerCase() === address.toLowerCase()) {
            owned.push(i);
          }
        } catch {}
      }
      return owned;
    }

    function renderGallery(tokenIds) {
      const gallery = document.getElementById("nft-gallery");
      gallery.innerHTML = "";

      tokenIds.forEach(id => {
        const card = document.createElement("div");
        card.className = "nft-card";

        const img = document.createElement("img");
        img.src = ipfsGateway(cidMap.default);
        img.alt = `Token #${id}`;

        const title = document.createElement("h3");
        title.textContent = `Token #${id}`;

        const swapBtn = document.createElement("button");
        swapBtn.className = "swap-btn";
        swapBtn.textContent = "Swap State";

        let states = ["default", "state1", "state2"];
        let stateIndex = 0;
        swapBtn.onclick = () => {
          stateIndex = (stateIndex + 1) % states.length;
          img.src = ipfsGateway(cidMap[states[stateIndex]]);
        };

        card.appendChild(title);
        card.appendChild(img);
        card.appendChild(swapBtn);
        gallery.appendChild(card);
      });
    }
  </script>
</body>
</html>
