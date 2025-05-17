const express = require('express');
const axios = require('axios');
require('dotenv').config();
const app = express();
app.use(express.json());

app.post('/create-estimate', async (req, res) => {
  const { name, email, serviceId, amount, description } = req.body;
  try {
    // 1. Create or find the customer
    const custResp = await axios.post(
      `https://quickbooks.api.intuit.com/v3/company/${process.env.REALM_ID}/customer`,
      { DisplayName: name, PrimaryEmailAddr: { Address: email } },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
    const customerId = custResp.data.Customer.Id;

    // 2. Create the estimate
    const estResp = await axios.post(
      `https://quickbooks.api.intuit.com/v3/company/${process.env.REALM_ID}/estimate`,
      {
        CustomerRef: { value: customerId },
        Line: [{
          Amount: amount,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: { ItemRef: { value: serviceId }, Qty: 1 },
          Description: description
        }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );
    res.json({ success: true, estimateId: estResp.data.Estimate.Id });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Estimate creation failed' });
  }
});

// Simple health check
app.get('/', (req, res) => res.send('Estimate backend online'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
app.get('/services', async (req, res) => {
  try {
    const itemResp = await axios.get(
      `https://quickbooks.api.intuit.com/v3/company/${process.env.REALM_ID}/query?query=select * from Item where Type='Service'`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          'Content-Type': 'application/text',
          Accept: 'application/json'
        }
      }
    );

    const services = itemResp.data.QueryResponse.Item.map(item => ({
      id: item.Id,
      name: item.Name
    }));

    res.json(services);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch services' });
  }
});

