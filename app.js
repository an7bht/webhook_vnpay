const crypto = require('crypto');
const express = require('express');
const app = express();

// Middleware để lấy query string
app.use(express.json());

app.get('/vnpay/ipn', (req, res) => {
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
    // const secretKey = process.env.VNP_HASH_SECRET || 'GJZQD3CKFVP6FU0OPP56E48YMAAUWOHO';
    const secretKey = 'GJZQD3CKFVP6FU0OPP56E48YMAAUWOHO';

    // Tạo chữ ký từ dữ liệu
    const checkSum = crypto
        .createHmac('sha512', secretKey)
        .update(signData)
        .digest('hex');

    // So sánh chữ ký
    if (checkSum.toLowerCase() === vnp_SecureHash.toLowerCase()) {
        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];

        // Kiểm tra trạng thái giao dịch và cập nhật cơ sở dữ liệu hoặc tệp tin tương ứng
        if (responseCode === '00') {
            // Giao dịch thành công
            // Cập nhật trạng thái đơn hàng trong cơ sở dữ liệu hoặc tệp tin
            return res.json({ RspCode: '00', Message: 'Success' });
        } else {
            // Giao dịch không thành công
            return res.json({ RspCode: '01', Message: 'Transaction failed' });
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
