import { updatePortfolioSummary } from "./ui.js";

let portfolioChart;

export function renderGraph(data) {
    const ctx = document.getElementById("portfolio-chart").getContext("2d");

    if (portfolioChart) portfolioChart.destroy();

    console.log("Rendering graph with data:", data);

    const snapshots = data.snapshots;
    const labels = snapshots.map((entry) => new Date(entry.time).toLocaleTimeString());


    if (!Array.isArray(snapshots)) {
        console.error("Snapshots data is not an array:", snapshots);
        return;
    }

    // Prepare X-axis (time) and Y-axis (values)
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
}
