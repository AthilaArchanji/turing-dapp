// Substitua pelo endereço gerado após rodar o deploy.js e pela ABI gerada em artifacts/
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function professora() view returns (address)",
  "function voting() view returns (bool)",
  "function users(string) view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "function getCodinomesList() view returns (string[])",
  "function vote(string codinome, uint256 qtde_de_Turings)",
  "function issueToken(string codinome, uint256 qtde_de_Turings)",
  "function votingOn()",
  "function votingOff()",
  "event Voted(string indexed voter, string indexed candidate, uint256 amount)",
  "event TokenIssued(string indexed recipient, uint256 amount)",
  "event VotingStatusChanged(bool status)"
];

let provider, signer, contract, currentAccount;

async function init() {
  if (!window.ethereum) {
    alert("Instale a MetaMask para utilizar a dApp!");
    return;
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  currentAccount = (await signer.getAddress()).toLowerCase();

  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  document.getElementById("userAddress").innerText = currentAccount;

  await checkRoleAndSetupUI();
  await loadCandidates();
  await updateVotingStatusUI();
  await updateRanking();

  // Escuta eventos da blockchain para atualizar o Ranking e Status em tempo real
  contract.on("Voted", () => updateRanking());
  contract.on("TokenIssued", () => updateRanking());
  contract.on("VotingStatusChanged", () => updateVotingStatusUI());

  // Recarrega se trocar de conta na MetaMask
  window.ethereum.on("accountsChanged", () => window.location.reload());
}

async function checkRoleAndSetupUI() {
  const ownerAddr = (await contract.owner()).toLowerCase();
  const profAddr = (await contract.professora()).toLowerCase();

  if (currentAccount === ownerAddr || currentAccount === profAddr) {
    document.getElementById("userRole").innerText = "Superusuário";
    document.getElementById("adminPanel").style.display = "block";
  } else {
    document.getElementById("userRole").innerText = "Usuário Comum";
    document.getElementById("adminPanel").style.display = "none";
  }
}

async function loadCandidates() {
  const codinomes = await contract.getCodinomesList();
  const voteSelect = document.getElementById("voteCandidate");
  const issueSelect = document.getElementById("issueCandidate");

  voteSelect.innerHTML = "";
  issueSelect.innerHTML = "";

  for (const nome of codinomes) {
    // Exclui a professora da lista de seleção conforme especificação
    if (nome.toLowerCase() !== "professora") {
      voteSelect.innerHTML += `<option value="${nome}">${nome}</option>`;
      issueSelect.innerHTML += `<option value="${nome}">${nome}</option>`;
    }
  }
}

async function updateVotingStatusUI() {
  const isVotingActive = await contract.voting();
  const statusEl = document.getElementById("votingStatus");
  statusEl.innerText = isVotingActive ? "ATIVA" : "PAUSADA";
  statusEl.style.color = isVotingActive ? "green" : "red";
}

async function updateRanking() {
  const codinomes = await contract.getCodinomesList();
  const rankingData = [];

  for (const nome of codinomes) {
    if (nome.toLowerCase() !== "professora") {
      const addr = await contract.users(nome);
      const balanceRaw = await contract.balanceOf(addr);
      const balanceFormatted = parseFloat(ethers.utils.formatUnits(balanceRaw, 18));
      rankingData.push({ nome, addr, balance: balanceFormatted });
    }
  }

  // Ordena por saldo decrescente de Turings
  rankingData.sort((a, b) => b.balance - a.balance);

  const tbody = document.getElementById("rankingTableBody");
  tbody.innerHTML = "";

  rankingData.forEach((item, index) => {
    tbody.innerHTML += `
      <tr>
        <td>${index + 1}º</td>
        <td>${item.nome}</td>
        <td>${item.addr}</td>
        <td>${item.balance} TUR</td>
      </tr>
    `;
  });
}

async function castVote() {
  const candidate = document.getElementById("voteCandidate").value;
  const amount = document.getElementById("voteAmount").value;
  try {
    const tx = await contract.vote(candidate, amount);
    await tx.wait();
    alert(`Voto de ${amount} TUR para ${candidate} confirmado!`);
  } catch (err) {
    alert("Erro ao votar: " + (err.reason || err.message));
  }
}

async function issueTokens() {
  const candidate = document.getElementById("issueCandidate").value;
  const amount = document.getElementById("issueAmount").value;
  try {
    const tx = await contract.issueToken(candidate, amount);
    await tx.wait();
    alert(`${amount} TUR emitidos para ${candidate}!`);
  } catch (err) {
    alert("Erro ao emitir tokens: " + (err.reason || err.message));
  }
}

async function setVotingStatus(turnOn) {
  try {
    const tx = turnOn ? await contract.votingOn() : await contract.votingOff();
    await tx.wait();
  } catch (err) {
    alert("Erro ao alterar status: " + (err.reason || err.message));
  }
}

window.addEventListener("load", init);