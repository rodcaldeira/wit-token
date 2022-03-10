const { expect } = require("chai");
const { ethers } = require("hardhat");

const MIN_PRICE_DOMAIN = 10;
const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

describe("WIT Test", async () => {
  let witTokenContract;
  let witTokenInstance;
  let domainContract;
  let domainContractInstance;
  let admin1;
  let admin2;
  let notAdmin1;
  let notAdmin2;
  before(async () => {
    witTokenContract = await ethers.getContractFactory("WitToken");
    domainContract = await ethers.getContractFactory("WitDNSDomain");
    [admin1, admin2, notAdmin1, notAdmin2] = await ethers.getSigners();
  });

  it("Should deploy ERC20 Contract and WIT DNS Domain Contract", async () => {
    let adminsAddress = [admin1.address, admin2.address];
    witTokenInstance = await witTokenContract.deploy(adminsAddress);
    domainContractInstance = await domainContract.deploy(
      admin1.address,
      MIN_PRICE_DOMAIN
    );

    expect(await witTokenInstance.address).to.not.be.null;
    return expect(await domainContractInstance.address).to.not.be.null;
  });

  describe("ERC20 Contract", function () {
    it("Only admin should mint tokens for user", async () => {
      let amount = 100;
      let amountToUser = ethers.BigNumber.from("1000");

      await expect(
        witTokenInstance.connect(notAdmin1).mint(notAdmin1.address, amount)
      ).to.be.revertedWith(
        "AccessControl: account",
        notAdmin1.address,
        "is missing role",
        DEFAULT_ADMIN_ROLE
      );

      await witTokenInstance.mint(notAdmin1.address, amountToUser);
      await witTokenInstance.mint(notAdmin2.address, amountToUser);
      return await expect(await witTokenInstance.mint(admin1.address, amount))
        .to.emit(witTokenInstance, "Transfer")
        .withArgs(ethers.constants.AddressZero, admin1.address, amount);
    });

    it("Only admin should burn tokens", async () => {
      let amount = ethers.BigNumber.from("10");
      let balanceOfAdmin1 = ethers.BigNumber.from(
        await witTokenInstance.balanceOf(admin1.address)
      );
      await expect(
        witTokenInstance.connect(notAdmin1).burn(notAdmin1.address, amount)
      ).to.be.revertedWith(
        "AccessControl: account",
        notAdmin1.address,
        "is missing role",
        DEFAULT_ADMIN_ROLE
      );

      await expect(await witTokenInstance.burn(admin1.address, amount))
        .to.emit(witTokenInstance, "Transfer")
        .withArgs(admin1.address, ethers.constants.AddressZero, amount);

      let balanceOfAdmin1AfterBurn = ethers.BigNumber.from(
        await witTokenInstance.balanceOf(admin1.address)
      );

      return expect(balanceOfAdmin1AfterBurn).to.equal(
        balanceOfAdmin1.sub(amount)
      );
    });

    it("Grant admin privileges to WIT DNS Domain Contract", async () => {
      const domainContractAddress = await domainContractInstance.address;

      await witTokenInstance.witGrantRole(
        DEFAULT_ADMIN_ROLE,
        domainContractAddress
      );

      expect(
        await witTokenInstance.hasRole(
          DEFAULT_ADMIN_ROLE,
          domainContractAddress
        )
      ).to.be.true;
    });
  });

  describe("WIT DNS Domain Contract", async () => {
    it("Should not allow buy domain while ERC20 Address is not set", async () => {
      let domainName = "helloworld.wit";
      let domainPrice = ethers.BigNumber.from(MIN_PRICE_DOMAIN).add("1");

      await expect(
        domainContractInstance.buyDomain(
          domainName,
          admin1.address,
          domainPrice
        )
      ).to.be.revertedWith("ERC20 contract is not set");
    });

    it(`Address ${ethers.constants.AddressZero} is invalid to be set as ERC20 Contract reference`, async () => {
      await expect(
        domainContractInstance.setERC20ContractAddress(
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith("Invalid ERC20 address");
    });

    it("Only admin can set address ERC20 Contract Address", async () => {
      let tokenAddress = await witTokenInstance.address;
      await expect(
        domainContractInstance
          .connect(notAdmin1)
          .setERC20ContractAddress(tokenAddress)
      ).to.be.revertedWith(
        "AccessControl: account",
        notAdmin1.address,
        "is missing role",
        DEFAULT_ADMIN_ROLE
      );

      await domainContractInstance.setERC20ContractAddress(tokenAddress);

      const erc20ContractAddress =
        await domainContractInstance.getERC20ContractAddress();

      return expect(erc20ContractAddress).to.equal(tokenAddress);
    });

    it("After set the ERC20 Contract Address can't be updated", async () => {
      let tokenAddress = await witTokenInstance.address;
      await expect(
        domainContractInstance.setERC20ContractAddress(tokenAddress)
      ).to.be.revertedWith("ERC20 contract already set");
    });

    describe("Buy a name", async () => {
      let domainName;
      let invalidDomainPrice;
      let validDomainPrice;
      before(async () => {
        domainName = "helloworld.wit";
        invalidDomainPrice = ethers.BigNumber.from(MIN_PRICE_DOMAIN).sub("1");
        validDomainPrice = ethers.BigNumber.from(MIN_PRICE_DOMAIN).add("1");
      });

      it("User can't buy domain if he doesn't have enough funds", async () => {
        let balanceOfAdmin1 = ethers.BigNumber.from(
          await witTokenInstance.balanceOf(admin1.address)
        );

        await expect(
          domainContractInstance.buyDomain(
            domainName,
            admin1.address,
            balanceOfAdmin1.add("1")
          )
        ).to.be.revertedWith("Not enough tokens");
      });

      it("User can buy Domain only with offers greater than minimum price", async () => {
        await expect(
          domainContractInstance
            .connect(notAdmin1)
            .buyDomain(domainName, notAdmin1.address, invalidDomainPrice)
        ).to.be.revertedWith("Price is lower than minimum");

        await expect(
          domainContractInstance
            .connect(notAdmin1)
            .buyDomain(domainName, notAdmin1.address, validDomainPrice)
        ).to.be.ok;
      });

      it("Other user can buy Domain if his offer surpass current owner price", async () => {
        await expect(
          domainContractInstance
            .connect(notAdmin2)
            .buyDomain(domainName, notAdmin2.address, validDomainPrice.sub("1"))
        ).to.be.revertedWith("Price is too low");

        await expect(
          domainContractInstance
            .connect(notAdmin1)
            .buyDomain(domainName, notAdmin2.address, validDomainPrice.add("1"))
        ).to.be.ok;
      });
    });

    describe("Set a name", async () => {
      let domainName;
      let domainValue;
      let invalidDomainPrice;
      let validDomainPrice;
      before(async () => {
        domainName = "helloworld.wit";
        domainValue = "192.168.0.1";
        invalidDomainPrice = ethers.BigNumber.from(MIN_PRICE_DOMAIN).sub("1");
        validDomainPrice = ethers.BigNumber.from(MIN_PRICE_DOMAIN).add("1");
      });

      it("Only owner can set Value of a given domain", async () => {
        await expect(
          domainContractInstance.setDomainValue(domainName, "127.0.0.1")
        ).to.be.revertedWith("Only owner can set domain value");

        await expect(
          await domainContractInstance
            .connect(notAdmin2)
            .setDomainValue(domainName, "192.168.0.1")
        ).to.be.ok;
      });
    });

    describe("Query existing name as values", async () => {
      let domainName;
      let invalidDomainPrice;
      let validDomainPrice;
      before(async () => {
        domainName = "helloworld.wit";
        invalidDomainPrice = ethers.BigNumber.from(MIN_PRICE_DOMAIN).sub("1");
        validDomainPrice = ethers.BigNumber.from(MIN_PRICE_DOMAIN).add("1");
      });

      it("User can query for domain", async () => {
        return expect(await domainContractInstance.queryDomain(domainName)).to
          .be.true;
      });
    });
  });
});
