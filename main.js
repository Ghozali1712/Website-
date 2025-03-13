const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const axios = require('axios');
const addToCart = require('./api/addToCart');
const resetCart = require('./api/resetCart');
const getProfile = require('./api/getProfile');
const addBody = require('./ganteng/addBody');
const resetBody = require('./ganteng/resetBody');

const token = '7808073414:AAGZ96kFZK4NEkMZH8_E6e2cXm5-X4T4fqE';  // Ganti dengan token bot Anda
const bot = new TelegramBot(token, { polling: true });

// Konstanta untuk deviceId dan fcmId
const DEVICE_ID = 'e20b1b21-f08a-4ee6-b864-7bc14402d1fc';
const FCM_ID = 'e20b1b21-f08a-4ee6-b864-7bc14402d1fc';

// Objek untuk menyimpan data pengguna
let storeCodes = {}; // Array kode toko berdasarkan ID pengguna
let userTokens = {}; // Token akses berdasarkan ID pengguna
let userRefreshTokens = {}; // Refresh token berdasarkan ID pengguna
let tokenExpiryTimes = {}; // Waktu kedaluwarsa token berdasarkan ID pengguna

// Muat data dari file saat bot dimulai
async function loadData() {
    try {
        const data = await fs.readFile('data.json', 'utf8');
        const parsedData = JSON.parse(data);
        storeCodes = parsedData.storeCodes || {};
        userTokens = parsedData.userTokens || {};
        userRefreshTokens = parsedData.userRefreshTokens || {};
        tokenExpiryTimes = parsedData.tokenExpiryTimes || {};
    } catch (error) {
        console.log('Tidak ada data yang ditemukan, membuat file baru...');
    }
}

// Simpan data ke file
async function saveData() {
    const data = JSON.stringify({ storeCodes, userTokens, userRefreshTokens, tokenExpiryTimes });
    await fs.writeFile('data.json', data, 'utf8');
}

// Fungsi login
async function login(phoneNumber, password, chatId) {
    const url = 'https://ap-mc.klikindomaret.com/assets-klikidmauth/api/post/customer/api/webapp/authentication/login';
    const body = {
        email: null,
        phoneNumber: phoneNumber.trim(),
        deviceId: DEVICE_ID,
        fcmId: FCM_ID,
        password: password.trim(),
    };

    const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
    };

    const response = await axios.post(url, body, { headers });

    if (response.data.status === '00' && response.data.data.accessToken) {
        const accessToken = `Bearer ${response.data.data.accessToken}`;
        userTokens[chatId] = accessToken; // Simpan accessToken
        userRefreshTokens[chatId] = response.data.data.refreshToken; // Simpan refreshToken
        tokenExpiryTimes[chatId] = Date.now() + (response.data.data.expiresIn * 1000); // Simpan waktu kedaluwarsa
        await saveData(); // Simpan data ke file
        return accessToken;
    } else {
        throw new Error('Login gagal: ' + response.data.message);
    }
}

// Fungsi untuk memperbarui token menggunakan refreshToken
async function refreshToken(chatId) {
    const refreshToken = userRefreshTokens[chatId];
    if (!refreshToken) {
        throw new Error('Refresh token tidak ditemukan. Silakan login ulang.');
    }

    const url = 'https://ap-mc.klikindomaret.com/assets-klikidmauth/api/post/customer/api/webapp/authentication/refresh';
    const body = {
        refreshToken: refreshToken,
    };

    const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
    };

    const response = await axios.post(url, body, { headers });

    if (response.data.status === '00' && response.data.data.accessToken) {
        const newAccessToken = `Bearer ${response.data.data.accessToken}`;
        userTokens[chatId] = newAccessToken; // Perbarui accessToken
        userRefreshTokens[chatId] = response.data.data.refreshToken; // Perbarui refreshToken
        tokenExpiryTimes[chatId] = Date.now() + (response.data.data.expiresIn * 1000); // Perbarui waktu kedaluwarsa
        await saveData(); // Simpan data ke file
        return newAccessToken;
    } else {
        throw new Error('Gagal memperbarui token: ' + response.data.message);
    }
}

// Fungsi untuk memeriksa dan memperbarui token jika diperlukan
async function checkAndRefreshToken(chatId) {
    if (tokenExpiryTimes[chatId] && tokenExpiryTimes[chatId] < Date.now()) {
        // Token sudah kedaluwarsa, perbarui menggunakan refreshToken
        return await refreshToken(chatId);
    }
    return userTokens[chatId];
}

// Membuat menu keyboard
const menuKeyboard = {
    reply_markup: {
        keyboard: [
            ['/login', '/setstore'],
            ['/check', '/help']
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    }
};

// Perintah /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Halo! Silakan pilih menu di bawah:', menuKeyboard);
});

// Perintah /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
Berikut adalah daftar perintah yang tersedia:
/login - Login ke sistem
/setstore - Setel kode toko
/check - Cek stok produk
/help - Menampilkan bantuan
    `;
    bot.sendMessage(chatId, helpText, menuKeyboard);
});

// Perintah /login
bot.onText(/\/login/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, 'Masukkan nomor HP:');
    bot.once('message', (msg) => {
        const phoneNumber = msg.text;

        bot.sendMessage(chatId, 'Masukkan password:');
        bot.once('message', async (msg) => {
            const password = msg.text;

            try {
                await login(phoneNumber, password, chatId);
                bot.sendMessage(chatId, 'Login berhasil dan token disimpan.', menuKeyboard);
            } catch (error) {
                bot.sendMessage(chatId, `Login gagal: ${error.message}`, menuKeyboard);
            }
        });
    });
});

// Perintah /setstore
bot.onText(/\/setstore/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, 'Masukkan StoreCode (pisahkan dengan koma, contoh: 12345,67890,11223):');
    bot.once('message', (msg) => {
        const storeCodesInput = msg.text.trim().split(',').map(code => code.trim());
        storeCodes[chatId] = storeCodesInput; // Simpan array kode toko untuk pengguna ini
        saveData(); // Simpan data ke file
        bot.sendMessage(chatId, `StoreCode ${storeCodesInput.join(', ')} berhasil disimpan.`, menuKeyboard);
    });
});

// Perintah /check
bot.onText(/\/check/, async (msg) => {
    const chatId = msg.chat.id;

    if (!storeCodes[chatId] || storeCodes[chatId].length === 0) {
        return bot.sendMessage(chatId, 'Anda belum menyimpan StoreCode. Gunakan /setstore untuk menyimpan StoreCode.', menuKeyboard);
    }

    if (!userTokens[chatId]) {
        return bot.sendMessage(chatId, 'Anda belum login. Gunakan /login untuk login.', menuKeyboard);
    }

    try {
        // Periksa dan perbarui token jika diperlukan
        const token = await checkAndRefreshToken(chatId);

        bot.sendMessage(chatId, 'Masukkan daftar PLU (pisahkan dengan koma, contoh: 12345,67890,11223):');
        bot.once('message', async (msg) => {
            const pluList = msg.text.trim().split(',').map(plu => plu.trim());

            try {
                const headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Referer': 'https://www.klikindomaret.com/',
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.klikindomaret.com',
                    'Connection': 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Site': 'same-site',
                    'TE': 'trailers',
                    'apps': '{"app_version":"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0","device_class":"browser|browser","device_family":"none","device_id":"c03b3603-075e-4276-b420-a92d9ee93035","os_name":"Windows","os_version":"10"}',
                    'Priority': 'u=4',
                    'Pragma': 'no-cache',
                    'Authorization': token.trim(),
                    'Cache-Control': 'no-cache',
                };

                const user = await getProfile(headers);

                let resultText = `Hai ${user.name} | ${user.phoneNumber}\n============================\n`;

                for (const storeCode of storeCodes[chatId]) {
                    resultText += `Toko: ${storeCode}\n`;

                    try {
                        const resetRequestBody = resetBody(storeCode);
                        await resetCart(headers, resetRequestBody);

                        for (const plu of pluList) {
                            try {
                                const addRequestBody = addBody(storeCode, plu);
                                const response = await addToCart(headers, addRequestBody);
                                const store = response.data.selectedStore;
                                const product = response.data.products[0];

                                resultText += `
Produk: ${product.productName}
PLU: ${product.plu}
Stok: ${product.stock}
Harga: ${product.price}
${product.discountValue ? `Diskon: ${product.discountValue} - ${product.discountText}` : ''}
----------------------------\n`;
                            } catch (pluError) {
                                resultText += `PLU ${plu} gagal diproses: ${pluError.response?.data?.message || pluError.message}\n----------------------------\n`;
                            }
                        }
                    } catch (error) {
                        resultText += `Terjadi kesalahan pada toko ${storeCode}: ${error.message}\n----------------------------\n`;
                    }
                }

                await bot.sendMessage(chatId, resultText, menuKeyboard);
            } catch (error) {
                bot.sendMessage(chatId, `Terjadi kesalahan: ${error.message}`, menuKeyboard);
            }
        });
    } catch (error) {
        bot.sendMessage(chatId, `Gagal memperbarui token: ${error.message}`, menuKeyboard);
    }
});

// Muat data saat bot dimulai
loadData();
