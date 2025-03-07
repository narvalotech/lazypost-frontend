function addChallengeToTable(challenge) {
    const table = document.getElementById("bench-table");
    const tbody = table.querySelector("tbody");

    const tr = document.createElement("tr");
    const tdNbrDigit = document.createElement("td");
    const tdNbrIter = document.createElement("td");
    const tdMaxIter = document.createElement("td");
    const tdNbrWorker = document.createElement("td");
    const tdTime = document.createElement("td");

    tdNbrDigit.innerText = challenge.nbrDigit;
    tdNbrIter.innerText = challenge.answer;
    tdMaxIter.innerText = challenge.maxIteration;
    tdNbrWorker.innerText = challenge.nbrWorker;
    tdTime.innerText = challenge.computeTime.end - challenge.computeTime.start;

    tr.appendChild(tdNbrDigit);
    tr.appendChild(tdNbrIter);
    tr.appendChild(tdMaxIter);
    tr.appendChild(tdNbrWorker);
    tr.appendChild(tdTime);

    tbody.appendChild(tr);
}

function clearTable() {
    const table = document.getElementById("bench-table");
    const tbody = table.querySelector("tbody");

    while (tbody.firstElementChild != null) {
        tbody.removeChild(tbody.firstElementChild);
    }
}

function notify() {
    const notif_btn = document.getElementById("enable-notif");
    const notif_enabled = notif_btn.dataset.enabled == "true";

    if (notif_enabled) {
        if (!("Notification" in window)) {
            console.info("Notifications unavailable.");
        } else if (Notification.permission === "granted") {
            const title = "Challenge Benchmark";
            const options = {
                body: "Compuration done.",
            };

            const n = new Notification(title, options);
        } else if (Notification.permission === "denied") {
            console.error("Notification enabled but permission denied.");
        }
    }
}

function generateCsv(challenges) {
    const header = "nb_digit,nb_iter,max_iter,nbr_worker,compute_time_ms\n";
    let csv = header;

    for (const challenge of challenges) {
        const nbDigit = challenge.nbrDigit;
        const nbIter = challenge.answer;
        const maxIter = challenge.maxIteration;
        const nbrWorker = challenge.nbrWorker;
        const computeTime = challenge.computeTime.end - challenge.computeTime.start;

        const row = `${nbDigit},${nbIter},${maxIter},${nbrWorker},${computeTime}\n`;

        csv += row;
    }

    return csv;
}

function downloadCsv(csv) {
    const link = document.createElement("a");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = "data.csv";

    link.click();
}

function btnLoadingAnimation() {
    const benchmarkBtn = document.getElementById("bench-btn");

    const states = ["⠄", "⠆", "⠇", "⠏", "⠟", "⠿", "⠻", "⠹", "⠸", "⠰", "⠠"];

    const updateBtn = () => {
        const currentState = Number(benchmarkBtn.dataset.animState);
        const nextState = (currentState + 1) % states.length;

        benchmarkBtn.innerText = states[currentState];

        benchmarkBtn.dataset.animState = nextState;
    };

    const intervalId = setInterval(() => {
        updateBtn();
    }, 100);

    updateBtn();

    return intervalId;
}

function initialize() {
    const worker = new Worker("/assets/scripts/worker.js");

    const maxDigitInput = document.getElementById("max-digit");
    const nbrWorkerInput = document.getElementById("nbr-worker");
    const benchmarkBtn = document.getElementById("bench-btn");
    const keepOldResultCheckbox = document.getElementById("keep-old-res-checkbox");

    const notificationBtn = document.getElementById("enable-notif");

    const dl_csv_btn = document.getElementById("dl-csv");

    let challenges = [];
    let btnLoadingAnimationId = null;

    const workerMessageEvent = (e) => {
        const data = e.data;

        console.log("Main: Received Message");
        console.log(data);

        if (data.type == "answer") {
            const answer = data.answer;

            let postNextChallenge = false;

            for (const challenge of challenges) {
                if (postNextChallenge) {
                    // do the next challenge
                    const message = Math.pow(10, challenge.nbrDigit) - 1;

                    worker.postMessage({
                        type: "hash",
                        message,
                    });

                    break;
                }

                if (challenge.answer == null) {
                    challenge.answer = answer;
                    challenge.computeTime.end = performance.now();

                    addChallengeToTable(challenge);

                    postNextChallenge = true;
                }
            }

            // if all the challenges have an answer we are done
            if (challenges[challenges.length - 1].answer != null) {
                benchmarkBtn.disabled = false;
                clearInterval(btnLoadingAnimationId);
                benchmarkBtn.innerHTML = "start";

                dl_csv_btn.disabled = false;

                notify();
            }
        } else if (data.type == "hash") {
            const hash = data.hash;
            const nbrWorker = nbrWorkerInput.value;

            for (const challenge of challenges) {
                if (challenge.hash == null) {
                    const maxIteration = Math.pow(10, challenge.nbrDigit);

                    challenge.hash = hash;
                    challenge.maxIteration = maxIteration;
                    challenge.nbrWorker = nbrWorker;

                    challenge.computeTime.start = performance.now();

                    worker.postMessage({
                        type: "challenge",
                        salt: "",
                        hash,
                        maxIteration,
                        nbrWorker,
                    });

                    break;
                }
            }
        } else {
            throw new Error("Unexpected message from worker");
        }
    };

    worker.addEventListener("message", (e) => {
        workerMessageEvent(e);
    });

    benchmarkBtn.addEventListener("click", () => {
        benchmarkBtn.disabled = true;

        const maxDigit = maxDigitInput.value;
        const keepOldResult = keepOldResultCheckbox.checked;

        if (!keepOldResult) {
            challenges = [];
            clearTable();
        }

        btnLoadingAnimationId = btnLoadingAnimation();

        for (let i = 1; i <= maxDigit; i++) {
            const challenge = {
                nbrDigit: i,
                maxIteration: null,
                nbrWorker: null,
                salt: null,
                hash: null,
                answer: null,
                computeTime: {
                    start: null,
                    end: null,
                },
            };

            challenges.push(challenge);
        }

        for (const challenge of challenges) {
            if (challenge.answer == null) {
                const message = Math.pow(10, challenge.nbrDigit) - 1;

                worker.postMessage({
                    type: "hash",
                    message: message.toString(),
                });
                break;
            }
        }
    });

    notificationBtn.addEventListener("click", () => {
        const notificationEnabled = notificationBtn.dataset.enabled == "true";

        if (!notificationEnabled) {
            if (!("Notification" in window)) {
                console.info("Notifications unavailable.");
            } else if (Notification.permission === "granted") {

            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                        const title = "Challenge Benchmark";
                        const options = {
                            body: "Will notify you when computation is done.",
                        };

                        const n = new Notification(title, options);
                    }
                });
            }

            notificationBtn.dataset.enabled = "true";
            notificationBtn.innerText = "disable notification";
        } else {
            notificationBtn.dataset.enabled = "false";
        }
    });

    dl_csv_btn.addEventListener("click", () => {
        if (challenges.length != 0) {
            const csv = generateCsv(challenges);
            downloadCsv(csv);
            console.log(csv);
        }
    });
}

window.addEventListener("load", () => {
    initialize();
});
