// code snippet to provide liquidity to https://swop.fi
// smart contracts code: https://github.com/swopfi/swopfi-smart-contracts/blob/master/dApps/exchanger.ride


const { transfer } = require('@waves/waves-transactions');
const seed = 'some example seed phrase';



function provideLiquidityToSwop(amount) {
    const params = {

        call: {
            args: [{ type: 'integer', value: 1 }],  // slippageTolerance
            function: 'replenishWithTwoTokens',
        },
        payment: [{
            amount: amount,
            assetId: null
        }],
        dApp: 'DAPP ADDRESS',
        chainId: 'W',
        fee: 100000,
        feeAssetId: null
    };

    const signedInvokeScriptTx = invokeScript(params, seed);
    console.log(signedInvokeScriptTx)
}
