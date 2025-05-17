const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// 🟢 Test route for basic health check
app.get('/', (req, res) => {
  res.send('✅ Estimate backend is live.');
});

// 🔹 Get available services from QuickBooks Online
app.get('/services', async (req, res) => {
  try {
    const response = await axios.get(
      `https://quickbooks.api.intuit.com/v3/company/${process.env.REALM_ID}/query?query=select * from Item where Type='Service'`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          'Content-Type': 'application/text',
          Accept: 'application/json'
        }
      }
    );

    const items = response.data.QueryResponse.Item || [];
    const services = items.map(item => ({
      id: item.Id,
      name: item.Name
    }));

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error.response?.data || error.message);
    res.status(500).json({ error: 'Unable to fetch services from QuickBooks' });
  }
});

// 🔹 Create a customer + estimate in QuickBooks Online
app.post('/create-estimate', async (req, res) => {
  const { name, email, serviceId, amount, description } = req.body;

  try {
    // Step 1: Create the customer (or QBO will deduplicate based on DisplayName)
    const customerResp = await axios.post(
      `https://quickbooks.api.intuit.com/v3/company/${process.env.REALM_ID}/customer`,
      {
        DisplayName: name,
        PrimaryEmailAddr: { Address: email }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    const customerId = customerResp.data.Customer.Id;

    // Step 2: Create the estimate
    const estimateResp = await axios.post(
      `https://quickbooks.api.intuit.com/v3/company/${process.env.REALM_ID}/estimate`,
      {
        CustomerRef: { value: customerId },
        Line: [
          {
            Amount: amount,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: serviceId },
              Qty: 1
            },
            Description: description
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      estimateId: estimateResp.data.Estimate.Id
    });
  } catch (error) {
    console.error('Error creating estimate:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create estimate in QuickBooks' });
  }
});

// 🔄 Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
