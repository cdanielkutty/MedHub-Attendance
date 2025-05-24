const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Serve the HTML page (adjust path if needed)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Proxy endpoint for MedHub
app.post('/proxy-to-medhub', async (req, res) => {
  try {
    console.log('Proxying request to MedHub:', req.body);

    const response = await axios({
      method: 'post',
      url: 'https://northwell.medhub.com/functions/apps/codereadr/index.mh',
      data: req.body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Scan Postback',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    console.log('MedHub response status:', response.status);
    console.log('MedHub response data:', response.data);

    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Error forwarding to MedHub:', error.message);
    res.status(error.response?.status || 500).send({
      error: 'Proxy error',
      message: error.message,
      response: error.response ? error.response.data : null
    });
  }
});

// Listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Your app is listening on port ${PORT}`);
});
