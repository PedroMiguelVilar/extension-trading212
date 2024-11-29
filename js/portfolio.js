import { fetchPortfolioData } from './api.js';

let selectedPeriod = localStorage.getItem("selectedPeriod") || "LAST_DAY"; // Default to LAST_DAY

export function initializePortfolioHandlers() {
    const periodButtons = document.querySelectorAll(".time-period-button");
    const backToMenuButton = document.getElementById("back-to-menu");

    // Highlight the previously selected button on load
    periodButtons.forEach((button) => {
        if (button.dataset.period === selectedPeriod) {
            button.classList.add("active");
        }
    });

    // Ensure the correct period data is fetched on load
    fetchPortfolioData(selectedPeriod);

    // Period Button Click Handlers
    periodButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            const period = event.target.dataset.period;

            if (period !== selectedPeriod) {
                // Update selected period
                selectedPeriod = period;
                localStorage.setItem("selectedPeriod", period); // Save the selected period

                // Highlight the active button
                periodButtons.forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");

                // Fetch portfolio data for the selected period
                fetchPortfolioData(selectedPeriod);
            }
        });
    });

    document.getElementById("toggle-cumulative").addEventListener("change", async function () {
        console.log("Toggle state changed. Fetching data...");
        await fetchPortfolioData(selectedPeriod);
    });

    // Back to Menu Handler
    backToMenuButton.addEventListener("click", () => {
        document.getElementById("portfolio-section").style.display = "none";
        document.getElementById("menu-section").style.display = "block";
        console.log("Navigated back to the menu");
    });
}
