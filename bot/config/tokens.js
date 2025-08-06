module.exports = {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    tokens: [
        // Stablecoins
        {
            symbol: 'USDC',
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            decimals: 6
        },
        {
            symbol: 'USDT',
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            decimals: 6
        },
        {
            symbol: 'DAI',
            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            decimals: 18
        },
        // DeFi Tokens
        {
            symbol: 'UNI',
            address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
            decimals: 18
        },
        {
            symbol: 'AAVE',
            address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
            decimals: 18
        },
        {
            symbol: 'LINK',
            address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
            decimals: 18
        },
        {
            symbol: 'CRV',
            address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
            decimals: 18
        },
        // Layer 2 Tokens
        {
            symbol: 'MATIC',
            address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
            decimals: 18
        },
        {
            symbol: 'ARB',
            address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
            decimals: 18
        },
        // Lending Protocols
        {
            symbol: 'COMP',
            address: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
            decimals: 18
        },
        {
            symbol: 'MKR',
            address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
            decimals: 18
        },
        // Popular Meme Tokens
        {
            symbol: 'PEPE',
            address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
            decimals: 18
        },
        {
            symbol: 'SHIB',
            address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
            decimals: 18
        },
        // Gaming/Metaverse Tokens
        {
            symbol: 'AXS',
            address: '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b',
            decimals: 18
        },
        {
            symbol: 'SAND',
            address: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0',
            decimals: 18
        },
        // DEX Tokens
        {
            symbol: 'SUSHI',
            address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
            decimals: 18
        }
    ],
    // Minimum liquidity required in both DEXes to consider trading (in USD)
    minLiquidity: 100000,
    // Maximum slippage tolerance (in basis points, 100 = 1%)
    maxSlippage: 100
};