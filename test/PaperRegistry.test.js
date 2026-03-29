/**
 * PaperRegistry.test.js
 * ─────────────────────
 * Comprehensive unit tests for the PaperRegistry smart contract.
 *
 * Run with:
 *   npx hardhat test
 *   npx hardhat test --network localhost  (against a running local node)
 */

const { expect }      = require("chai");
const { ethers }      = require("hardhat");
const { time }        = require("@nomicfoundation/hardhat-network-helpers");

// ── Sample test data ──────────────────────────────────────────────────────────
const SAMPLE_CID_1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
const SAMPLE_CID_2 = "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
const EMPTY_CID    = "";

describe("PaperRegistry", function () {
  let registry;
  let owner, author1, author2;

  // Deploy a fresh contract before each test
  beforeEach(async function () {
    [owner, author1, author2] = await ethers.getSigners();

    const PaperRegistry = await ethers.getContractFactory("PaperRegistry");
    registry = await PaperRegistry.deploy();
    await registry.waitForDeployment();
  });

  // ── Deployment ──────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("should deploy with zero papers", async function () {
      expect(await registry.totalPapers()).to.equal(0n);
    });

    it("should have a valid contract address", async function () {
      expect(await registry.getAddress()).to.be.properAddress;
    });
  });

  // ── submitPaper ─────────────────────────────────────────────────────────────
  describe("submitPaper", function () {
    it("should register a paper and store the correct author", async function () {
      await registry.connect(author1).submitPaper(SAMPLE_CID_1);

      const [cid, author, , exists] = await registry.getPaper(SAMPLE_CID_1);
      expect(cid).to.equal(SAMPLE_CID_1);
      expect(author).to.equal(author1.address);
      expect(exists).to.be.true;
    });

    it("should record a timestamp close to the current block time", async function () {
      const blockBefore = await ethers.provider.getBlock("latest");

      await registry.connect(author1).submitPaper(SAMPLE_CID_1);

      const [, , timestamp] = await registry.getPaper(SAMPLE_CID_1);
      const ts = Number(timestamp);

      // Timestamp should be within 5 seconds of the block we just mined
      expect(ts).to.be.closeTo(blockBefore.timestamp, 5);
    });

    it("should increment totalPapers on each submission", async function () {
      expect(await registry.totalPapers()).to.equal(0n);

      await registry.connect(author1).submitPaper(SAMPLE_CID_1);
      expect(await registry.totalPapers()).to.equal(1n);

      await registry.connect(author2).submitPaper(SAMPLE_CID_2);
      expect(await registry.totalPapers()).to.equal(2n);
    });

    it("should emit a PaperSubmitted event with correct arguments", async function () {
      const tx = await registry.connect(author1).submitPaper(SAMPLE_CID_1);
      await expect(tx)
        .to.emit(registry, "PaperSubmitted")
        .withArgs(
          SAMPLE_CID_1,
          author1.address,
          /* timestamp — any value */ (await ethers.provider.getBlock("latest")).timestamp
        );
    });

    it("should revert on duplicate CID submission", async function () {
      await registry.connect(author1).submitPaper(SAMPLE_CID_1);

      // Same CID from a different author — must still revert
      await expect(
        registry.connect(author2).submitPaper(SAMPLE_CID_1)
      ).to.be.revertedWith("Paper already registered");
    });

    it("should revert on the same author submitting the same CID twice", async function () {
      await registry.connect(author1).submitPaper(SAMPLE_CID_1);

      await expect(
        registry.connect(author1).submitPaper(SAMPLE_CID_1)
      ).to.be.revertedWith("Paper already registered");
    });

    it("should revert when CID is an empty string", async function () {
      await expect(
        registry.connect(author1).submitPaper(EMPTY_CID)
      ).to.be.revertedWith("CID cannot be empty");
    });

    it("should allow different CIDs from the same author", async function () {
      await registry.connect(author1).submitPaper(SAMPLE_CID_1);
      await registry.connect(author1).submitPaper(SAMPLE_CID_2);

      expect(await registry.totalPapers()).to.equal(2n);
    });
  });

  // ── getPaper ────────────────────────────────────────────────────────────────
  describe("getPaper", function () {
    it("should return exists=false for an unknown CID", async function () {
      const [, , , exists] = await registry.getPaper("unknown_cid");
      expect(exists).to.be.false;
    });

    it("should return the full record for a known CID", async function () {
      await registry.connect(author1).submitPaper(SAMPLE_CID_1);

      const [cid, author, timestamp, exists] = await registry.getPaper(SAMPLE_CID_1);
      expect(cid).to.equal(SAMPLE_CID_1);
      expect(author).to.equal(author1.address);
      expect(Number(timestamp)).to.be.greaterThan(0);
      expect(exists).to.be.true;
    });
  });

  // ── paperExists ─────────────────────────────────────────────────────────────
  describe("paperExists", function () {
    it("should return false before submission", async function () {
      expect(await registry.paperExists(SAMPLE_CID_1)).to.be.false;
    });

    it("should return true after submission", async function () {
      await registry.connect(author1).submitPaper(SAMPLE_CID_1);
      expect(await registry.paperExists(SAMPLE_CID_1)).to.be.true;
    });
  });

  // ── Proof of Precedence semantics ────────────────────────────────────────────
  describe("Proof of Precedence", function () {
    it("the first submitter cannot be displaced by a later submission", async function () {
      await registry.connect(author1).submitPaper(SAMPLE_CID_1);

      // Advance time by 1 hour and try to claim the same CID
      await time.increase(3600);

      await expect(
        registry.connect(author2).submitPaper(SAMPLE_CID_1)
      ).to.be.revertedWith("Paper already registered");

      // author1 is still the on-chain author
      const [, storedAuthor] = await registry.getPaper(SAMPLE_CID_1);
      expect(storedAuthor).to.equal(author1.address);
    });

    it("allCIDs array preserves submission order", async function () {
      await registry.connect(author1).submitPaper(SAMPLE_CID_1);
      await registry.connect(author2).submitPaper(SAMPLE_CID_2);

      expect(await registry.allCIDs(0)).to.equal(SAMPLE_CID_1);
      expect(await registry.allCIDs(1)).to.equal(SAMPLE_CID_2);
    });
  });
});
