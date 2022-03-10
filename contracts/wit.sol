// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IWitToken {
    function mint(address account, uint256 amount) external;

    function burn(address account, uint256 amount) external;

    function witTransfer(address to, uint256 amount) external;

    function witTransferFrom(
        address from,
        address to,
        uint256 amount
    ) external;

    function getBalanceOf(address account) external view returns (uint256);

    function witGrantRole(bytes32 role, address account) external;
}

contract WitToken is ERC20, AccessControl {
    constructor(address[] memory admins) ERC20("Wit Token", "WIT") {
        // no other roles were created, the who is admin can grant and revoke his own role
        // please be careful when using revokeRole, if no admins left will lock the contract
        // _setRoleAdmin()
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        for (uint256 i = 0; i < admins.length; i++) {
            _setupRole(DEFAULT_ADMIN_ROLE, admins[i]);
        }
    }

    /**
     *  @dev mint to account an amount of ERC20 Tokens
     *
     *  @param account      Address of user
     *  @param amount       Amount to be mint
     */
    function mint(address account, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _mint(account, amount);
    }

    /**
     *  @dev burn from account an amount of ERC20 Tokens
     *
     *  @param account      Address of user
     *  @param amount       Amount to be burn
     */
    function burn(address account, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // burn should only happens to callers tokens for decentralized sake
        // but the as especs say, the burn function can be called by
        // "certain addresses configured during the token creation"
        _burn(account, amount);
    }

    // auxiliar functions
    /**
     *  @dev witTransfer transfer ERC20 tokens to a given address
     *
     *  @param to       Address of user to transfer to
     *  @param amount   Amount to be transfered
     */
    function witTransfer(address to, uint256 amount) external {
        transfer(to, amount);
    }

    /**
     *  @dev witTransferFrom transfer ERC20 tokens to a given address from a given address
     *
     *  @param from     Address of user to transfer from
     *  @param to       Address of user to transfer to
     *  @param amount   Amount to be transfered
     */
    function witTransferFrom(
        address from,
        address to,
        uint256 amount
    ) external {
        transferFrom(from, to, amount);
    }

    /**
     *  @dev witGrantRole set domain value internal function
     *
     *  @param role   bytes32 code of role
     *  @param account   Address of user to grant role
     */
    function witGrantRole(bytes32 role, address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setupRole(role, account);
    }

    /**
     *  @dev getBalanceOf set domain value internal function
     *
     *  @param account   Address to get balance of
     *  @return balance of account
     */
    function getBalanceOf(address account)
        public
        view
        returns (uint256 balance)
    {
        return balanceOf(account);
    }
}

contract WitDNSDomain is AccessControl {
    mapping(string => string) private _domains;
    mapping(string => uint256) private _price;
    mapping(string => address) private _owners;
    mapping(string => bool) private _domainsIsSet;

    uint256 private _minPrice;

    address private erc20Contract;

    /**
     *  @dev modifier that verifies if the address of erc20 contract is set
     */
    modifier isRunning() {
        require(erc20Contract != address(0x0), "ERC20 contract is not set");
        _;
    }

    constructor(address owner, uint256 minPrice) {
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setMinPrice(minPrice);
    }

    /**
     *  @dev buyDomain buys a domain for given address
     *
     *  @param domain   domain name
     *  @param owner    domain's owner address
     *  @param price    domain price paid
     *
     * requires:
     * - ERC20 Contract Address must be set
     */
    function buyDomain(
        string memory domain,
        address owner,
        uint256 price
    ) external isRunning {
        _buyDomain(domain, owner, price);
    }

    /**
     *  @dev buyDomain buys domain for given address - internal function
     *
     *  @param domain   domain name
     *  @param owner    domain's owner address
     *  @param price    domain price paid
     *
     * requires:
     * - Price need to be greater or equal then minPrice
     * - Price need to be greater then the price paid by previous owner
     * - Caller need to have enough money to pay the price
     */
    function _buyDomain(
        string memory domain,
        address owner,
        uint256 price
    ) internal {
        require(price >= getMinPrice(), "Price is lower than minimum");
        require(price > getPrice(domain), "Price is too low");
        IWitToken token = IWitToken(erc20Contract);
        require(price <= token.getBalanceOf(owner), "Not enough tokens");
        token.burn(owner, price);
        _transferDomain(domain, owner, price);
    }

    /**
     *  @dev _transferDomain set domain value internal function
     *
     *  @param domain   domain name
     *  @param owner    domain's owner address
     *  @param price    domain price paid
     *
     */
    function _transferDomain(
        string memory domain,
        address owner,
        uint256 price
    ) internal {
        _price[domain] = price;
        _owners[domain] = owner;
    }

    /**
     *  @dev _setDomainValue set domain value external function
     *
     *  @param domain   domain name
     *  @param value    domain value
     *
     * Requires: the domain need to be owned by the caller
     */
    function setDomainValue(string memory domain, string memory value)
        external
    {
        require(
            getDomainOwner(domain) == msg.sender,
            "Only owner can set domain value"
        );
        _setDomainValue(domain, value);
    }

    /**
     *  @dev _setDomainValue set domain value internal function
     *
     *  @param domain   domain name
     *  @param value    domain value
     */
    function _setDomainValue(string memory domain, string memory value)
        internal
    {
        _domains[domain] = value;
        _domainsIsSet[domain] = true;
    }

    /**
     *  @dev queryDomain view function if domain is set
     *
     *  @param domain   domain name
     *  @return         true if domain is set
     */
    function queryDomain(string memory domain) external view returns (bool) {
        return _domainsIsSet[domain];
    }

    // getter and setters
    /**
     *  @dev _setMinPrice internal function to set `_minPrice`
     *
     *  @param minPrice   domain minumum price
     *
     */
    function setMinPrice(uint256 minPrice)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setMinPrice(minPrice);
    }

    /**
     *  @dev _setMinPrice internal function to set `_minPrice`
     *
     *  @param minPrice   domain minumum price
     *
     */
    function _setMinPrice(uint256 minPrice) internal {
        _minPrice = minPrice;
    }

    /**
     *  @dev getMinPrice should returns the mininum price for a domain
     *
     *  @return uint256 minimum price of the domain
     */
    function getMinPrice() public view returns (uint256) {
        return _minPrice;
    }

    /**
     *  @dev getDomainOwner should returns the owner address of a given `domain`
     *
     *  @param domain   domain to get price
     *
     *  @return address owner of the domain
     */
    function getDomainOwner(string memory domain)
        public
        view
        returns (address)
    {
        return _owners[domain];
    }

    /**
     *  @dev getPrice should returns the price of a given `domain`
     *
     *  @param domain   domain to get price
     *
     *  @return uint256 price of the domain - if not bought yet, returns _minPrice set on the contract
     */
    function getPrice(string memory domain) public view returns (uint256) {
        return _price[domain];
    }

    /**
     *  @dev setERC20ContractAddress set the address of ERC20 Token as `contractAddress`
     *
     *  @param contractAddress   domain to get price
     *
     *  Requires:
     *  - contractAddress is a valid address
     *  - erc20Contract is not set yet
     *
     * PS.: CAREFUL: This function will run only one time during the contract existance.
     *       for safety reasons was designed this way.
     */
    function setERC20ContractAddress(address contractAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(erc20Contract == address(0x0), "ERC20 contract already set");
        require(contractAddress != address(0x0), "Invalid ERC20 address");
        erc20Contract = contractAddress;
    }

    function getERC20ContractAddress() public view returns (address) {
        return erc20Contract;
    }
}
