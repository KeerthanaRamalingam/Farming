
const { expect } = require("chai");

var Web3 = require('web3');
var web3 = new Web3('http://localhost:8545');

// • Stake Wyzth/TRX/USDJ/BTC/ETH – Farm Wyzth & ULE

describe('Poly farm', () => {

    beforeEach(async () => {
        accounts = await ethers.getSigners();

        Token = await hre.ethers.getContractFactory("WYZTH");
        tokenContract = await Token.deploy("Test", "Test", 18, web3.utils.toWei('1000000', "ether"));
        await tokenContract.connect(accounts[0]).deployed();

        USDJ = await hre.ethers.getContractFactory("WYZTH");
        USDJ = await USDJ.deploy("Test", "Test", 18, web3.utils.toWei('1000000', "ether"));
        await USDJ.connect(accounts[0]).deployed();

        BTC = await hre.ethers.getContractFactory("WYZTH");
        BTC = await BTC.deploy("Test", "Test", 8, web3.utils.toWei('1000000', "ether"));
        await BTC.connect(accounts[0]).deployed();

        ETH = await hre.ethers.getContractFactory("WYZTH");
        ETH = await ETH.deploy("Test", "Test", 18, web3.utils.toWei('1000000', "ether"));
        await ETH.connect(accounts[0]).deployed();

        Token2 = await hre.ethers.getContractFactory("ULE_Token");
        tokenContract2 = await Token2.deploy();
        await tokenContract2.connect(accounts[0]).deployed();

        Farm = await hre.ethers.getContractFactory("PolyFarm");
        farm = await Farm.deploy(tokenContract.address, tokenContract2.address);
        await farm.connect(accounts[0]).deployed();

        await farm.addTokens([tokenContract.address, USDJ.address, BTC.address, ETH.address],
            [web3.utils.toWei('100', "ether"), web3.utils.toWei('10', "ether"), 400000, web3.utils.toWei('0.05', "ether")])

    });

    it("should return set token address", async function () {
        expect(await farm.wyzthTOKEN()).to.equal(tokenContract.address);
        expect(await farm.ULETOKEN()).to.equal(tokenContract2.address);
        expect(await farm.tokens(0)).to.equal(tokenContract.address);
        expect(await farm.tokens(1)).to.equal(USDJ.address);
        expect(await farm.minimumtokenDeposit(tokenContract.address)).to.equal(web3.utils.toWei('100', "ether"));
        expect(await farm.minimumtokenDeposit(BTC.address)).to.equal(400000);
        expect(await farm.minimumtokenDeposit(ETH.address)).to.equal(web3.utils.toWei('0.05', "ether"));
    });

    it("should Farm with 100 TRX and harvest wyzth and ULE", async function () {
        let amount;
        amount = 1000000000; // 1000 TRX
        amount = amount.toString()
        await farm.connect(accounts[1]).farmTRX(90, { value: amount });
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
        await tokenContract.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei('1000', "ether"));
        await tokenContract.connect(accounts[1]).approve(farm.address, web3.utils.toWei('1000', "ether"));
        expect(await tokenContract.allowance(accounts[1].address, farm.address)).to.equal(web3.utils.toWei('1000', "ether"));

        await farm.connect(accounts[1]).farm(web3.utils.toWei('1000', "ether"), tokenContract.address, 90);
        expect(await tokenContract.balanceOf(farm.address)).to.equal(web3.utils.toWei('1000', "ether"));

        // Increase time to 90 days
        await network.provider.send("evm_increaseTime", [8424000])
        await network.provider.send("evm_mine")

        var result = await farm.connect(accounts[1]).pendindRewards();
        expect(result.wyzthReward).to.equal(web3.utils.toWei('90', "ether"));
        expect(result.uleReward).to.equal(web3.utils.toWei('900', "ether"));

        await tokenContract.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('90', "ether"))
        expect(await tokenContract.balanceOf(farm.address)).to.equal(web3.utils.toWei('1090', "ether"));

        await tokenContract2.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('900', "ether"))
        expect(await tokenContract2.balanceOf(farm.address)).to.equal(web3.utils.toWei('900', "ether"));

        await farm.connect(accounts[1]).harvest();
        expect(await tokenContract.balanceOf(farm.address)).to.equal(0);
        expect(await tokenContract2.balanceOf(farm.address)).to.equal(0);
        expect(await web3.eth.getBalance(farm.address)).to.equal(web3.utils.toWei('0', "ether"));
    })

    it("should Farm with 5 ETH and harvest wyzth and ULE", async function () {
        await ETH.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei('5', "ether"));
        await ETH.connect(accounts[1]).approve(farm.address, web3.utils.toWei('5', "ether"));
        expect(await ETH.allowance(accounts[1].address, farm.address)).to.equal(web3.utils.toWei('5', "ether"));

        await farm.connect(accounts[1]).farm(web3.utils.toWei('5', "ether"), ETH.address, 90);
        expect(await ETH.balanceOf(farm.address)).to.equal(web3.utils.toWei('5', "ether"));

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
        expect(await ETH.balanceOf(farm.address)).to.equal(0);
        expect(await ETH.balanceOf(accounts[1].address)).to.equal(web3.utils.toWei('5', "ether"));
    })

    it("should Farm with 1000 USDJ and harvest wyzth and ULE", async function () {
        await USDJ.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei('1000', "ether"));
        await USDJ.connect(accounts[1]).approve(farm.address, web3.utils.toWei('1000', "ether"));
        expect(await USDJ.allowance(accounts[1].address, farm.address)).to.equal(web3.utils.toWei('1000', "ether"));

        await farm.connect(accounts[1]).farm(web3.utils.toWei('1000', "ether"), USDJ.address, 90);
        expect(await USDJ.balanceOf(farm.address)).to.equal(web3.utils.toWei('1000', "ether"));

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
        expect(await USDJ.balanceOf(farm.address)).to.equal(0);
        expect(await USDJ.balanceOf(accounts[1].address)).to.equal(web3.utils.toWei('1000', "ether"));
        expect(await tokenContract.balanceOf(accounts[1].address)).to.equal(web3.utils.toWei('45', "ether"));
        expect(await tokenContract2.balanceOf(accounts[1].address)).to.equal(web3.utils.toWei('450', "ether"));
    })

    it("should Farm with 0.1 BTC and harvest wyzth and ULE", async function () {
        let amount = 10000000;
        await BTC.connect(accounts[0]).transfer(accounts[1].address, amount);
        await BTC.connect(accounts[1]).approve(farm.address, amount);
        expect(await BTC.allowance(accounts[1].address, farm.address)).to.equal(amount);

        await farm.connect(accounts[1]).farm(amount, BTC.address, 90);
        expect(await BTC.balanceOf(farm.address)).to.equal(amount);

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
        expect(await BTC.balanceOf(farm.address)).to.equal(0);
        expect(await BTC.balanceOf(accounts[1].address)).to.equal(amount);
    })

    it("Emergency Withdraw", async function () {
        await tokenContract.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('100', "ether"));
        await USDJ.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('100', "ether"));
        await BTC.connect(accounts[0]).transfer(farm.address, 10000000);
        await ETH.connect(accounts[0]).transfer(farm.address, web3.utils.toWei('100', "ether"));

        await farm.connect(accounts[2]).farmTRX(90, { value: 100000000 });
        const [Totalamount, last, lock, type] = await farm.users(accounts[2].address);
        expect(Totalamount).to.equal(100000000);

        await farm.connect(accounts[0]).emergencyWithdraw();
        expect(await tokenContract.balanceOf(farm.address)).to.equal(0);
        expect(await USDJ.balanceOf(farm.address)).to.equal(0);
        expect(await BTC.balanceOf(farm.address)).to.equal(0);
        expect(await ETH.balanceOf(farm.address)).to.equal(0);
        expect(await web3.eth.getBalance(farm.address)).to.equal(web3.utils.toWei('0', "ether"));

    })

});