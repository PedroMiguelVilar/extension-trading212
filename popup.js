let portfolioChart; // Declare the Chart.js instance globally
let fetchInterval;
let selectedPeriod = localStorage.getItem("selectedPeriod") || "LAST_DAY"; // Default to LAST_DAY

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Popup script loaded.");

    const periodButtons = document.querySelectorAll(".time-period-button");
    const loginForm = document.getElementById("login-form");
    const portfolioSection = document.getElementById("portfolio-section");
    const twoFaSection = document.getElementById("fa2-section");
    const messageElement = document.getElementById("message");
    const twoFaMessageElement = document.getElementById("fa2-message");
    const twoFaButton = document.getElementById("fa2-button");
    const chartCanvas = document.getElementById("portfolio-chart").getContext("2d");
    const cards = document.querySelectorAll(".card");
    const menuSection = document.getElementById("menu-section");
    const backToMenuButton = document.getElementById("back-to-menu");


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

        loginForm.style.display = "none";
        menuSection.style.display = "block";

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
            twoFaMessageElement.innerText = "Please enter a valid 6-digit code.";
        }
    });

    // Handle card clicks
    cards.forEach((card) => {
        card.addEventListener("click", () => {
            const feature = card.dataset.feature;
            console.log(`Navigating to feature: ${feature}`);

            // Navigate to the selected feature
            if (feature === "portfolio") {
                menuSection.style.display = "none";
                portfolioSection.style.display = "block";
                fetchPortfolioData(); // Load portfolio data
            }
            // Add logic for other features here
        });
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

    async function fetchPortfolioData() {
        const useCumulative = document.getElementById("toggle-cumulative").checked;
        console.log(`Fetching portfolio data for period: ${selectedPeriod}, Cumulative: ${useCumulative}`);

        if (useCumulative) {
            // Cumulative fetching logic
            const periodDependencies = {
                "LAST_DAY": ["LAST_DAY"],
                "LAST_WEEK": ["LAST_DAY", "LAST_WEEK"],
                "LAST_MONTH": ["LAST_DAY", "LAST_WEEK", "LAST_MONTH"],
                "LAST_THREE_MONTHS": ["LAST_DAY", "LAST_WEEK", "LAST_MONTH", "LAST_THREE_MONTHS"],
                "LAST_YEAR": ["LAST_DAY", "LAST_WEEK", "LAST_MONTH", "LAST_THREE_MONTHS", "LAST_YEAR"],
                "ALL": ["LAST_DAY", "LAST_WEEK", "LAST_MONTH", "LAST_THREE_MONTHS", "LAST_YEAR", "ALL"]
            };

            const dependencies = periodDependencies[selectedPeriod] || [];
            const allSnapshots = [];

            try {
                for (const period of dependencies) {
                    console.log(`Fetching data for period: ${period}`);
                    const response = await browser.runtime.sendMessage({
                        action: "fetchPortfolioData",
                        period,
                    });

                    if (response.status === "SUCCESS") {
                        console.log(`Data for ${period}:`, response.data);

                        // Merge the snapshots from this period, avoiding duplicates
                        const snapshots = response.data.snapshots || [];
                        snapshots.forEach((snapshot) => {
                            const isDuplicate = allSnapshots.some((snap) => snap.time === snapshot.time);
                            if (!isDuplicate) {
                                allSnapshots.push(snapshot);
                            }
                        });
                    } else {
                        console.error(`Failed to fetch data for ${period}:`, response.message);
                    }
                }

                // Sort the merged snapshots by time (optional, for consistency)
                allSnapshots.sort((a, b) => new Date(a.time) - new Date(b.time));

                console.log("Final merged snapshots:", allSnapshots);

                // Update portfolio summary and chart with merged data
                updatePortfolioSummary({ snapshots: allSnapshots });
                renderGraph({ snapshots: allSnapshots }, chartCanvas);
            } catch (error) {
                console.error("Error fetching portfolio data:", error);
                alert("An unexpected error occurred while fetching portfolio data.");
            }
        } else {
            console.log(`Fetching portfolio data for period: ${selectedPeriod}...`);

            try {
                // Fetch data for the selected period
                const periodResponse = await browser.runtime.sendMessage({
                    action: "fetchPortfolioData",
                    period: selectedPeriod,
                });

                // Fetch data for the last day
                const lastDayResponse = await browser.runtime.sendMessage({
                    action: "fetchPortfolioData",
                    period: "LAST_DAY",
                });

                if (periodResponse.status === "SUCCESS" && lastDayResponse.status === "SUCCESS") {
                    console.log("Period data:", periodResponse.data);
                    console.log("Last day data:", lastDayResponse.data);

                    // Get snapshots
                    const periodSnapshots = periodResponse.data.snapshots || [];
                    const lastDaySnapshots = lastDayResponse.data.snapshots || [];
                    const latestLastDaySnapshot = lastDaySnapshots[lastDaySnapshots.length - 1];

                    // Ensure no duplicate timestamps
                    const mergedSnapshots = [...periodSnapshots];

                    // Check if the latest snapshot from LAST_DAY should be merged
                    if (latestLastDaySnapshot) {
                        const isDuplicate = mergedSnapshots.some((snap) => snap.time === latestLastDaySnapshot.time);

                        if (isDuplicate) {
                            // Update the existing snapshot with new data if needed
                            mergedSnapshots.forEach((snap, index) => {
                                if (snap.time === latestLastDaySnapshot.time) {
                                    mergedSnapshots[index] = latestLastDaySnapshot; // Overwrite with the latest snapshot
                                }
                            });
                        } else {
                            // Add the latest snapshot if it doesn't exist
                            mergedSnapshots.push(latestLastDaySnapshot);
                        }
                    }

                    // Sort the merged snapshots by time (optional, for consistency)
                    mergedSnapshots.sort((a, b) => new Date(a.time) - new Date(b.time));


                    console.log(mergedSnapshots);

                    // Update portfolio summary and chart with merged data
                    updatePortfolioSummary({ snapshots: mergedSnapshots });
                    renderGraph({ snapshots: mergedSnapshots }, chartCanvas);
                } else {
                    console.error("Failed to fetch portfolio data:", periodResponse.message || lastDayResponse.message);
                    alert("Error fetching portfolio data. Please try again.");
                }
            } catch (error) {
                console.error("Error fetching portfolio data:", error);
                alert("An unexpected error occurred while fetching portfolio data.");
            }
        }
    }

    document.getElementById("toggle-cumulative").addEventListener("change", async function () {
        console.log("Toggle state changed. Fetching data...");
        await fetchPortfolioData();
    });




    function renderGraph(data, ctx) {
        console.log("Rendering graph with data:", data);

        const snapshots = data.snapshots;

        if (!Array.isArray(snapshots)) {
            console.error("Snapshots data is not an array:", snapshots);
            return;
        }

        // Prepare X-axis (time) and Y-axis (values)
        const labels = snapshots.map((entry) => new Date(entry.time).toLocaleTimeString());
        const portfolioValues = snapshots.map((entry) => {
            const investment = entry.investment || 0;
            const pieCash = entry.pieCash || 0;
            const ppl = entry.ppl || 0;
            return investment + pieCash + ppl; // Total portfolio value
        });
        const investedValues = snapshots.map((entry) => (entry.investment || 0) + (entry.pieCash || 0)); // Invested amount

        const latestSnapshot = snapshots[snapshots.length - 1];
        updatePortfolioSummary(latestSnapshot);

        // Destroy the existing chart if it exists
        if (portfolioChart) {
            portfolioChart.destroy();
        }

        // Create the chart with zoom and pan enabled
        portfolioChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels, // Time on X-axis
                datasets: [
                    {
                        label: "Portfolio Value (€)", // Total portfolio value
                        data: portfolioValues,
                        borderColor: "#00b4d8", // Bright aqua
                        backgroundColor: "rgba(0, 180, 216, 0.1)", // Light fill under the line
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        fill: true, // Enable fill
                    },
                    {
                        label: "Invested Amount (€)", // Invested line
                        data: investedValues,
                        borderColor: "#ef4444", // Distinct red for invested line
                        borderDash: [5, 5], // Dashed line
                        borderWidth: 1.5,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false, // No fill for invested line
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        enabled: true,
                        mode: "nearest", // Ensures the tooltip snaps to the nearest point vertically
                        intersect: false, // Ensures it triggers even when not intersecting a point
                        position: "nearest", // Positions tooltip near the cursor
                        callbacks: {
                            title: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex;
                                const snapshot = snapshots[index];
                                updatePortfolioSummary(snapshot); // Update values on hover

                                // Format the time in 24-hour format
                                const formattedTime = new Intl.DateTimeFormat("en-GB", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hourCycle: "h23", // Ensures 24-hour time
                                }).format(new Date(snapshots[index].time));

                                return `${formattedTime}`;
                            },

                            label: (tooltipItem) => {
                                const datasetIndex = tooltipItem.datasetIndex;
                                const dataPoint = tooltipItem.raw; // Value of the point
                                if (datasetIndex === 0) {
                                    return `Portfolio Value: €${dataPoint.toFixed(2)}`;
                                } else if (datasetIndex === 1) {
                                    return `Invested Amount: €${dataPoint.toFixed(2)}`;
                                }
                                return '';
                            },
                        },
                    },
                    legend: {
                        display: true,
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.datasetIndex;
                            const dataset = legend.chart.data.datasets[index];
                            dataset.hidden = !dataset.hidden; // Toggle visibility
                            legend.chart.update();
                        },
                    },
                    zoom: {
                        pan: {
                            enabled: true, // Enable panning
                            mode: "x", // Allow panning only on the X-axis
                            threshold: 10, // Minimum drag distance to initiate panning
                        },
                        zoom: {
                            wheel: {
                                enabled: true, // Enable zooming with mouse wheel
                            },
                            pinch: {
                                enabled: true, // Enable zooming with touch gestures
                            },
                            drag: {
                                enabled: true, // Enable drag-to-zoom
                                threshold: 10, // Minimum distance for drag-to-zoom to trigger
                            },
                            mode: "x", // Allow zooming only on the X-axis
                        },
                    },
                    decimation: {
                        enabled: true,
                        algorithm: 'min-max', // Keeps min and max points for better visibility
                        samples: 100, // Target number of samples
                    },
                },
                scales: {
                    x: {
                        display: false,
                        grid: {
                            display: false,
                        },
                        ticks: {
                            font: {
                                family: "Arial, sans-serif",
                                size: 10,
                            },
                            color: "#666",
                        },
                    },
                    y: {
                        position: "right",
                        grid: {
                            display: true,
                            color: "rgba(200, 200, 200, 0.1)",
                        },
                        ticks: {
                            font: {
                                family: "Arial, sans-serif",
                                size: 10,
                            },
                            color: "#666",
                            callback: function (value) {
                                return `€${value.toFixed(2)}`;
                            },
                        },
                    },
                },
                hover: {
                    mode: "nearest", // Make the bubble appear nearest to the mouse pointer vertically
                    intersect: false, // Ensure the interaction is not limited to points
                },
            },

        });



        const chartCanvas = ctx.canvas;
        chartCanvas.addEventListener("mouseleave", () => {
            updatePortfolioSummary(latestSnapshot);
        });
        //TODO: Still in development
        // chartCanvas.addEventListener("click", (event) => {
        //     const rect = chartCanvas.getBoundingClientRect();
        //     const clickX = event.clientX - rect.left; // X-coordinate of the click relative to the canvas
        //     const canvasCenter = rect.width / 2; // Middle of the canvas

        //     const panDirection = clickX > canvasCenter ? -100 : 100; // Negative pans to the right, positive pans to the left

        //     portfolioChart.pan({
        //         x: panDirection, // Pan amount
        //     });
        // });
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




    // Enable "Enter" key to submit the login form
    document.addEventListener("keydown", (event) => {
        const loginFormVisible = document.getElementById("login-form").style.display !== "none";
        if (loginFormVisible && event.key === "Enter") {
            event.preventDefault(); // Prevent default form submission
            document.getElementById("login-button").click(); // Trigger the login button click
        }
    });

    // Handle 2FA Input Behavior
    const twoFaInputs = document.querySelectorAll(".fa2-input");

    // Add event listeners for auto-focus and backspacing
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

        // Ensure only digits can be entered
        input.addEventListener("keypress", (e) => {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault(); // Block non-numeric input
            }
        });
    });

    // Back button functionality
    backToMenuButton.addEventListener("click", () => {
        portfolioSection.style.display = "none";
        menuSection.style.display = "block";
        console.log("Navigated back to the menu");
    });

});
