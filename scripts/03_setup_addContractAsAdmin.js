const WIT_DNS_DOMAIN_ADDRESS = "0x0d447c0C6285ebEeb5Bd95A4062501a2963d391C";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Setup contracts with account:", deployer.address);
  console.log("Account balance", (await deployer.getBalance()).toString());

  const witDNSDomainContract = await ethers.getContractFactory("WitDNSDomain");
  const witDNSDomainInstance = await witDNSDomainContract.attach(
    WIT_DNS_DOMAIN_ADDRESS
  );

  await witDNSDomainInstance.setERC20ContractAddress(WIT_DNS_DOMAIN_ADDRESS);

  console.log(
    "ERC20 Address set on WIT DNS Domain Contract as ",
    WIT_DNS_DOMAIN_ADDRESS
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
