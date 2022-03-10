async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance", (await deployer.getBalance()).toString());

  const witTokenContract = await ethers.getContractFactory("WitToken");
  const witTokenInstance = await witTokenContract.deploy([deployer.address]);

  console.log("WitToken address deployed at", witTokenInstance.address);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
