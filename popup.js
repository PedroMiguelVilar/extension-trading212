let portfolioChart; // Declare the Chart.js instance globally
let fetchInterval;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup script loaded.");

    const loginForm = document.getElementById("login-form");
    const portfolioSection = document.getElementById("portfolio-section");
    const twoFaSection = document.getElementById("2fa-section");
    const messageElement = document.getElementById("message");
    const twoFaMessageElement = document.getElementById("2fa-message");
    const portfolioButton = document.getElementById("fetch-portfolio-button");
    const twoFaButton = document.getElementById("2fa-button");
    const portfolioDataDisplay = document.getElementById("portfolio-data");
    const chartCanvas = document.getElementById("portfolio-chart").getContext("2d");

    // Ensure proper visibility at the start
    loginForm.style.display = "block";
    twoFaSection.style.display = "none";
    portfolioSection.style.display = "none";

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
                const response = await browser.runtime.sendMessage({
                    action: "submit2FA",
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
        console.log("Fetching portfolio data...");

        try {
            const response = await browser.runtime.sendMessage({
                action: "fetchPortfolioData",
            });

            if (response.status === "SUCCESS") {
                console.log("Portfolio data:", response.data);

                // Update portfolio summary
                updatePortfolioSummary(response.data);

                // Render the chart
                renderGraph(response.data, chartCanvas);
            } else {
                console.error("Failed to fetch portfolio data:", response.message);
            }
        } catch (error) {
            console.error("Error fetching portfolio data:", error);
        }
    }



    function renderGraph(data, ctx) {
        console.log("Rendering graph with data:", data);

        const snapshots = data.snapshots;

        if (!Array.isArray(snapshots)) {
            console.error("Snapshots data is not an array:", snapshots);
            return;
        }

        const labels = snapshots.map((entry) => new Date(entry.time).toLocaleTimeString());
        const values = snapshots.map((entry) => entry.ppl);

        if (portfolioChart) {
            // Update existing chart data and labels
            portfolioChart.data.labels = labels;
            portfolioChart.data.datasets[0].data = values;
            portfolioChart.update(); // Update the chart
        } else {
            // Create the chart for the first time
            portfolioChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "Portfolio PPL",
                            data: values,
                            borderColor: "#4fd1ff", // Aqua line color
                            borderWidth: 2, // Line thickness
                            fill: false, // No area under the line
                            tension: 0.2, // Smooth curve
                            pointRadius: 0, // Removes the points
                        },
                    ],
                },
                options: {
                    responsive: true,
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
                                    const invested = snapshot.investment;
                                    const ppl = snapshot.ppl;
                                    const totalValue = invested + ppl;
                                    const returnAmount = ppl;
                                    const returnPercentage = ((returnAmount / invested) * 100).toFixed(2);

                                    // Update the Portfolio Summary
                                    document.getElementById("invested-amount").textContent = `€${invested.toFixed(2)}`;
                                    document.getElementById("return-amount").textContent = `${returnAmount >= 0 ? "+" : ""}€${returnAmount.toFixed(2)}`;
                                    document.getElementById("return-amount").style.color = returnAmount >= 0 ? "green" : "red";
                                    document.getElementById("return-percentage").textContent = `(${returnPercentage >= 0 ? "+" : ""}${returnPercentage}%)`;
                                    document.getElementById("return-percentage").style.color = returnPercentage >= 0 ? "green" : "red";

                                    // Update the Portfolio Value
                                    const portfolioValueElement = document.getElementById("portfolio-value");
                                    portfolioValueElement.textContent = `€${totalValue.toFixed(2)}`;
                                    portfolioValueElement.style.color = totalValue >= invested ? "green" : "red";

                                    return `Time: ${new Date(snapshot.time).toLocaleString()}`;
                                },
                            },
                        },
                        legend: {
                            display: false,
                        },
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: "Time",
                            },
                        },
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: "PPL Value (€)",
                            },
                        },
                    },
                },
            });
        }
    }


});
