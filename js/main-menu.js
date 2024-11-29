import { fetchPortfolioData } from "./api.js";
import { logout } from "./auth.js";
import { initializePortfolioHandlers } from "./portfolio.js";
import { hideLogin } from "./ui.js";
import { hideElement, showElement } from "./utils.js";


export function showMenu() {

    const cards = document.querySelectorAll(".card");
    const menuSection = document.getElementById("menu-section");
    const portfolioSection = document.getElementById("portfolio-section");
    const loginForm = document.getElementById("login-form");
    const twoFaSection = document.getElementById("fa2-section");

    hideLogin(loginForm, twoFaSection, portfolioSection, menuSection);

    // Handle card clicks
    cards.forEach((card) => {
        card.addEventListener("click", () => {
            const feature = card.dataset.feature;
            console.log(`Navigating to feature: ${feature}`);

            // Navigate to the selected feature
            if (feature === "portfolio") {
                hideElement(menuSection);
                showElement(portfolioSection);
                fetchPortfolioData(); // Load portfolio data
                initializePortfolioHandlers();
            }
        });
    });

    document.getElementById('logout-button').addEventListener('click', () => {
        logout();
    });
}
