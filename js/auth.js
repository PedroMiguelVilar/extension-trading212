import { showElement, hideElement, getInputValue } from './utils.js';
import { fetchPortfolioData } from './api.js';
import { enableLoginFormSubmit, setupTwoFaInputBehavior } from './event-handlers.js';
import { showLogin } from './ui.js';
import { showMenu } from './main-menu.js';

export function initializeLoginHandlers() {
    const loginForm = document.getElementById("login-form");
    const portfolioSection = document.getElementById("portfolio-section");
    const twoFaSection = document.getElementById("fa2-section");
    const twoFaButton = document.getElementById("fa2-button");
    const twoFaMessageElement = document.getElementById("fa2-message");
    const messageElement = document.getElementById("message");
    const menuSection = document.getElementById("menu-section");

    showLogin(loginForm, twoFaSection, portfolioSection, menuSection);

    console.log("Initializing input handlers...");
    // Enable "Enter" key login submission
    enableLoginFormSubmit();

    // Login Button Click Handler
    document.getElementById("login-button").addEventListener("click", async () => {
        const username = getInputValue("username");
        const password = getInputValue("password");

        if (username && password) {
            messageElement.innerText = "Logging in...";
            try {
                const response = await browser.runtime.sendMessage({
                    action: "login",
                    username,
                    password,
                });

                if (response.status === "SUCCESS") {
                    messageElement.innerText = "Login successful!";
                    hideElement(loginForm);
                    showElement(portfolioSection);
                    fetchPortfolioData();
                } else if (response.status === "2FA_REQUIRED") {
                    messageElement.innerText = response.message || "2FA required.";
                    hideElement(loginForm);
                    showElement(twoFaSection);
                } else {
                    messageElement.innerText = response.message || "Login failed.";
                }
            } catch (error) {
                console.error("Login error:", error);
                messageElement.innerText = "An unexpected error occurred.";
            }
        } else {
            messageElement.innerText = "Please enter both username and password.";
        }
    });

    // Set up 2FA input behavior
    setupTwoFaInputBehavior();

    // 2FA Button Click Handler
    twoFaButton.addEventListener("click", async () => {
        // Gather the 2FA code from the inputs
        const twoFaInputs = document.querySelectorAll(".fa2-input");
        const twoFaCode = Array.from(twoFaInputs)
            .map((input) => input.value)
            .join("");

        if (twoFaCode.length === 6) { // Ensure it's a 6-digit code
            twoFaMessageElement.innerText = "Verifying 2FA...";
            try {
                const username = document.getElementById("username").value; // Fetch username
                const password = document.getElementById("password").value; // Fetch password

                const response = await browser.runtime.sendMessage({
                    action: "submit2FA",
                    username, // Include username
                    password, // Include password
                    twoFactorAuthCode: twoFaCode,
                });

                console.log("2FA response:", response);

                if (response.status === "SUCCESS") {
                    twoFaMessageElement.style.color = "green";
                    twoFaMessageElement.innerText = "2FA verification successful!";
                    twoFaSection.style.display = "none";
                    portfolioSection.style.display = "block"; // Show portfolio section

                    showMenu();

                } else {
                    twoFaMessageElement.style.color = "red";
                    twoFaMessageElement.innerText = response.message || "2FA verification failed.";
                }
            } catch (error) {
                console.error("2FA error:", error);
                twoFaMessageElement.style.color = "red";
                twoFaMessageElement.innerText = "An error occurred during 2FA verification.";
            }
        } else {
            twoFaMessageElement.style.color = "red";
            twoFaMessageElement.innerText = "Please enter a valid 6-digit code.";
        }
    });
}

export function logout() {
    const loginForm = document.getElementById("login-form");
    const portfolioSection = document.getElementById("portfolio-section");
    const twoFaSection = document.getElementById("fa2-section");
    const menuSection = document.getElementById("menu-section");

    // Clear stored tokens or session
    browser.storage.local.remove('loginState') // Corrected method
        .then(() => {
            console.log('Login state cleared successfully.');
            // Show the login form and hide other sections
            showLogin(loginForm, twoFaSection, portfolioSection, menuSection);
        })
        .catch((error) => {
            console.error('Error clearing login state:', error);
        });
}
