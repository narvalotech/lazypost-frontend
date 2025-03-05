async function getSha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message); // encode as (utf-8) Uint8Array

    const hashBuffer = await self.crypto.subtle.digest("SHA-256", data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return hashHex;
}

async function computeChallenge(salt, hash, maxIteration) {
    let answer = -1;

    for (let i = 0; i < maxIteration; i++) {
        const msg = `${salt}${i}`
        const h = await getSha256(msg);

        if (hash == h) {
            answer = i;
            break;
        }
    }

    return answer;
}

self.onmessage = async (e) => {
    const data = e.data;

    if (data.type == "hash") {
        const message = data.message;

        const hash = await getSha256(message);

        const data_to_send = {
            type: "hash",
            hash,
        };

        self.postMessage(data_to_send);
    } else if (data.type == "challenge") {
        const salt = data.salt;
        const hash = data.hash;
        const maxIteration = data.maxIteration;

        const t0 = performance.now();
        const answer = await computeChallenge(salt, hash, maxIteration);
        const t1 = performance.now();

        const compute_time = t1 - t0;

        const time = Date.now();

        self.postMessage({
            type: "answer",
            answer,
            salt,
            hash,
            time,
            compute_time,
        });
    }
};
