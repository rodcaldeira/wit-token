const ERC20_CONTRACT = "0x46f057985a7B530619BD2B0eAFDdC0A5d497aE36";
const WIT_DNS_DOMAIN_ADDRESS = "0x0d447c0C6285ebEeb5Bd95A4062501a2963d391C";
const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Setup contracts with account:", deployer.address);
  console.log("Account balance", (await deployer.getBalance()).toString());

  const witTokenContract = await ethers.getContractFactory("WitToken");
  const witTokenInstance = await witTokenContract.attach(ERC20_CONTRACT);

  await witTokenInstance.witGrantRole(
    DEFAULT_ADMIN_ROLE,
    WIT_DNS_DOMAIN_ADDRESS
  );

  console.log(
    "ERC20 Address set on WIT DNS Domain Contract as ",
    ERC20_CONTRACT
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
