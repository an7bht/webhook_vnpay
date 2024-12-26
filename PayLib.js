// Import required modules
const crypto = require('crypto');
const querystring = require('querystring');

class PayLib {
    constructor() {
        this._requestData = new Map();
    }

    // Add request data
    addRequestData(key, value) {
        if (value) {
            this._requestData.set(key, value);
        }
    }

    // Create request URL
    createRequestUrl(baseUrl, vnp_HashSecret) {
        // Sort the keys alphabetically
        const sortedKeys = Array.from(this._requestData.keys()).sort((a, b) => a.localeCompare(b));

        // Build the query string
        const queryString = sortedKeys
            .map(key => {
                const value = this._requestData.get(key);
                return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            })
            .join('&');

        // Generate the HMAC hash
        const signData = queryString;
        const vnp_SecureHash = PayLib.hmacSHA512(vnp_HashSecret, signData);

        // Construct the full URL
        return `${baseUrl}?${queryString}&vnp_SecureHash=${vnp_SecureHash}`;
    }

    // Generate HMAC SHA512 hash
    static hmacSHA512(key, inputData) {
        const hmac = crypto.createHmac('sha512', key);
        hmac.update(inputData);
        return hmac.digest('hex');
    }

    // Validate signature
    static validateSignature(rspraw, inputHash, secretKey) {
        const myChecksum = PayLib.hmacSHA512(secretKey, rspraw);
        return myChecksum.toLowerCase() === inputHash.toLowerCase();
    }
}

module.exports = PayLib; // Export the PayLib class
