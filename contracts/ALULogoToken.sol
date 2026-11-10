// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ALU Logo Token (ALUT)
/// @notice ERC-20 token representing fractional ownership shares of the ALU
///         logo registered in ALUAssetRegistry. 1 ALUT = one share out of a
///         fixed 1,000,000 shares.
/// @dev Extends OpenZeppelin's ERC-20 and Ownable. The whole supply is minted
///      once in the constructor and no mint function exists, so the supply
///      can never change.
contract ALULogoToken is ERC20, Ownable {
    /// @notice Fixed number of ownership shares.
    uint256 public constant TOTAL_SHARES = 1_000_000;

    /// @notice Emitted when the owner hands out shares to a stakeholder.
    /// @param recipient The wallet receiving the shares.
    /// @param amount The number of ALUT transferred.
    event SharesDistributed(address indexed recipient, uint256 amount);

    /// @notice Creates the token and gives the full supply to the logo owner.
    /// @param logoOwner Wallet of the original logo owner. It receives all
    ///        1,000,000 ALUT and becomes the contract owner.
    constructor(
        address logoOwner
    ) ERC20("ALU Logo Token", "ALUT") Ownable(logoOwner) {
        _mint(logoOwner, TOTAL_SHARES);
    }

    /// @notice Shares are whole units, so the token has no decimal places.
    /// @dev Without this override ERC-20 defaults to 18 decimals and 1 ALUT
    ///      would be stored as 10^18 units.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// @notice Transfers ownership shares from the owner to a stakeholder,
    ///         such as faculty, students or administration.
    /// @dev Only the contract owner can call this. Reverts on a zero amount,
    ///      the zero address, or if the owner does not hold enough ALUT.
    /// @param recipient The wallet receiving the shares.
    /// @param amount The number of ALUT to transfer.
    function distributeShares(
        address recipient,
        uint256 amount
    ) public onlyOwner {
        require(amount > 0, "Amount must be greater than zero.");

        _transfer(owner(), recipient, amount);

        emit SharesDistributed(recipient, amount);
    }

    /// @notice Returns a wallet's ownership share as a whole-number percentage.
    /// @dev Rounds down, so holdings under 1% (fewer than 10,000 ALUT) return 0.
    /// @param account The wallet to check.
    /// @return The percentage of the total supply held, from 0 to 100.
    function ownershipPercentage(
        address account
    ) public view returns (uint256) {
        return (balanceOf(account) * 100) / totalSupply();
    }
}
