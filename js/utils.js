export function showElement(element) {
    element.style.display = "block";
}

export function hideElement(element) {
    element.style.display = "none";
}

export function getInputValue(id) {
    return document.getElementById(id).value.trim();
}
