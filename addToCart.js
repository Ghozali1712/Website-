const axios = require('axios');

async function addToCart(headers, body) {
  const url = 'https://ap-mc.klikindomaret.com/assets-klikidmgroceries/api/post/cart-xpress/api/webapp/cart/add-to-cart';

  try {
    const response = await axios.post(url, body, { headers });
    return response.data;
  } catch (error) {
    // Tangani error dengan lebih deskriptif
    if (error.response) {
      throw new Error(
        `Error Response: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else if (error.request) {
      throw new Error('No response received from server.');
    } else {
      throw new Error(`Unexpected Error: ${error.message}`);
    }
  }
}

module.exports = addToCart;