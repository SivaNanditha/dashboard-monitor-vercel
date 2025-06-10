// Bulletproof Dashboard Monitor - Fixed Amount Extraction
import fetch from 'node-fetch';

// Configuration
const DASHBOARD_URL = 'https://pay.onestopfashionhub.in/ssadmin/dashboard';
const LOGIN_URL = 'https://pay.onestopfashionhub.in/ssadmin/auth/login';

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7754276298:AAEWZjcABw8qmX9n7ykzQLWzSFWqa_e6doI';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1002643858824';
const USERNAME = process.env.USERNAME || 'Admin';
const PASSWORD = process.env.PASSWORD || 'Admin@onestop';

const TIMEZONE = 'Asia/Kolkata';

export default async function handler(req, res) {
    console.log('🚀 Starting Dashboard Monitor - Fixed Version');
    
    const istTime = new Date().toLocaleString('en-IN', { 
        timeZone: TIMEZONE,
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    console.log('🕒 IST Time:', istTime);

    try {
        // Step 1: Complete login flow
        const sessionCookies = await performCompleteLogin();
        console.log('✅ Login completed successfully');
        
        // Step 2: Get dashboard data using multiple methods
        const dashboardData = await getDashboardData(sessionCookies);
        
        // Step 3: Extract amounts using precise targeting
        const payinAmount = extractPayinAmount(dashboardData);
        const payoutAmount = extractPayoutAmount(dashboardData);
        
        console.log('💰 Final Payin Amount:', payinAmount);
        console.log('💸 Final Payout Amount:', payoutAmount);
        
        // Step 4: Send to Telegram
        const message = formatMessage(payinAmount, payoutAmount);
        await sendToTelegram(message);
        
        console.log('✅ Successfully completed all operations');
        
        return res.status(200).json({
            success: true,
            message: 'Dashboard monitor executed successfully',
            timestamp: new Date().toISOString(),
            data: {
                payin: payinAmount,
                payout: payoutAmount,
                totalVolume: calculateTotalVolume(payinAmount, payoutAmount),
                lastUpdated: istTime
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Send error notification
        try {
            const errorMessage = `❌ Dashboard Monitor Error: ${error.message}\n🕒 Time: ${istTime}`;
            await sendToTelegram(errorMessage);
        } catch (telegramError) {
            console.error('Failed to send error notification:', telegramError.message);
        }
        
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// BULLETPROOF LOGIN - Multiple step authentication
async function performCompleteLogin() {
    console.log('🔐 Starting complete login flow');
    
    const cookieJar = new Map();
    
    // Step 1: Get initial session
    console.log('🌐 Step 1: Getting initial session');
    const initialResponse = await fetch('https://pay.onestopfashionhub.in/ssadmin', {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    
    extractCookies(initialResponse, cookieJar);
    console.log('🍪 Initial cookies:', cookieJar.size);
    
    // Step 2: Visit login page
    console.log('🔐 Step 2: Visiting login page');
    const cookieString = buildCookieString(cookieJar);
    
    const loginPageResponse = await fetch(LOGIN_URL, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': cookieString
        }
    });
    
    extractCookies(loginPageResponse, cookieJar);
    console.log('🍪 After login page:', cookieJar.size);
    
    // Step 3: Submit login credentials
    console.log('🔐 Step 3: Submitting credentials');
    const formData = new URLSearchParams({
        username: USERNAME,
        password: PASSWORD
    });
    
    const finalCookieString = buildCookieString(cookieJar);
    
    const loginSubmitResponse = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': LOGIN_URL,
            'Cookie': finalCookieString,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        },
        body: formData.toString(),
        redirect: 'manual'
    });
    
    extractCookies(loginSubmitResponse, cookieJar);
    console.log('🔐 Login response status:', loginSubmitResponse.status);
    console.log('🍪 After login submit:', cookieJar.size);
    
    // Step 4: Access dashboard to establish session
    console.log('🏠 Step 4: Accessing dashboard');
    const authenticatedCookieString = buildCookieString(cookieJar);
    
    const dashboardResponse = await fetch(DASHBOARD_URL, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': authenticatedCookieString,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': LOGIN_URL
        }
    });
    
    extractCookies(dashboardResponse, cookieJar);
    console.log('🏠 Dashboard access status:', dashboardResponse.status);
    console.log('🍪 Final cookies:', cookieJar.size);
    
    return cookieJar;
}

// BULLETPROOF DATA EXTRACTION - Multiple methods
async function getDashboardData(cookieJar) {
    console.log('📊 Getting dashboard data using multiple methods');
    
    const cookieString = buildCookieString(cookieJar);
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookieString,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.5',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': DASHBOARD_URL,
        'DNT': '1',
        'Connection': 'keep-alive'
    };
    
    const results = {};
    
    // Method 1: Try payin summary API
    try {
        console.log('📊 Method 1: Payin Summary API');
        const payinResponse = await fetch('https://pay.onestopfashionhub.in/ssadmin/remote/getDashboardPayinSummary', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: ''
        });
        
        const payinText = await payinResponse.text();
        console.log('📊 Payin API Response:', payinText);
        results.payinAPI = payinText;
    } catch (error) {
        console.log('❌ Payin API failed:', error.message);
    }
    
    // Method 2: Try payout summary API
    try {
        console.log('📊 Method 2: Payout Summary API');
        const payoutResponse = await fetch('https://pay.onestopfashionhub.in/ssadmin/remote/getDashboardPayoutSummary', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: ''
        });
        
        const payoutText = await payoutResponse.text();
        console.log('📊 Payout API Response:', payoutText);
        results.payoutAPI = payoutText;
    } catch (error) {
        console.log('❌ Payout API failed:', error.message);
    }
    
    // Method 3: Try main dashboard page scraping
    try {
        console.log('📊 Method 3: Dashboard Page Scraping');
        const dashboardResponse = await fetch(DASHBOARD_URL, {
            method: 'GET',
            headers: headers
        });
        
        const dashboardHTML = await dashboardResponse.text();
        console.log('📊 Dashboard HTML Length:', dashboardHTML.length);
        results.dashboardHTML = dashboardHTML;
    } catch (error) {
        console.log('❌ Dashboard scraping failed:', error.message);
    }
    
    return results;
}

// FIXED: Precise payin amount extraction
function extractPayinAmount(dashboardData) {
    console.log('💰 Extracting payin amount using precise targeting');
    
    // Target the payin API response specifically
    const payinData = dashboardData.payinAPI;
    if (payinData && typeof payinData === 'string') {
        console.log('💰 Analyzing payin data for amount extraction');
        
        // Method 1: Look for "Total Payin Amount" column specifically
        const totalPayinMatch = payinData.match(/Total Payin Amount.*?<td class="text-center">Rs\s*([\d,]+\.?\d*)<\/td>/is);
        if (totalPayinMatch) {
            const cleanAmount = cleanAndFormatAmount(totalPayinMatch[1]);
            console.log('💰 Found payin amount (Method 1):', cleanAmount);
            return cleanAmount;
        }
        
        // Method 2: Look for the 4th Rs amount in the table (should be Total Payin Amount)
        const allAmounts = payinData.match(/<td class="text-center">Rs\s*([\d,]+\.?\d*)<\/td>/g);
        if (allAmounts && allAmounts.length >= 1) {
            // The first Rs amount should be the Total Payin Amount
            const amountMatch = allAmounts[0].match(/Rs\s*([\d,]+\.?\d*)/);
            if (amountMatch) {
                const cleanAmount = cleanAndFormatAmount(amountMatch[1]);
                console.log('💰 Found payin amount (Method 2):', cleanAmount);
                return cleanAmount;
            }
        }
        
        // Method 3: Look for any large amount (> 1000) that's not a percentage
        const largeAmounts = payinData.match(/Rs\s*([\d,]+\.?\d*)/g);
        if (largeAmounts) {
            for (const amount of largeAmounts) {
                const numericMatch = amount.match(/Rs\s*([\d,]+\.?\d*)/);
                if (numericMatch) {
                    const numericValue = parseFloat(numericMatch[1].replace(/,/g, ''));
                    if (numericValue > 1000) { // Should be a large transaction amount
                        const cleanAmount = cleanAndFormatAmount(numericMatch[1]);
                        console.log('💰 Found payin amount (Method 3):', cleanAmount);
                        return cleanAmount;
                    }
                }
            }
        }
    }
    
    console.log('❌ Could not extract payin amount');
    return 'N/A';
}

// FIXED: Precise payout amount extraction
function extractPayoutAmount(dashboardData) {
    console.log('💸 Extracting payout amount using precise targeting');
    
    // Target the payout API response specifically
    const payoutData = dashboardData.payoutAPI;
    if (payoutData && typeof payoutData === 'string') {
        console.log('💸 Analyzing payout data for amount extraction');
        
        // Method 1: Look for "Total Payout Amount" column specifically
        const totalPayoutMatch = payoutData.match(/Total Payout Amount.*?<td class="text-center">Rs\s*([\d,]+\.?\d*)<\/td>/is);
        if (totalPayoutMatch) {
            const cleanAmount = cleanAndFormatAmount(totalPayoutMatch[1]);
            console.log('💸 Found payout amount (Method 1):', cleanAmount);
            return cleanAmount;
        }
        
        // Method 2: Look for the 4th Rs amount in the table (should be Total Payout Amount)
        const allAmounts = payoutData.match(/<td class="text-center">Rs\s*([\d,]+\.?\d*)<\/td>/g);
        if (allAmounts && allAmounts.length >= 1) {
            // The first Rs amount should be the Total Payout Amount
            const amountMatch = allAmounts[0].match(/Rs\s*([\d,]+\.?\d*)/);
            if (amountMatch) {
                const cleanAmount = cleanAndFormatAmount(amountMatch[1]);
                console.log('💸 Found payout amount (Method 2):', cleanAmount);
                return cleanAmount;
            }
        }
        
        // Method 3: Look for any large amount (> 1000) that's not a percentage
        const largeAmounts = payoutData.match(/Rs\s*([\d,]+\.?\d*)/g);
        if (largeAmounts) {
            for (const amount of largeAmounts) {
                 const numericMatch = amount.match(/Rs\s*([\d,]+\.?\d*)/);
                if (numericMatch) {
                    const numericValue = parseFloat(numericMatch[1].replace(/,/g, ''));
                    if (numericValue > 1000) { // Should be a large transaction amount
                        const cleanAmount = cleanAndFormatAmount(numericMatch[1]);
                        console.log('💸 Found payout amount (Method 3):', cleanAmount);
                        return cleanAmount;
                    }
                }
            }
        }
    }
    
    console.log('❌ Could not extract payout amount');
    return 'N/A';
}

// UTILITY FUNCTIONS
function extractCookies(response, cookieJar) {
    const setCookieHeaders = response.headers.raw()['set-cookie'];
    if (setCookieHeaders) {
        setCookieHeaders.forEach(cookie => {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');
            if (name && value) {
                cookieJar.set(name.trim(), value.trim());
            }
        });
    }
}

function buildCookieString(cookieJar) {
    return Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

function cleanAndFormatAmount(amount) {
    if (!amount || typeof amount !== 'string') return 'N/A';
    
    // Remove all non-numeric characters except decimal point and comma
    let cleaned = amount.replace(/[^\d,.-]/g, '');
    
    // Remove commas
    cleaned = cleaned.replace(/,/g, '');
    
    // Parse as float
    const parsed = parseFloat(cleaned);
    
    // Validate the number
    if (isNaN(parsed) || parsed <= 0 || parsed > 100000000) {
        return 'N/A';
    }
    
    // Format as currency
    return `Rs ${parsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calculateTotalVolume(payinAmount, payoutAmount) {
    try {
        const payin = extractNumericValue(payinAmount);
        const payout = extractNumericValue(payoutAmount);
        const total = payin + payout;
        return total > 0 ? `Rs ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
    } catch (error) {
        return 'N/A';
    }
}

function extractNumericValue(amount) {
    if (!amount || amount === 'N/A') return 0.0;
    
    const numericString = amount
        .replace(/Rs\s*/g, '')
        .replace(/₹\s*/g, '')
        .replace(/,/g, '')
        .trim();
    
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0.0 : parsed;
}

function formatMessage(payinAmount, payoutAmount) {
    const istTime = new Date().toLocaleString('en-IN', { 
        timeZone: TIMEZONE,
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const totalVolume = calculateTotalVolume(payinAmount, payoutAmount);
    
    return `🔔 *One Stop Fashion Hub Dashboard Update*

📊 *Today's Transaction Summary*
💰 Payin Amount: ${payinAmount}
💸 Payout Amount: ${payoutAmount}
📈 Total Volume: ${totalVolume}

🕒 Updated at: ${istTime}`;
}

async function sendToTelegram(message) {
    console.log('📤 Sending message to Telegram');
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        })
    });

    console.log('📤 Telegram response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Telegram failed: ${response.status} - ${errorText}`);
    }

    console.log('✅ Telegram message sent successfully');
    return await response.json();
}

