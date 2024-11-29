import { initializeLoginHandlers } from './auth.js';
import { showMenu } from './main-menu.js';
import { initializePortfolioHandlers } from './portfolio.js';
import { hideLogin } from './ui.js';

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Popup script loaded.");

    const { loginState } = await browser.storage.local.get("loginState");
    if (loginState && loginState.isAuthenticated) {
        showMenu();
    } else {
        console.log("User is not authenticated. Showing login form.");
        initializeLoginHandlers();
    }

});
