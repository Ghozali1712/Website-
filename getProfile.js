const axios = require('axios');

async function getProfile(headers) {
  const url = 'https://ap-mc.klikindomaret.com/assets-klikidmprofile/api/get/customer/api/webapp/profile';

  try {
    const response = await axios.get(url, { headers });
    return response.data.data; // Return hanya data profil
  } catch (error) {
    throw new Error(error.response ? error.response.data : error.message);
  }
}

module.exports = getProfile;
