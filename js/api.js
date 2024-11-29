import { renderGraph } from "./chart.js";
import { updatePortfolioSummary } from "./ui.js";

export async function fetchPortfolioData(selectedPeriod) {

    const chartCanvas = document.getElementById("portfolio-chart").getContext("2d");
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
                // console.log(`Fetching data for period: ${period}`);
                const response = await browser.runtime.sendMessage({
                    action: "fetchPortfolioData",
                    period,
                });

                if (response.status === "SUCCESS") {
                    // console.log(`Data for ${period}:`, response.data);

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

            // console.log("Final merged snapshots:", allSnapshots);

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
                // console.log("Period data:", periodResponse.data);
                // console.log("Last day data:", lastDayResponse.data);

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
