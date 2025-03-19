const resetBody = (storeCode) => ({
  storeCode: storeCode.trim(),
  latitude: 1,
  longitude: 1,
  mode: "PICKUP",
  districtId: "1",
  products: [],
});

module.exports = resetBody;
