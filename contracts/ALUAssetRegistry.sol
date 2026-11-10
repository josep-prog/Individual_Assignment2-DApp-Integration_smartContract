// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title ALU Asset Registry
/// @notice Registers digital assets, such as the official ALU logo, as ERC-721
///         NFTs. Each NFT permanently stores the SHA-256 fingerprint of the
///         file, who registered it and when, so anyone can check whether a
///         copy of the file is the authentic version.
/// @dev Extends OpenZeppelin's ERC-721 implementation. One file hash can only
///      ever be registered once.
contract ALUAssetRegistry is ERC721 {
    /// @notice Registration details stored for every asset.
    struct AssetMetadata {
        string assetName; // Human-readable name, e.g. "ALU Official Logo"
        string fileType; // MIME type of the file, e.g. "image/png"
        bytes32 contentHash; // SHA-256 hash of the exact file contents
        address registeredBy; // Wallet that registered the asset
        uint256 registeredAt; // Unix timestamp of the registration block
    }

    /// @notice Token ID => registration details. Public so anyone can read it.
    mapping(uint256 => AssetMetadata) public assets;

    /// @notice Content hash => whether it has already been registered.
    /// @dev Used to reject duplicate registrations of the same file.
    mapping(bytes32 => bool) public registeredHashes;

    /// @dev Number of assets registered so far. Token IDs start at 1.
    uint256 private tokenCounter;

    /// @notice Emitted when a new asset is registered and its NFT is minted.
    /// @param tokenId The ID of the newly minted NFT.
    /// @param registeredBy The wallet that registered the asset.
    /// @param contentHash The SHA-256 hash of the registered file.
    event AssetRegistered(
        uint256 indexed tokenId,
        address indexed registeredBy,
        bytes32 contentHash
    );

    /// @notice Sets the NFT collection name and symbol.
    constructor() ERC721("ALU Asset Registry", "ALUASSET") {}

    /// @notice Registers a new asset and mints an NFT for it to the caller.
    /// @dev Reverts if the hash was registered before or is empty. State is
    ///      written before _safeMint so a receiving contract cannot re-enter
    ///      and register the same hash twice.
    /// @param assetName Human-readable name of the asset.
    /// @param fileType MIME type of the asset file.
    /// @param contentHash SHA-256 hash of the asset file.
    /// @return tokenId The ID of the newly minted NFT.
    function registerAsset(
        string memory assetName,
        string memory fileType,
        bytes32 contentHash
    ) public returns (uint256) {
        require(contentHash != bytes32(0), "Content hash cannot be empty.");
        require(
            !registeredHashes[contentHash],
            "This file is already registered."
        );

        tokenCounter++;
        uint256 tokenId = tokenCounter;

        assets[tokenId] = AssetMetadata({
            assetName: assetName,
            fileType: fileType,
            contentHash: contentHash,
            registeredBy: msg.sender,
            registeredAt: block.timestamp
        });

        registeredHashes[contentHash] = true;

        _safeMint(msg.sender, tokenId);

        emit AssetRegistered(tokenId, msg.sender, contentHash);

        return tokenId;
    }

    /// @notice Checks whether a file matches the one registered under a token.
    /// @dev Read-only, so calling it costs no gas. Reverts if the token does
    ///      not exist.
    /// @param tokenId The NFT to check against.
    /// @param suppliedHash SHA-256 hash of the file being checked.
    /// @return isAuthentic True if the hashes match.
    /// @return message A human-readable result.
    function verifyLogoIntegrity(
        uint256 tokenId,
        bytes32 suppliedHash
    ) public view returns (bool isAuthentic, string memory message) {
        _requireOwned(tokenId);

        if (assets[tokenId].contentHash == suppliedHash) {
            return (true, "Logo is authentic.");
        }

        return (false, "Warning: logo does not match.");
    }

    /// @notice Returns the full registration details of an asset.
    /// @dev Reverts if the token does not exist.
    /// @param tokenId The NFT to look up.
    /// @return The stored AssetMetadata struct.
    function getAsset(
        uint256 tokenId
    ) public view returns (AssetMetadata memory) {
        _requireOwned(tokenId);

        return assets[tokenId];
    }

    /// @notice Total number of assets registered so far.
    function totalAssets() public view returns (uint256) {
        return tokenCounter;
    }
}
