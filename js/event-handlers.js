// Enable "Enter" key to submit the login form
export function enableLoginFormSubmit() {
    document.addEventListener("keydown", (event) => {
        const loginFormVisible = document.getElementById("login-form").style.display !== "none";
        if (loginFormVisible && event.key === "Enter") {
            event.preventDefault(); // Prevent default form submission
            document.getElementById("login-button").click(); // Trigger the login button click
        }
    });
}

// Handle 2FA Input Behavior
export function setupTwoFaInputBehavior() {
    const twoFaInputs = document.querySelectorAll(".fa2-input");

    twoFaInputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            const value = e.target.value;
            if (value.length === 1 && index < twoFaInputs.length - 1) {
                twoFaInputs[index + 1].focus(); // Move to the next input
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !e.target.value && index > 0) {
                twoFaInputs[index - 1].focus(); // Move to the previous input
            }
        });

        input.addEventListener("keypress", (e) => {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault(); // Block non-numeric input
            }
        });
    });
}
