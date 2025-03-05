async function getChallenge() {
    const challenge_endpoint_url = "/request-challenge";

    try {
        const response = await fetch(challenge_endpoint_url);

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

    worker.postMessage({
        type: "challenge",
        salt,
        hash,
        maxIteration,
    });
}

function showToast(toast) {
    const toast_text = toast.querySelector(".toast-text");
    const baseText = "Waiting for someone to pick up your card";

    const states = ["...", "⋅..", ".⋅.", "..⋅"];

    const updateText = () => {
        let currentState = Number(toast_text.dataset.dotsState);

        if (isNaN(currentState)) {
            currentState = 0;
        }

        const nextState = (currentState + 1) % states.length;

        toast_text.dataset.dotsState = nextState;
        toast_text.innerHTML = `${baseText}${states[currentState]}`;
    };

    setInterval(() => {
        updateText();
    }, 500);

    updateText();
    toast.classList.add("show");
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

    const answer_field = document.getElementById("challenge-answer");
    const salt_field = document.getElementById("challenge-salt");
    const form = document.querySelector(".form-container > form");
    const submit_btn = form.querySelector("input[type=submit]");

    const toast = document.querySelector(".toast.generic");

    worker.addEventListener("message", (e) => {
        const data = e.data;

        if (data.type == "answer") {
            answer_field.value = data.answer;
            answer_field.dataset.time = data.time;
            salt_field.value = data.salt;

            submit_btn.disabled = false;
            switchInputsState(form);

            form.requestSubmit(submit_btn);
        } else {
            throw new Error("Unexpected message from worker");
        }
    });

    form.addEventListener("submit", async (e) => {
        if (answer_field.value == "") {
            e.preventDefault();

            submit_btn.disabled = true;
            switchInputsState(form);

            showToast(toast);

            const challenge = await getChallenge();
            solveChallenge(challenge, worker);
        }
    });
}

window.addEventListener("load", () => {
    initialize();
});
