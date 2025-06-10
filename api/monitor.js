const fetch = require('node-fetch');

// Configuration
const DASHBOARD_URL = "https://pay.onestopfashionhub.in/ssadmin/dashboard";
const LOGIN_URL = "https://pay.onestopfashionhub.in/ssadmin/auth/login";

// Environment variables (set in Vercel)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;

// Main handler function
export default async function handler(req, res) {
    console.log('🚀 Dashboard Monitor Started');
    
    try {
        // Get current IST time
        const now = new Date();
        const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        console.log('🕒 IST Time:', istTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}));
        
        // Login and fetch data
        const cookieJar = new Map();
        await loginToDashboard(cookieJar);
        console.log('🔐 Login successful');
        
        const payinAmount = await getPayinAmount(cookieJar);
        const payoutAmount = await getPayoutAmount(cookieJar);
        
        console.log('💰 Payin Amount:', payinAmount);
        console.log('💸 Payout Amount:', payoutAmount);
        
        // Format and send message
        const message = formatMessage(payinAmount, payoutAmount);
        await sendToTelegram(message);
        
        console.log('✅ Successfully sent to Telegram');
        
        res.status(200).json({
            success: true,
            message: 'Dashboard monitor executed successfully',
            timestamp: istTime.toISOString(),
            data: {
                payin: payinAmount,
                payout: payoutAmount
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        try {
            const errorMessage = `❌ *Vercel Monitor Error*\n🕒 ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}\n⚠️ ${error.message}`;
            await sendToTelegram(errorMessage);
        } catch (telegramError) {
            console.error('Failed to send error to Telegram:', telegramError.message);
        }
        
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Login function
async function loginToDashboard(cookieJar) {
    const formData = new URLSearchParams();
    formData.append('username', USERNAME);
    formData.append('password', PASSWORD);
    
    const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: formData.toString()
    });
    
    // Store cookies
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
        cookies.split(',').forEach(cookie => {
            const [name, value] = cookie.split('=');
            if (name && value) {
                cookieJar.set(name.trim(), value.split(';')[0]);
            }
        });
    }
    
    if (!response.ok && response.status !== 302) {
        throw new Error(`Login failed with status: ${response.status}`);
    }
}

// Get payin amount
async function getPayinAmount(cookieJar) {
    const cookieString = Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    
    const response = await fetch('https://pay.onestopfashionhub.in/ssadmin/remote/getDashboardPayinSummary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': DASHBOARD_URL,
            'Cookie': cookieString
        },
        body: ''
    });
    
    const text = await response.text();
    const match = text.match(/Rs\s+[\d,]+\.\d{2}/);
    return match ? match[0] : 'N/A';
}

// Get payout amount
async function getPayoutAmount(cookieJar) {
    const cookieString = Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    
    const response = await fetch('https://pay.onestopfashionhub.in/ssadmin/remote/getDashboardPayoutSummary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': DASHBOARD_URL,
            'Cookie': cookieString
        },
        body: ''
    });
    
    const text = await response.text();
    const match = text.match(/Rs\s+[\d,]+\.\d{2}/);
    return match ? match[0] : 'N/A';
}

// Format message
function formatMessage(payinAmount, payoutAmount) {
    const now = new Date();
    const istTime = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const totalVolume = calculateTotalVolume(payinAmount, payoutAmount);
    
    return `🔔 *One Stop Fashion Hub Dashboard Update*\n\n` +
           `📊 *Today's Transaction Summary*\n` +
           `💰 Payin Amount: ${payinAmount}\n` +
           `💸 Payout Amount: ${payoutAmount}\n` +
           `📈 Total Volume: ${totalVolume}\n\n` +
           `🕒 Updated at: ${istTime}`;
}

// Calculate total volume
function calculateTotalVolume(payinAmount, payoutAmount) {
    try {
        const payin = extractNumericValue(payinAmount);
        const payout = extractNumericValue(payoutAmount);
        const total = payin + payout;
        return `Rs ${total.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    } catch (error) {
        return 'N/A';
    }
}

// Extract numeric value
function extractNumericValue(amount) {
    if (!amount || amount === 'N/A') return 0;
    return parseFloat(amount.replace(/Rs\s*/, '').replace(/,/g, ''));
}

// Send to Telegram
async function sendToTelegram(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
    }
}
