
const { expect } = require("chai");

var Web3 = require('web3');
var web3 = new Web3('http://localhost:8545');

describe('Dual farm', () => {

    beforeEach(async () => {
        accounts = await ethers.getSigners();

        Token = await hre.ethers.getContractFactory("WYZTH");
        tokenContract = await Token.deploy("Test", "Test", 18, web3.utils.toWei('1000000', "ether"));
        await tokenContract.connect(accounts[0]).deployed();

        Token2 = await hre.ethers.getContractFactory("ULE_Token");
        tokenContract2 = await Token2.deploy();
        await tokenContract2.connect(accounts[0]).deployed();

        Farm = await hre.ethers.getContractFactory("DualFarm");
        farm = await Farm.deploy(tokenContract.address, tokenContract2.address);
        await farm.connect(accounts[0]).deployed();

    });

    it("should return set token address", async function () {
        expect(await farm.wyzthTOKEN()).to.equal(tokenContract.address);
        expect(await farm.ULETOKEN()).to.equal(tokenContract2.address);
    });

    it("should Farm with 100 TRX and harvest wyzth and ULE", async function () {
        let amount;
        amount = 100000000; // 100 TRX
        amount = amount.toString()
        await farm.connect(accounts[0]).farmTRX(90, { value: amount });
        const [Totalamount, last, lock, type] = await farm.users(accounts[1].address);
        expect(Totalamount).to.equal(amount);
        expect(lock).to.equal(90);

        // Increase time to 90 days
        await network.provider.send("evm_increaseTime", [8424000])
        await network.provider.send("evm_mine")

        var result = await farm.connect(accounts[1]).pendindRewards();
        expect(result.wyzthReward).to.equal(web3.utils.toWei('45', "ether"));
        expect(result.uleReward).to.equal(web3.utils.toWei('450', "ether"));

        await tokenContract.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('45', "ether"))
        expect(await tokenContract.balanceOf(farm.address)).to.equal(web3.utils.toWei('45', "ether"));

        await tokenContract2.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('450', "ether"))
        expect(await tokenContract2.balanceOf(farm.address)).to.equal(web3.utils.toWei('450', "ether"));

        await farm.connect(accounts[1]).harvest();
        expect(await tokenContract.balanceOf(farm.address)).to.equal(0);
        expect(await tokenContract2.balanceOf(farm.address)).to.equal(0);
        expect(await web3.eth.getBalance(farm.address)).to.equal(web3.utils.toWei('0', "ether"));
    })

    it("should Farm with 100 WYZTH and harvest wyzth and ULE", async function () {
        await tokenContract.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei('100', "ether"));
        await tokenContract.connect(accounts[1]).approve(farm.address, web3.utils.toWei('100', "ether"));
        expect(await tokenContract.allowance(accounts[1].address, farm.address)).to.equal(web3.utils.toWei('100', "ether"));

        await farm.connect(accounts[1]).farmWYZTH(web3.utils.toWei('100', "ether"), 90);
        expect(await tokenContract.balanceOf(farm.address)).to.equal(web3.utils.toWei('100', "ether"));

        // Increase time to 90 days
        await network.provider.send("evm_increaseTime", [8424000])
        await network.provider.send("evm_mine")

        var result = await farm.connect(accounts[1]).pendindRewards();
        expect(result.wyzthReward).to.equal(web3.utils.toWei('90', "ether"));
        expect(result.uleReward).to.equal(web3.utils.toWei('900', "ether"));

        await tokenContract.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('90', "ether"))
        expect(await tokenContract.balanceOf(farm.address)).to.equal(web3.utils.toWei('190', "ether"));

        await tokenContract2.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('900', "ether"))
        expect(await tokenContract2.balanceOf(farm.address)).to.equal(web3.utils.toWei('900', "ether"));

        await farm.connect(accounts[1]).harvest();
        expect(await tokenContract.balanceOf(farm.address)).to.equal(0);
        expect(await tokenContract2.balanceOf(farm.address)).to.equal(0);
        expect(await web3.eth.getBalance(farm.address)).to.equal(web3.utils.toWei('0', "ether"));
    })

    it("Emergency Withdraw", async function () {
        await tokenContract.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei('100', "ether"));
        await tokenContract.connect(accounts[1]).approve(farm.address, web3.utils.toWei('100', "ether"));
        expect(await tokenContract.allowance(accounts[1].address, farm.address)).to.equal(web3.utils.toWei('100', "ether"));

        await farm.connect(accounts[1]).farmWYZTH(web3.utils.toWei('100', "ether"), 90);
        expect(await tokenContract.balanceOf(farm.address)).to.equal(web3.utils.toWei('100', "ether"));

        await farm.connect(accounts[2]).farmTRX(90, { value: 100000000 });
        const [Totalamount, last, lock, type] = await farm.users(accounts[2].address);
        expect(Totalamount).to.equal(100000000);

        await tokenContract2.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('100', "ether"))
        expect(await tokenContract2.balanceOf(farm.address)).to.equal(web3.utils.toWei('100', "ether"));

        await farm.connect(accounts[0]).emergencyWithdraw(web3.utils.toWei('100', "ether"), web3.utils.toWei('100', "ether"));
        expect(await tokenContract.balanceOf(farm.address)).to.equal(0);
        expect(await tokenContract2.balanceOf(farm.address)).to.equal(0);
        expect(await web3.eth.getBalance(farm.address)).to.equal(web3.utils.toWei('0', "ether"));

    })

});