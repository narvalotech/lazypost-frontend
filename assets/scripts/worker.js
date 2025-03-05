async function getSha256(message) {
    if (!self.isSecureContext) {
        throw new Error("Crypto APIs not available in non-secure context.");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(message); // encode as (utf-8) Uint8Array

    const hashBuffer = await self.crypto.subtle.digest("SHA-256", data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return hashHex;
}

const ChallengeError = {
    NoAnswer: -1,
    HashFailed: -2,
};

async function computeChallenge(salt, hash, startIter, endIter) {
    let answer = ChallengeError.NoAnswer;

    for (let i = startIter; i < endIter; i++) {
        let h;
        const message = `${salt}${i}`;

        try {
            h = await getSha256(message);
        } catch (error) {
            console.error(error.message);
            answer = ChallengeError.HashFailed;
            break;
        }

        if (hash == h) {
            answer = i;
            break;
        }
    }

    return answer;
}

async function startChallenge(salt, hash, maxIteration) {
    const answer = await computeChallenge(salt, hash, 0, maxIteration);

    self.postMessage({
        type: "answer",
        answer,
        salt,
        hash,
    });
}

function startParallelChallenge(salt, hash, maxIteration, nbrWorker) {
    const workers = [];
    const iterPerWorker = Math.floor(maxIteration / nbrWorker);
    const remainingIter = maxIteration % nbrWorker;

    const workerMessageEvent = (e) => {
        const data = e.data;

        if (data.type == "answerChunk") {
            const answer = data.answer;
            const salt = data.salt;
            const hash = data.hash;

            if (answer != ChallengeError.NoAnswer && answer != ChallengeError.HashFailed) {
                for (const worker of workers) {
                    worker.terminate();
                }

                // send answer to main script
                self.postMessage({
                    type: "answer",
                    answer,
                    salt,
                    hash,
                });
            }
        } else {
            throw new Error(`Worker received an unexpected message. (${e})`);
        }
    };

    for (let i = 0; i < nbrWorker; i++) {
        const worker = new Worker("/assets/scripts/worker.js");

        const startIter = i * iterPerWorker;
        const endIter = (i == nbrWorker - 1) ? startIter + iterPerWorker + remainingIter : startIter + iterPerWorker;

        worker.addEventListener("message", workerMessageEvent);

        worker.postMessage({
            type: "challengeChunk",
            salt,
            hash,
            startIter,
            endIter,
        });

        workers.push(worker);
    }
}

self.onmessage = async (e) => {
    const data = e.data;

    console.log("Worker: Received Message");
    console.log(data);

    if (data.type == "hash") {
        const message = data.message;

        const hash = await getSha256(message);

        self.postMessage({
            type: "hash",
            hash,
        });
    } else if (data.type == "challenge") {
        const salt = data.salt;
        const hash = data.hash;
        const maxIteration = data.maxIteration;
        const nbrWorker = data.nbrWorker;

        if (nbrWorker > 1) {
            startParallelChallenge(salt, hash, maxIteration, nbrWorker);
        } else {
            startChallenge(salt, hash, maxIteration);
        }
    } else if (data.type == "challengeChunk") {
        const salt = data.salt;
        const hash = data.hash;
        const startIter = data.startIter;
        const endIter = data.endIter;

        const answer = await computeChallenge(salt, hash, startIter, endIter);

        console.log("prout");

        self.postMessage({
            type: "answerChunk",
            answer,
            salt,
            hash,
        });
    } else {
        throw new Error(`Worker received an unexpected message. (${e})`);
    }
};
