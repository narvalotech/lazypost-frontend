async function getChallenge() {
    const CHALLENGE_ENDPOINT_URL = "/request-challenge";

    try {
        const response = await fetch(CHALLENGE_ENDPOINT_URL);

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const json = await response.json();

        return json.challenge;
    } catch (error) {
        console.error(error.message);
    }
}

function solveChallenge(challenge, worker) {
    const salt = challenge.salt;
    const hash = challenge.hash;
    const maxIteration = 1000000;
    const nbrWorker = challenge.worker ?? 4;

    worker.postMessage({
        type: "challenge",
        salt,
        hash,
        maxIteration,
        nbrWorker,
    });
}

function showToast(toast) {
    const toastText = toast.querySelector(".toast-text");
    const baseText = "Waiting for someone to pick up your card";

    const states = ["...", "⋅..", ".⋅.", "..⋅"];

    const updateText = () => {
        let currentState = Number(toastText.dataset.dotsState);

        if (isNaN(currentState)) {
            currentState = 0;
        }

        const nextState = (currentState + 1) % states.length;

        toastText.dataset.dotsState = nextState;
        toastText.innerHTML = `${baseText}${states[currentState]}`;
    };

    const intervalId = setInterval(() => {
        updateText();
    }, 500);

    toast.dataset.intervalId = intervalId;

    updateText();
    toast.classList.add("show");
}

function hideToast(toast) {
    const intervalId = Number(toast.dataset.intervalId);

    if (!isNaN(intervalId)) {
        clearInterval(intervalId);
    }

    toast.classList.add("hide");
    toast.classList.remove("show");
}

function resetToast(toast) {
    const intervalId = Number(toast.dataset.intervalId);
    const toastText = toast.querySelector(".toast-text");

    if (!isNaN(intervalId)) {
        clearInterval(intervalId);
    }

    toastText.innerHTML = "";

    toast.classList.remove("show", "hide");
}

function switchInputsState(form) {
    const senderInputs = form.querySelector("fieldset[name=sender-info]");
    const recipientInputs = form.querySelector("fieldset[name=recipient-info]");
    const messageTextarea = form.querySelector("textarea[name=message]");
    const pictureInput = form.querySelector("input[type=file]");

    senderInputs.disabled = !senderInputs.disabled;
    recipientInputs.disabled = !recipientInputs.disabled;
    messageTextarea.disabled = !messageTextarea.disabled;
    pictureInput.disabled = !pictureInput.disabled;
}

function initialize() {
    const worker = new Worker("assets/scripts/worker.js");

    const answerField = document.getElementById("challenge-answer");
    const saltField = document.getElementById("challenge-salt");
    const hashField = document.getElementById("challenge-hash");
    const form = document.querySelector(".form-container > form");
    const submitBtn = form.querySelector("input[type=submit]");

    const toast = document.querySelector(".toast.generic");

    worker.addEventListener("message", (e) => {
        const data = e.data;

        if (data.type == "answer") {
            answerField.value = data.answer;
            answerField.dataset.time = data.time;
            saltField.value = data.salt;
            hashField.value = data.hash;

            submitBtn.disabled = false;
            switchInputsState(form);

            hideToast(toast);

            form.requestSubmit(submitBtn);
        } else {
            throw new Error("Unexpected message from worker");
        }
    });

    form.addEventListener("submit", async (e) => {
        if (answerField.value == "") {
            e.preventDefault();

            submitBtn.disabled = true;
            switchInputsState(form);

            showToast(toast);

            const challenge = await getChallenge();
            solveChallenge(challenge, worker);
        }
    });

    window.addEventListener("pageshow", (e) => {
        if (e.persisted) {
            answerField.value = "";
            saltField.value = "";
            hashField.value = "";

            resetToast(toast);
        }
    });
}

window.addEventListener("load", () => {
    initialize();
});
