console.log("Background script loaded and listening for messages.");

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in background script:", request);

    // Fetch Portfolio Data
    if (request.action === "fetchPortfolioData") {
        const period = request.period || "LAST_DAY"; // Default to LAST_DAY if no period is provided

        (async () => {
            try {
                const response = await fetch(`https://live.services.trading212.com/rest/v2/portfolio?period=${period}`, {
                    method: "GET",
                    credentials: "include", // Ensures cookies are included
                    headers: { "Content-Type": "application/json" },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log(`Portfolio data fetched for period ${period}:`, data);
                sendResponse({ status: "SUCCESS", data });
            } catch (error) {
                console.error(`Error fetching portfolio data for period ${period}:`, error);
                sendResponse({ status: "ERROR", message: "Failed to fetch portfolio data." });
            }
        })();

        return true; // Keeps the message channel open
    }


    // Login Action
    if (request.action === "login") {
        (async () => {
            try {
                const loginResponse = await fetch(
                    "https://live.services.trading212.com/rest/v4/login?skipVersionCheck=false",
                    {
                        method: "POST",
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
                            "Accept": "application/json",
                            "Accept-Language": "en-US,en;q=0.5",
                            "Content-Type": "application/json",
                            "X-Trader-Client": "application=WC4,version=7.51.1,dUUID=20bf10dd-077d-4212-9ff9-c57b8ec3bb88",
                            "X-Trader-Device-Model": "Firefox",
                            "Origin": "https://app.trading212.com",
                            "Referer": "https://app.trading212.com/",
                            "demo": "9b04de358699eb029c9b3f06f5acccf8",
                            "Cookie":
                                "5d60904a5b52802c63d8b5b97bf8a1ea=%2220bf10dd-077d-4212-9ff9-c57b8ec3bb88%22;",
                        },
                        body: JSON.stringify({
                            username: request.username,
                            password: request.password,
                            rememberMe: true,
                        }),
                    }
                );

                const loginData = await loginResponse.json();
                console.log("Login response data:", loginData);

                if (loginResponse.status === 403 && loginData.context?.type === "TwoFactorAuthenticationRequired") {
                    console.log("2FA Required - Sending Response to Popup");
                    sendResponse({
                        status: "2FA_REQUIRED",
                        message: "Two-factor authentication is required.",
                    });
                } else if (loginResponse.ok) {
                    const loginState = {
                        isAuthenticated: true,
                        username: request.username,
                        sessionCookies: document.cookie,
                        timestamp: Date.now(), // Save timestamp for session expiry logic
                    };

                    await browser.storage.local.set({ loginState });

                    console.log("Login state saved to storage:", loginState);

                    sendResponse({
                        status: "SUCCESS",
                        message: "Login successful!",
                        data: loginData,
                    });
                } else {
                    sendResponse({
                        status: "ERROR",
                        message: `Login failed: ${loginData.context?.type || "Unknown error"}`,
                    });
                }
            } catch (error) {
                console.error("Error during login:", error);
                sendResponse({
                    status: "ERROR",
                    message: "An error occurred while attempting to log in.",
                });
            }
        })();

        return true; // Keeps the message channel open
    }

    // Submit 2FA Action
    if (request.action === "submit2FA") {
        (async () => {
            try {
                const loginBody = {
                    username: request.username,
                    password: request.password,
                    rememberMe: true,
                    twoFactorAuth: {
                        authenticationCode: request.twoFactorAuthCode,
                        rememberDevice: false,
                    },
                };
                console.log(loginBody);

                const loginResponse = await fetch(
                    "https://live.services.trading212.com/rest/v4/login?skipVersionCheck=false",
                    {
                        method: "POST",
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
                            "Accept": "application/json",
                            "Accept-Language": "en-US,en;q=0.5",
                            "Content-Type": "application/json",
                            "X-Trader-Client": "application=WC4,version=7.51.1,dUUID=20bf10dd-077d-4212-9ff9-c57b8ec3bb88",
                            "X-Trader-Device-Model": "Firefox",
                            "Origin": "https://app.trading212.com",
                            "Referer": "https://app.trading212.com/",
                            demo: "9b04de358699eb029c9b3f06f5acccf8",
                            Cookie:
                                '5d60904a5b52802c63d8b5b97bf8a1ea=%2220bf10dd-077d-4212-9ff9-c57b8ec3bb88%22;',
                        },
                        body: JSON.stringify(loginBody),
                    }
                );

                const loginData = await loginResponse.json();

                if (loginResponse.ok) {
                    const loginState = {
                        isAuthenticated: true,
                        username: request.username,
                        sessionCookies: document.cookie,
                        timestamp: Date.now(), // Save timestamp for session expiry logic
                    };

                    await browser.storage.local.set({ loginState });

                    console.log("Login state saved to storage:", loginState);


                    sendResponse({
                        status: "SUCCESS",
                        message: "Login successful!",
                        data: loginData,
                    });
                }
                else {
                    console.error("2FA verification failed:", loginData);
                    sendResponse({
                        status: "ERROR",
                        message: `2FA verification failed: ${loginData.message || "Unknown error"}`,
                    });
                }
            } catch (error) {
                console.error("Error during 2FA verification:", error);
                sendResponse({
                    status: "ERROR",
                    message: "An error occurred while verifying 2FA.",
                });
            }
        })();

        return true; // Keeps the message channel open
    }



    console.error("Unknown action received:", request.action);
    return false; // Default return for unrelated requests
});
