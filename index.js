const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// 🔹 Basic health check
app.get('/services', async (req, res) => {
  try {
    const url = `https://quickbooks.api.intuit.com/v3/company/${process.env.REALM_ID}/query?query=select%20*%20from%20Item%20where%20Type%3D%27Service%27&minorversion=65`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/text'
      }
    });

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

// 🔹 Create estimate from form submission
app.post('/create-estimate', async (req, res) => {
  const { name, email, serviceId, amount, description } = req.body;

  try {
    // Step 1: Create customer (QBO dedupes by DisplayName)
    const customerResp = await axios.post(
      `https://quickbooks.api.intuit.com/v3/company/${process.env.REALM_ID}/customer?minorversion=65`,
      {
        DisplayName: name,
        PrimaryEmailAddr: { Address: email }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    const customerId = customerResp.data.Customer.Id;

    // Step 2: Create estimate
    const estimateResp = await axios.post(
      `https://quickbooks.api.intuit.com/v3/company/${process.env.REALM_ID}/estimate?minorversion=65`,
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
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      estimateId: estimateResp.data.Estimate.Id
    });
  } catch (error) {
    console.error('Error fetching services:', JSON.stringify(
  error.response && error.response.data ? error.response.data : error.message,
  null,
  2
));

// 🔄 Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
