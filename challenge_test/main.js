function initialize() {
    const worker = new Worker("/assets/scripts/worker.js");

    const shaMsg = document.getElementById("sha-msg");
    const shaBtn = document.getElementById("sha-btn");
    const shaRes = document.getElementById("sha-res");

    const saltInput = document.getElementById("salt");
    const hashInput = document.getElementById("hash");
    const maxIterInput = document.getElementById("max-iter");
    const computeBtn = document.getElementById("btn");
    const answerField = document.getElementById("challenge-answer");
    const timeField = document.getElementById("time");

    const computeTime = {
        start: 0,
        end: 0,
    };

    worker.addEventListener("message", (e) => {
        const data = e.data;

        if (data.type == "answer") {
            const answer = data.answer;

            computeTime.end = performance.now();
            const computeTimeValue = computeTime.end - computeTime.start;

            answerField.innerText = `answer: ${answer}`;
            timeField.innerText = `compute time: ${computeTimeValue}ms`;

            computeBtn.disabled = false;
        } else if (data.type == "hash") {
            const hash = data.hash;

            shaRes.innerText = hash;

            shaBtn.disabled = false;
        } else {
            throw new Error("Unexpected message from worker");
        }
    });

    shaBtn.addEventListener("click", () => {
        const message = shaMsg.value.trim();

        shaRes.innerText = "";

        shaBtn.disabled = true;

        worker.postMessage({
            type: "hash",
            message,
        });
    });

    computeBtn.addEventListener("click", () => {
        const salt = saltInput.value.trim();
        const hash = hashInput.value.trim();
        const maxIteration = maxIterInput.value;
        const nbrWorker = 1;

        answerField.innerText = "";
        timeField.innerText = "";

        computeBtn.disabled = true;

        computeTime.start = performance.now();

        worker.postMessage({
            type: "challenge",
            salt,
            hash,
            maxIteration,
            nbrWorker,
        });
    });
}

window.addEventListener("load", () => {
    initialize();
});
