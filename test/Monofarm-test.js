const { expect } = require("chai");
var Web3 = require('web3');
var web3 = new Web3('http://localhost:8545');

describe("Monofarm", function () {

  beforeEach('setup contract for each test', async function () {
    accounts = await ethers.getSigners();

    Token = await hre.ethers.getContractFactory("WYZTH");
    tokenContract = await Token.deploy("Test", "Test", 18, web3.utils.toWei('1000000', "ether"));
    await tokenContract.connect(accounts[0]).deployed();

    Token2 = await hre.ethers.getContractFactory("ULE_Token");
    tokenContract2 = await Token2.deploy();
    await tokenContract2.connect(accounts[0]).deployed();

    Farm = await hre.ethers.getContractFactory("MonoFarm");
    farm = await Farm.deploy(tokenContract.address, tokenContract2.address);
    await farm.connect(accounts[0]).deployed();


  })

  it("should return set token address", async function () {
    expect(await farm.wyzthTOKEN()).to.equal(tokenContract.address);
    expect(await farm.ULETOKEN()).to.equal(tokenContract2.address);
  });

  it("Approve token, Farm and Harvest", async function () {
    await tokenContract.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei('1000', "ether"));
    await tokenContract.connect(accounts[1]).approve(farm.address, web3.utils.toWei('1000', "ether"));
    expect(await tokenContract.allowance(accounts[1].address, farm.address)).to.equal(web3.utils.toWei('1000', "ether"));

    await farm.connect(accounts[1]).farm(web3.utils.toWei('1000', "ether"), 90);
    expect(await tokenContract.balanceOf(farm.address)).to.equal(web3.utils.toWei('1000', "ether"));

    // Increase time to 90 days
    await network.provider.send("evm_increaseTime", [8424000])
    await network.provider.send("evm_mine")

    var result = await farm.connect(accounts[1]).pendindRewards();
    expect(result.wyzthReward).to.equal(web3.utils.toWei('900', "ether"));
    expect(result.uleReward).to.equal(web3.utils.toWei('9000', "ether"))

    await tokenContract.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('900', "ether"))
    expect(await tokenContract.balanceOf(farm.address)).to.equal(web3.utils.toWei('1900', "ether"));

    await tokenContract2.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('9000', "ether"))
    expect(await tokenContract2.balanceOf(farm.address)).to.equal(web3.utils.toWei('9000', "ether"));

    await farm.connect(accounts[1]).harvest();
    expect(await tokenContract.balanceOf(farm.address)).to.equal(0);
    expect(await tokenContract2.balanceOf(farm.address)).to.equal(0);

    expect(await tokenContract.balanceOf(accounts[1].address)).to.equal(web3.utils.toWei('1900', "ether"));
    expect(await tokenContract2.balanceOf(accounts[1].address)).to.equal(web3.utils.toWei('9000', "ether"));
  })

  it("Emergency Withdraw", async function () {
    await tokenContract.connect(accounts[0]).transfer(accounts[1].address, "1000000000000000000000");
    await tokenContract.connect(accounts[1]).approve(farm.address, "1000000000000000000000");
    expect(await tokenContract.allowance(accounts[1].address, farm.address)).to.equal("1000000000000000000000");

    await farm.connect(accounts[1]).farm("1000000000000000000000", 90);
    expect(await tokenContract.balanceOf(farm.address)).to.equal("1000000000000000000000");

    await tokenContract2.connect(accounts[0]).transfer(farm.address, "9000000000000000000000")
    expect(await tokenContract2.balanceOf(farm.address)).to.equal("9000000000000000000000");

    await farm.connect(accounts[0]).emergencyWithdraw("1000000000000000000000", "9000000000000000000000");
    expect(await tokenContract.balanceOf(farm.address)).to.equal(0);
    expect(await tokenContract2.balanceOf(farm.address)).to.equal(0);

  })
});