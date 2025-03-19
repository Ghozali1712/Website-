const addBody = (storeCode, plu) => ({
  storeCode: storeCode.trim(),
  latitude: 1,
  longitude: 1,
  mode: "PICKUP",
  districtId: "1",
  permalink: "ssunlight-pencuci-piring-lime-650ml",
  products: [
    {
      plu: plu.trim(),
      qty: 1,
    },
  ],
});

module.exports = addBody;
