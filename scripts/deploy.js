import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const Turing = await ethers.getContractFactory("Turing");
  const turing = await Turing.deploy();
  await turing.waitForDeployment();

  console.log("Contrato Turing publicado em:", await turing.getAddress());
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
