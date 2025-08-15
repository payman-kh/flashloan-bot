// src/opt/size-optimizer.js
const NEG_SENTINEL = -1n << 255n;

const isBigInt = (x) => typeof x === 'bigint';
const isNonNegativeBigInt = (x) => isBigInt(x) && x >= 0n;

function toGasCostFn(gasCostWei) {
    if (typeof gasCostWei === 'function') return gasCostWei;
    const fixed = isBigInt(gasCostWei) ? gasCostWei : 0n;
    return () => fixed;
}

async function evaluateProfitTriple({ amountIn, quoteBuy, quoteSell, gasCostFn }) {
    try {
        if (!isNonNegativeBigInt(amountIn)) {
            return { profit: NEG_SENTINEL, tokenOut: 0n, wethBack: 0n };
        }
        const tokenOut = await quoteBuy(amountIn).catch(() => 0n);
        if (!isNonNegativeBigInt(tokenOut) || tokenOut === 0n) {
            return { profit: NEG_SENTINEL, tokenOut: 0n, wethBack: 0n };
        }
        const wethBack = await quoteSell(tokenOut).catch(() => 0n);
        if (!isNonNegativeBigInt(wethBack) || wethBack === 0n) {
            return { profit: NEG_SENTINEL, tokenOut, wethBack: 0n };
        }
        const gas = gasCostFn(amountIn);
        if (!isNonNegativeBigInt(gas)) {
            return { profit: NEG_SENTINEL, tokenOut, wethBack };
        }
        const profit = wethBack - amountIn - gas;
        return { profit, tokenOut, wethBack };
    } catch {
        return { profit: NEG_SENTINEL, tokenOut: 0n, wethBack: 0n };
    }
}

async function findOptimalSize({
                                   minIn,
                                   maxIn,
                                   quoteBuy,
                                   quoteSell,
                                   gasCostWei = 0n,
                                   maxIterations = 40n,
                                   segments = 2048n,
                                   finalPoints = 33n
                               }) {
    if (!isNonNegativeBigInt(minIn) || !isNonNegativeBigInt(maxIn) || maxIn <= minIn) {
        return { sizeIn: 0n, profit: 0n, tokenOutAtOpt: 0n, wethBackAtOpt: 0n };
    }
    if (typeof quoteBuy !== 'function' || typeof quoteSell !== 'function') {
        throw new Error('quoteBuy and quoteSell must be functions');
    }
    const gasCostFn = toGasCostFn(gasCostWei);

    const cache = new Map();
    const getTriple = async (a) => {
        const k = a.toString();
        if (cache.has(k)) return cache.get(k);
        const res = await evaluateProfitTriple({ amountIn: a, quoteBuy, quoteSell, gasCostFn });
        cache.set(k, res);
        return res;
    };

    let left = minIn;
    let right = maxIn;
    const fullRange = right - left;

    let iter = 0n;
    while (iter < maxIterations) {
        const span = right - left;
        if (span <= 6n) break;
        const third = span / 3n;
        const m1 = left + third;
        const m2 = right - third;

        const { profit: p1 } = await getTriple(m1);
        const { profit: p2 } = await getTriple(m2);

        if (p1 === NEG_SENTINEL && p2 === NEG_SENTINEL) {
            left = left + third;
            right = right - third;
        } else if (p1 <= p2) {
            left = m1;
        } else {
            right = m2;
        }

        iter++;
        if ((right - left) <= (fullRange / segments)) break;
    }

    const span = right - left;
    const steps = finalPoints - 1n;
    const step = span / steps || 1n;

    const points = [];
    for (let i = 0n; i <= steps; i++) {
        const a = left + i * step;
        if (a > right) break;
        points.push(a);
    }
    if (points[0] !== left) points.unshift(left);
    if (points[points.length - 1] !== right) points.push(right);

    let best = { sizeIn: 0n, profit: NEG_SENTINEL, tokenOutAtOpt: 0n, wethBackAtOpt: 0n };
    for (const a of points) {
        const { profit, tokenOut, wethBack } = await getTriple(a);
        if (profit > best.profit) {
            best = { sizeIn: a, profit, tokenOutAtOpt: tokenOut, wethBackAtOpt: wethBack };
        }
    }
    if (best.profit === NEG_SENTINEL) {
        return { sizeIn: 0n, profit: 0n, tokenOutAtOpt: 0n, wethBackAtOpt: 0n };
    }
    return best;
}

async function gridSearchOptimalSize({
                                         minIn,
                                         maxIn,
                                         samples = 25,
                                         quoteBuy,
                                         quoteSell,
                                         gasCostWei = 0n
                                     }) {
    if (!isNonNegativeBigInt(minIn) || !isNonNegativeBigInt(maxIn) || maxIn <= minIn) {
        return { sizeIn: 0n, profit: 0n, tokenOutAtOpt: 0n, wethBackAtOpt: 0n };
    }
    if (typeof quoteBuy !== 'function' || typeof quoteSell !== 'function') {
        throw new Error('quoteBuy and quoteSell must be functions');
    }
    const gasCostFn = toGasCostFn(gasCostWei);

    const n = BigInt(Math.max(2, samples));
    const step = (maxIn - minIn) / (n - 1n) || 1n;

    let best = { sizeIn: 0n, profit: NEG_SENTINEL, tokenOutAtOpt: 0n, wethBackAtOpt: 0n };
    for (let i = 0n; i < n; i++) {
        const a = minIn + i * step;
        const { profit, tokenOut, wethBack } = await evaluateProfitTriple({ amountIn: a, quoteBuy, quoteSell, gasCostFn });
        if (profit > best.profit) {
            best = { sizeIn: a, profit, tokenOutAtOpt: tokenOut, wethBackAtOpt: wethBack };
        }
    }
    if (best.profit === NEG_SENTINEL) {
        return { sizeIn: 0n, profit: 0n, tokenOutAtOpt: 0n, wethBackAtOpt: 0n };
    }
    return best;
}

module.exports = {
    NEG_SENTINEL,
    findOptimalSize,
    gridSearchOptimalSize,
};
