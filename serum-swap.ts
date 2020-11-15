// snippet to provide liquidity into Serum Swap pool
// https://github.com/project-serum/oyster-swap


async function _addLiquidityExistingPool(
    pool: PoolInfo,
    components: LiquidityComponent[],
    connection: Connection,
    wallet: any
) {
    notify({
        message: "Adding Liquidity...",
        description: "Please review transactions to approve.",
        type: "warn",
    });

    const poolMint = await cache.queryMint(connection, pool.pubkeys.mint);
    if (!poolMint.mintAuthority) {
        throw new Error("Mint doesnt have authority");
    }

    if (!pool.pubkeys.feeAccount) {
        throw new Error("Invald fee account");
    }

    const accountA = await cache.queryAccount(
        connection,
        pool.pubkeys.holdingAccounts[0]
    );
    const accountB = await cache.queryAccount(
        connection,
        pool.pubkeys.holdingAccounts[1]
    );

    const reserve0 = accountA.info.amount.toNumber();
    const reserve1 = accountB.info.amount.toNumber();
    const fromA =
        accountA.info.mint.toBase58() === components[0].mintAddress
            ? components[0]
            : components[1];
    const fromB = fromA === components[0] ? components[1] : components[0];

    if (!fromA.account || !fromB.account) {
        throw new Error("Missing account info.");
    }

    const supply = poolMint.supply.toNumber();
    const authority = poolMint.mintAuthority;

    // Uniswap whitepaper: https://uniswap.org/whitepaper.pdf
    // see: https://uniswap.org/docs/v2/advanced-topics/pricing/
    // as well as native uniswap v2 oracle: https://uniswap.org/docs/v2/core-concepts/oracles/
    const amount0 = fromA.amount;
    const amount1 = fromB.amount;

    const liquidity = Math.min(
        (amount0 * (1 - SLIPPAGE) * supply) / reserve0,
        (amount1 * (1 - SLIPPAGE) * supply) / reserve1
    );
    const instructions: TransactionInstruction[] = [];
    const cleanupInstructions: TransactionInstruction[] = [];

    const signers: Account[] = [];

    const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
        AccountLayout.span
    );
    const fromKeyA = getWrappedAccount(
        instructions,
        cleanupInstructions,
        fromA.account,
        wallet.publicKey,
        amount0 + accountRentExempt,
        signers
    );
    const fromKeyB = getWrappedAccount(
        instructions,
        cleanupInstructions,
        fromB.account,
        wallet.publicKey,
        amount1 + accountRentExempt,
        signers
    );

    let toAccount = findOrCreateAccountByMint(
        wallet.publicKey,
        wallet.publicKey,
        instructions,
        [],
        accountRentExempt,
        pool.pubkeys.mint,
        signers,
        new Set<string>([pool.pubkeys.feeAccount.toBase58()])
    );

    // create approval for transfer transactions
    instructions.push(
        Token.createApproveInstruction(
            programIds().token,
            fromKeyA,
            authority,
            wallet.publicKey,
            [],
            amount0
        )
    );

    instructions.push(
        Token.createApproveInstruction(
            programIds().token,
            fromKeyB,
            authority,
            wallet.publicKey,
            [],
            amount1
        )
    );

    // depoist
    instructions.push(
        depositInstruction(
            pool.pubkeys.account,
            authority,
            fromKeyA,
            fromKeyB,
            pool.pubkeys.holdingAccounts[0],
            pool.pubkeys.holdingAccounts[1],
            pool.pubkeys.mint,
            toAccount,
            pool.pubkeys.program,
            programIds().token,
            liquidity,
            amount0,
            amount1
        )
    );

    let tx = await sendTransaction(
        connection,
        wallet,
        instructions.concat(cleanupInstructions),
        signers
    );

    notify({
        message: "Pool Funded. Happy trading.",
        type: "success",
        description: `Transaction - ${tx}`,
    });
}