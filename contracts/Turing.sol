// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Turing is ERC20 {
    address public owner;
    address public professora;
    bool public voting = true;

    // Mapeamentos exigidos e auxiliares para controle de acesso e votação
    mapping(string => address) public users;
    mapping(address => string) public addressToCodinome;
    mapping(address => bool) public isAuthorized;
    
    // Chave primária (codinome eleitor) => (Chave Secundária (codinome candidato) => bool)
    mapping(string => mapping(string => bool)) public hasVote;
    mapping(address => uint256) public voteCount;

    string[] public codinomesList;

    // Eventos para atualização automática do Ranking no Frontend
    event Voted(string indexed voter, string indexed candidate, uint256 amount);
    event TokenIssued(string indexed recipient, uint256 amount);
    event VotingStatusChanged(bool status);

    // Modifier para restringir execução apenas ao owner ou à professora
    modifier onlyOwnerOrTeacher() {
        require(
            msg.sender == owner || msg.sender == professora,
            "Acesso negado: apenas owner ou professora"
        );
        _;
    }

    // Modifier para restringir execução apenas aos usuários pré-autorizados da tabela
    modifier onlyAuthorized() {
        require(isAuthorized[msg.sender], "Acesso negado: usuario nao autorizado");
        _;
    }

    constructor() ERC20("Turing", "TUR") {
        owner = msg.sender;
        
        // Substitua pelos endereços "FAKE" do HardHat conforme sua tabela exemplo
        professora = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; 
        _registerInitialUser("professora", professora);

        // Endereços de teste dos alunos (contas #2 a #6 do npx hardhat node)
        _registerInitialUser("nome1", 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        _registerInitialUser("nome2", 0x90F79bf6EB2c4f870365E785982E1f101E93b906);
        _registerInitialUser("nome3", 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);
        _registerInitialUser("nome4", 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc);
        _registerInitialUser("nome5", 0x976EA74026E726554dB657fA54763abd0C3a0aa9);
        
        // Owner também autorizado para testes
        isAuthorized[owner] = true;
        addressToCodinome[owner] = "owner";
    }

    function _registerInitialUser(string memory _codinome, address _addr) internal {
        users[_codinome] = _addr;
        addressToCodinome[_addr] = _codinome;
        isAuthorized[_addr] = true;
        codinomesList.push(_codinome);
    }

    function updateUser(string memory codinome, address user_addr) public onlyOwnerOrTeacher {
        require(bytes(codinome).length > 0, "O codinome nao pode ser vazio");

        address oldAddr = users[codinome];
        if (oldAddr != address(0)) {
            isAuthorized[oldAddr] = false;
        } else {
            codinomesList.push(codinome);
        }

        users[codinome] = user_addr;
        addressToCodinome[user_addr] = codinome;
        isAuthorized[user_addr] = true;

        if (keccak256(bytes(codinome)) == keccak256(bytes("professora"))) {
            professora = user_addr;
        }
    }

    function votingOn() public onlyOwnerOrTeacher {
        voting = true;
        emit VotingStatusChanged(true);
    }

    function votingOff() public onlyOwnerOrTeacher {
        voting = false;
        emit VotingStatusChanged(false);
    }

    function issueToken(string memory codinome, uint256 qtde_de_Turings) public onlyOwnerOrTeacher {
        address target = users[codinome];
        require(target != address(0), "Codinome nao encontrado");
        require(qtde_de_Turings > 0, "Quantidade deve ser maior que zero");

        // Multiplica por 10^18 (18 casas decimais padrão do ERC-20)
        _mint(target, qtde_de_Turings * (10 ** decimals()));
        emit TokenIssued(codinome, qtde_de_Turings);
    }

    function vote(string memory codinome, uint256 qtde_de_Turings) public onlyAuthorized {
        require(voting, "A votacao esta pausada no momento");
        require(qtde_de_Turings > 0 && qtde_de_Turings <= 2, "Quantidade deve ser entre 1 e 2 Turings");

        address candidateAddr = users[codinome];
        require(candidateAddr != address(0), "Codinome candidato nao existe");
        require(candidateAddr != msg.sender, "Voce nao pode votar em si mesmo");

        string memory voterCodinome = addressToCodinome[msg.sender];
        require(!hasVote[voterCodinome][codinome], "Voce ja votou neste codinome");

        // Registra o voto e emite os tokens para o candidato
        hasVote[voterCodinome][codinome] = true;
        _mint(candidateAddr, qtde_de_Turings * (10 ** decimals()));

        // Lógica de recompensa: a cada 10 votos realizados, o eleitor ganha 1 Turing
        voteCount[msg.sender] += 1;
        if (voteCount[msg.sender] % 10 == 0) {
            _mint(msg.sender, 1 * (10 ** decimals()));
        }

        emit Voted(voterCodinome, codinome, qtde_de_Turings);
    }

    function getCodinomesList() public view returns (string[] memory) {
        return codinomesList;
    }
}