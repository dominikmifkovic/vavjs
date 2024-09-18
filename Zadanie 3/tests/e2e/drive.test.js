//Dominik Mifkovic
const axios = require('axios');
const assert = require('assert');
describe('End-to-End Test - Add Drive',() => {
  it('should add a new drive', async () => {
    setTimeout(async function () {
    e2eid = sessionStorage.getItem("e2eID");
    if(!e2eid){
      e2eid = 2;
    }
    const response = await axios.post('http://web:8080/drives/add', {
      distance: 0,
      duration: 0,
      fuelConsumption: 1,
      creationDate: '2023-01-01',
      userID: e2eid,
      typeID: 'End to end test added drive',
    });

    assert.strictEqual(response.status, 200);
  }, 2000);
  });
});
