// Enhanced Dashboard Monitor with all Java functionalityyy
import fetch from 'node-fetch';

// Configuration
const DASHBOARD_URL = 'https://pay.onestopfashionhub.in/ssadmin/dashboard';
const LOGIN_URL = 'https://pay.onestopfashionhub.in/ssadmin/auth/login';

// Environment variables with fallbacks
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7754276298:AAEWZjcABw8qmX9n7ykzQLWzSFWqa_e6doI';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1002643858824';
const USERNAME = process.env.USERNAME || 'Admin';
const PASSWORD = process.env.PASSWORD || 'Admin@onestop';

// Timeout settings - OPTIMIZED FOR SPEED
const CONNECTION_TIMEOUT_MS = 15000;
const API_TIMEOUT_MS = 10000;

// Timezone setting
const TIMEZONE = 'Asia/Kolkata';

export default async function handler(req, res) {
    console.log('🚀 Starting One Stop Fashion Hub Dashboard Monitor...');
    
    // Environment debug
    console.log('🔍 ENV DEBUG:');
    console.log('BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? `SET (${TELEGRAM_BOT_TOKEN.substring(0, 10)}...)` : 'MISSING');
    console.log('CHAT_ID:', TELEGRAM_CHAT_ID);
    console.log('USERNAME:', USERNAME);
    console.log('PASSWORD:', PASSWORD ? 'SET' : 'MISSING');
    
    // IST Time
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
        // Validate environment variables
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !USERNAME || !PASSWORD) {
            throw new Error('Missing environment variables');
        }

        console.log('🔄 Fetching real-time dashboard data at', istTime);

        // Initialize cookie jar
        const cookieJar = new Map();
        
        // Login to dashboard
        await loginToDashboard(cookieJar);
        console.log('🔐 Login successful');
        
        // Fetch amounts with enhanced error handling
        const payinAmount = await getPayinAmount(cookieJar);
        const payoutAmount = await getPayoutAmount(cookieJar);
        
        console.log('💰 Final Payin Amount:', payinAmount);
        console.log('💸 Final Payout Amount:', payoutAmount);
        
        // Format and send message
        const message = formatMessage(payinAmount, payoutAmount);
        await sendToTelegram(message);
        
        console.log('✅ Successfully sent data to Telegram');
        
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
        
        // Send error notification to Telegram
        try {
            const errorMessage = `❌ Dashboard Monitor Error: ${error.message}\n🕒 Time: ${istTime}`;
            await sendToTelegram(errorMessage);
            console.log('📤 Sent error notification to Telegram');
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

// Enhanced login function with better error handling
async function loginToDashboard(cookieJar) {
    console.log('🔐 Logging in to dashboard');
    
    const formData = new URLSearchParams({
        username: USERNAME,
        password: PASSWORD
    });

    const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        body: formData.toString(),
        timeout: CONNECTION_TIMEOUT_MS
    });

    console.log('🔐 Login response status code:', response.status);

    if (response.status !== 200 && response.status !== 302) {
        throw new Error(`Login failed with status code: ${response.status}`);
    }

    // Extract cookies
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
        const cookies = setCookieHeader.split(',');
        cookies.forEach(cookie => {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');
            if (name && value) {
                cookieJar.set(name.trim(), value.trim());
            }
        });
    }
}

// Enhanced payin function with detailed debugging
async function getPayinAmount(cookieJar) {
    console.log('📊 Fetching payin amount');
    const cookieString = Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    
    const response = await fetch('https://pay.onestopfashionhub.in/ssadmin/remote/getDashboardPayinSummary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': DASHBOARD_URL,
            'Cookie': cookieString
        },
        body: '',
        timeout: API_TIMEOUT_MS
    });

    console.log('📊 Payin API Status:', response.status);
    const text = await response.text();
    console.log('📊 Payin Response Length:', text.length);
    console.log('📊 Payin Response Preview:', text.substring(0, 500));

    // Multiple regex patterns to try
    const patterns = [
        /Rs\s+[\d,]+\.\d{2}/,           // Rs 1,234.56
        /₹\s*[\d,]+\.\d{2}/,            // ₹1,234.56
        /[\d,]+\.\d{2}/,                // 1,234.56
        /"amount":\s*"?([\d,]+\.?\d*)"?/, // JSON format
        /"value":\s*"?([\d,]+\.?\d*)"?/   // Alternative JSON
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const amount = match[0].includes('Rs') || match[0].includes('₹') ? match[0] : `Rs ${match[0]}`;
            console.log('💰 Extracted payin amount:', amount);
            return amount;
        }
    }

    console.log('❌ Could not extract payin amount from response');
    console.log('📄 Full response for debugging:', text);
    return 'N/A';
}

// Enhanced payout function with detailed debugging
async function getPayoutAmount(cookieJar) {
    console.log('📊 Fetching payout amount');
    const cookieString = Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    
    const response = await fetch('https://pay.onestopfashionhub.in/ssadmin/remote/getDashboardPayoutSummary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': DASHBOARD_URL,
            'Cookie': cookieString
        },
        body: '',
        timeout: API_TIMEOUT_MS
    });

    console.log('📊 Payout API Status:', response.status);
    const text = await response.text();
    console.log('📊 Payout Response Length:', text.length);
    console.log('📊 Payout Response Preview:', text.substring(0, 500));

    // Multiple regex patterns to try
    const patterns = [
        /Rs\s+[\d,]+\.\d{2}/,           // Rs 1,234.56
        /₹\s*[\d,]+\.\d{2}/,            // ₹1,234.56
        /[\d,]+\.\d{2}/,                // 1,234.56
        /"amount":\s*"?([\d,]+\.?\d*)"?/, // JSON format
        /"value":\s*"?([\d,]+\.?\d*)"?/   // Alternative JSON
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const amount = match[0].includes('Rs') || match[0].includes('₹') ? match[0] : `Rs ${match[0]}`;
            console.log('💸 Extracted payout amount:', amount);
            return amount;
        }
    }

    console.log('❌ Could not extract payout amount from response');
    console.log('📄 Full response for debugging:', text);
    return 'N/A';
}

// Enhanced message formatting (same as Java)
function formatMessage(payinAmount, payoutAmount) {
    const now = new Date();
    const istTime = now.toLocaleString('en-IN', { 
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

// Enhanced total volume calculation (same as Java)
function calculateTotalVolume(payinAmount, payoutAmount) {
    try {
        const payin = extractNumericValue(payinAmount);
        const payout = extractNumericValue(payoutAmount);
        const total = payin + payout;
        return total > 0 ? `Rs ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
    } catch (error) {
        console.error('❌ Error calculating total volume:', error.message);
        return 'N/A';
    }
}

// Enhanced numeric value extraction (same as Java)
function extractNumericValue(amount) {
    if (!amount || amount === 'N/A') {
        return 0.0;
    }
    
    const numericString = amount
        .replace(/Rs\s*/g, '')
        .replace(/₹\s*/g, '')
        .replace(/,/g, '')
        .trim();
    
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0.0 : parsed;
}

// Enhanced Telegram function with better error handling
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
        }),
        timeout: 10000
    });

    console.log('📤 Telegram API response status code:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message to Telegram. Status: ${response.status}, Response: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Telegram message sent successfully');
    return result;
}
