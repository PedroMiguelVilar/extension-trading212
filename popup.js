let portfolioChart; // Declare the Chart.js instance globally
let fetchInterval;
let selectedPeriod = localStorage.getItem("selectedPeriod") || "LAST_DAY"; // Default to LAST_DAY

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Popup script loaded.");

    const periodButtons = document.querySelectorAll(".time-period-button");
    const loginForm = document.getElementById("login-form");
    const portfolioSection = document.getElementById("portfolio-section");
    const twoFaSection = document.getElementById("2fa-section");
    const messageElement = document.getElementById("message");
    const twoFaMessageElement = document.getElementById("2fa-message");
    const twoFaButton = document.getElementById("2fa-button");
    const chartCanvas = document.getElementById("portfolio-chart").getContext("2d");


    periodButtons.forEach((button) => {
        if (button.dataset.period === selectedPeriod) {
            button.classList.add("active");
        }
    });

    // Event listener for period buttons
    periodButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            const period = event.target.dataset.period;

            // Update selected period
            selectedPeriod = period;
            localStorage.setItem("selectedPeriod", period); // Save the selected period

            // Highlight the active button
            periodButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");

            // Fetch portfolio data for the selected period
            fetchPortfolioData();
        });
    });

    // Set the default active button
    document.querySelector(`[data-period="${selectedPeriod}"]`).classList.add("active");


    const { loginState } = await browser.storage.local.get("loginState");
    if (loginState && loginState.isAuthenticated) {
        console.log("User is already authenticated:", loginState);

        // Skip to portfolio section
        document.getElementById("login-form").style.display = "none";
        document.getElementById("portfolio-section").style.display = "block";

        // Fetch portfolio data on load
        fetchPortfolioData();
    } else {
        console.log("User is not authenticated. Showing login form.");

        // Ensure proper visibility at the start
        loginForm.style.display = "block";
        twoFaSection.style.display = "none";
        portfolioSection.style.display = "none";
    }

    // Login Button Click Handler
    document.getElementById("login-button").addEventListener("click", async () => {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        if (username && password) {
            messageElement.innerText = "Logging in...";
            try {
                const response = await browser.runtime.sendMessage({
                    action: "login",
                    username,
                    password,
                });

                console.log("Login response:", response);

                if (response.status === "SUCCESS") {
                    messageElement.innerText = "Login successful!";
                    loginForm.style.display = "none";
                    portfolioSection.style.display = "block";

                    // Call fetchPortfolioData immediately after login
                    fetchPortfolioData();
                    // Optionally set up periodic data fetching
                    fetchInterval = setInterval(fetchPortfolioData, 10000);


                } else if (response.status === "2FA_REQUIRED") {
                    console.log("2FA Required - Showing 2FA Input");
                    messageElement.innerText = response.message || "2FA required.";
                    loginForm.style.display = "none";
                    twoFaSection.style.display = "block"; // Show 2FA section
                } else {
                    messageElement.innerText =
                        response.message || "An error occurred during login.";
                }
            } catch (error) {
                console.error("Login error:", error);
                messageElement.innerText = "An unexpected error occurred.";
            }
        } else {
            messageElement.innerText = "Please enter both username and password.";
        }
    });



    // 2FA Button Click Handler
    twoFaButton.addEventListener("click", async () => {
        const twoFaCode = document.getElementById("2fa-code").value;

        if (twoFaCode) {
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

                    // Call fetchPortfolioData immediately after login
                    fetchPortfolioData();

                    // Optionally set up periodic data fetching
                    fetchInterval = setInterval(fetchPortfolioData, 10000);

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
            twoFaMessageElement.innerText = "Please enter the 2FA code.";
        }
    });


    // Function to update portfolio summary
    function updatePortfolioSummary(data) {
        const snapshots = data.snapshots;
        const latestSnapshot = snapshots[snapshots.length - 1]; // Get the latest snapshot

        const invested = latestSnapshot.investment;
        const totalValue = latestSnapshot.investment + latestSnapshot.ppl;
        const returnAmount = totalValue - invested;
        const returnPercentage = ((returnAmount / invested) * 100).toFixed(2);

        // Update the HTML elements
        document.getElementById("invested-amount").textContent = `€${invested.toFixed(2)}`;
        document.getElementById("return-amount").textContent = `${returnAmount >= 0 ? "+" : ""}€${returnAmount.toFixed(2)}`;
        document.getElementById("return-amount").style.color = returnAmount >= 0 ? "green" : "red";
        document.getElementById("return-percentage").textContent = `(${returnPercentage >= 0 ? "+" : ""}${returnPercentage}%)`;
        document.getElementById("return-percentage").style.color = returnPercentage >= 0 ? "green" : "red";
    }

    // Update the "Fetch Portfolio Data" button click handler
    async function fetchPortfolioData() {
        console.log(`Fetching portfolio data for period: ${selectedPeriod}...`);

        try {
            const response = await browser.runtime.sendMessage({
                action: "fetchPortfolioData",
                period: selectedPeriod,
            });

            if (response.status === "SUCCESS") {
                console.log("Portfolio data:", response.data);

                // Update portfolio summary
                updatePortfolioSummary(response.data);

                // Render the chart
                renderGraph(response.data, chartCanvas);
            } else {
                console.error("Failed to fetch portfolio data:", response.message);
                alert("Error fetching portfolio data. Please try again.");
            }
        } catch (error) {
            console.error("Error fetching portfolio data:", error);
            alert("An unexpected error occurred while fetching portfolio data.");
        }
    }




    function renderGraph(data, ctx) {
        console.log("Rendering graph with data:", data);

        const snapshots = data.snapshots;

        if (!Array.isArray(snapshots)) {
            console.error("Snapshots data is not an array:", snapshots);
            return;
        }

        // Prepare X-axis (time) and Y-axis (total value) data
        const labels = snapshots.map((entry) => new Date(entry.time).toLocaleTimeString());
        const values = snapshots.map((entry) => {
            const investment = entry.investment || 0;
            const pieCash = entry.pieCash || 0;
            const ppl = entry.ppl || 0;
            return investment + pieCash + ppl; // Match totalValue logic
        });

        // Extract the latest snapshot for immediate portfolio summary update
        const latestSnapshot = snapshots[snapshots.length - 1];
        updatePortfolioSummary(latestSnapshot);

        // Destroy the existing chart if it exists
        if (portfolioChart) {
            portfolioChart.destroy();
        }

        // Create the chart
        portfolioChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels, // Time on X-axis
                datasets: [
                    {
                        label: "Portfolio Total Value (€)",
                        data: values, // Total value on Y-axis
                        borderColor: "#00b4d8", // Bright aqua line color
                        borderWidth: 1.5, // Thinner line
                        fill: false, // No fill under the line
                        tension: 0.25, // Smooth curve
                        pointRadius: 0, // Removes the points on the line
                    },
                ],
            },
            options: {
                responsive: true,
                hover: {
                    mode: "index",
                    intersect: false,
                },
                interaction: {
                    mode: "index",
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        mode: "index",
                        intersect: false,
                        callbacks: {
                            title: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex;
                                const snapshot = snapshots[index];
                                updatePortfolioSummary(snapshot); // Update values on hover
                                return `Time: ${new Date(snapshot.time).toLocaleString()}`;
                            },
                        },
                        onLeave: () => {
                            updatePortfolioSummary(latestSnapshot); // Reset to latest snapshot on tooltip leave
                        },
                    },
                    legend: {
                        display: false, // Hide the legend for simplicity
                    },
                },
                scales: {
                    x: {
                        grid: {
                            display: false, // Remove gridlines
                        },
                        ticks: {
                            font: {
                                family: "Arial, sans-serif", // Custom font
                                size: 10, // Smaller size
                            },
                        },
                    },
                    y: {
                        position: "right", // Move Y-axis to the right
                        grid: {
                            display: false, // Remove gridlines
                        },
                        ticks: {
                            font: {
                                family: "Arial, sans-serif", // Custom font
                                size: 10, // Smaller size
                            },
                            callback: function (value) {
                                return `€${value.toFixed(2)}`; // Format Y-axis values as currency
                            },
                        },
                    },
                },
            },
        });

        // Add a mouseleave event listener on the chart's canvas
        const chartCanvas = ctx.canvas;
        chartCanvas.addEventListener("mouseleave", () => {
            updatePortfolioSummary(latestSnapshot); // Reset to the latest snapshot on mouse leave
        });
    }




    function updatePortfolioSummary(snapshot) {
        console.log("Updating portfolio summary with snapshot:", snapshot);

        if (!snapshot || typeof snapshot !== "object") {
            console.error("Invalid snapshot:", snapshot);
            return;
        }

        const invested = (snapshot.investment || 0) + (snapshot.pieCash || 0); // Include pieCash
        const ppl = snapshot.ppl || 0; // Return amount
        const totalValue = invested + ppl;
        const returnAmount = ppl;
        const returnPercentage = ((returnAmount / invested) * 100).toFixed(2);


        // Update portfolio summary in the DOM
        document.getElementById("invested-amount").textContent = `€${invested.toFixed(2)}`;
        document.getElementById("return-amount").textContent = `${returnAmount >= 0 ? "" : ""}€${returnAmount.toFixed(2)}`;
        document.getElementById("return-percentage").textContent = `${returnPercentage >= 0 ? "+" : ""}${returnPercentage}%`;

        // Update portfolio value
        const portfolioValueElement = document.getElementById("portfolio-value");
        portfolioValueElement.textContent = `€${totalValue.toFixed(2)}`;

        // Apply dynamic styling for positive/negative values
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



});