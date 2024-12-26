const crypto = require('crypto');
const express = require('express');
const axios = require('axios');
const moment = require('moment'); // Thư viện để xử lý thời gian
const app = express();

// Middleware để lấy query string
app.use(express.json());

app.get('/vnpay/ipn', async (req, res) => {
    const vnpayData = req.query;
    const vnp_SecureHash = vnpayData['vnp_SecureHash'];

    if (!vnp_SecureHash) {
        return res.json({ RspCode: '99', Message: 'Invalid request' });
    }

    // Loại bỏ vnp_SecureHash và vnp_SecureHashType khỏi tham số để kiểm tra chữ ký
    const vnp_Params = Object.keys(vnpayData)
        .filter(key => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
        .reduce((acc, key) => {
            acc[key] = vnpayData[key];
            return acc;
        }, {});

    // Sắp xếp các tham số theo thứ tự chữ cái
    const sortedVnp_Params = Object.keys(vnp_Params).sort().reduce((acc, key) => {
        acc[key] = vnp_Params[key];
        return acc;
    }, {});

    // Tạo chuỗi dữ liệu để kiểm tra chữ ký
    const signData = Object.entries(sortedVnp_Params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    // Lấy secret key từ cấu hình
    const secretKey = process.env.VNP_HASH_SECRET || 'your_secret_key';

    // Tạo chữ ký từ dữ liệu
    const checkSum = crypto
        .createHmac('sha512', secretKey)
        .update(signData)
        .digest('hex');

    // So sánh chữ ký
    if (checkSum.toLowerCase() === vnp_SecureHash.toLowerCase()) {
        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];

        if (responseCode === '00') {
            const successData = {
                vnp: vnpayData,
                timestamp: moment().format('YYYY-MM-DD HH:mm:ss') // Thời gian hiện tại
            };
            try {
                // Gửi yêu cầu POST với dữ liệu giao dịch thành công
                const response = await axios.post('https://656161f5dcd355c08323cc14.mockapi.io/vnpay', {
                    data: successData
                });

                console.log('Response from mock API:', response.data);

                // Phản hồi thành công
                return res.json({ RspCode: '00', Message: 'Success' });
            } catch (error) {
                console.error('Error posting to mock API:', error.message);
                return res.json({ RspCode: '02', Message: 'Failed to forward transaction data' });
            }
        } else {
            // Giao dịch không thành công
            const errorData = {
                error: `Transaction failed with responseCode: ${responseCode}`,
                timestamp: moment().format('YYYY-MM-DD HH:mm:ss') // Thời gian hiện tại
            };

            try {
                // Gửi yêu cầu POST với thông tin lỗi
                const response = await axios.post('https://656161f5dcd355c08323cc14.mockapi.io/vnpay', {
                    data: errorData
                });

                console.log('Response from mock API:', response.data);

                // Phản hồi giao dịch thất bại
                return res.json({ RspCode: '01', Message: 'Transaction failed' });
            } catch (error) {
                console.error('Error posting error data to mock API:', error.message);
                return res.json({ RspCode: '03', Message: 'Failed to forward error data' });
            }
        }
    } else {
        // Chữ ký không hợp lệ
        return res.json({ RspCode: '97', Message: 'Invalid checksum' });
    }
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
