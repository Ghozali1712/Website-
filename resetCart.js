const axios = require('axios');

async function resetCart(headers, body) {
  const url = 'https://ap-mc.klikindomaret.com/assets-klikidmorder/api/post/cart-xpress/api/webapp/cart/update-cart';

  try {
    const response = await axios.post(url, body, { headers });
    return response.data;
  } catch (error) {
    throw new Error(error.response ? error.response.data : error.message);
  }
}

module.exports = resetCart;
