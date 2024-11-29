import { showElement, hideElement, getInputValue } from './utils.js';


export function updatePortfolioSummary(snapshot) {
    // console.log("Updating portfolio summary with snapshot:", snapshot);

    if (!snapshot || typeof snapshot !== "object") {
        console.error("Invalid snapshot:", snapshot);
        return;
    }

    const invested = (snapshot.investment || 0) + (snapshot.pieCash || 0);
    const ppl = snapshot.ppl || 0;
    const totalValue = invested + ppl;
    const returnAmount = ppl;
    const returnPercentage = ((returnAmount / invested) * 100).toFixed(2);

    // Update portfolio summary in the DOM
    document.getElementById("invested-amount").textContent = `€${invested.toFixed(2)}`;
    document.getElementById("return-amount").textContent = `${returnAmount >= 0 ? "+" : ""}€${returnAmount.toFixed(2)}`;
    document.getElementById("return-percentage").textContent = `${returnPercentage >= 0 ? "+" : ""}${returnPercentage}%`;

    const portfolioValueElement = document.getElementById("portfolio-value");
    portfolioValueElement.textContent = `€${totalValue.toFixed(2)}`;

    // Dynamic styling for positive/negative values
    applyDynamicStyling(returnAmount, returnPercentage, portfolioValueElement, totalValue, invested);
}

export function applyDynamicStyling(returnAmount, returnPercentage, portfolioValueElement, totalValue, invested) {
    const returnAmountElement = document.getElementById("return-amount");
    const returnPercentageElement = document.getElementById("return-percentage");

    if (returnAmount >= 0) {
        returnAmountElement.classList.add("positive");
        returnAmountElement.classList.remove("negative");
        returnPercentageElement.classList.add("positive");
        returnPercentageElement.classList.remove("negative");
    } else {
        returnAmountElement.classList.add("negative");
        returnAmountElement.classList.remove("positive");
        returnPercentageElement.classList.add("negative");
        returnPercentageElement.classList.remove("positive");
    }

    portfolioValueElement.style.color = totalValue >= invested ? "#22c55e" : "#ef4444"; // Green or red
}

export function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.color = isError ? "red" : "green";
}

export function toggleSectionVisibility(showSectionId, hideSectionIds = []) {
    document.getElementById(showSectionId).style.display = "block";
    hideSectionIds.forEach((sectionId) => {
        document.getElementById(sectionId).style.display = "none";
    });
}

export function showLogin(loginForm, twoFaSection, portfolioSection, menuSection) {
    showElement(loginForm);
    hideElement(twoFaSection);
    hideElement(portfolioSection);
    hideElement(menuSection);
}

export function hideLogin(loginForm, twoFaSection, portfolioSection, menuSection) {
    hideElement(loginForm);
    hideElement(twoFaSection);
    hideElement(portfolioSection);
    showElement(menuSection);
}