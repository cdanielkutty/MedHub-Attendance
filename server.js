const express = require('express');
const app     = express();

// ────────────────────────────────────────────────
// Middleware
// ────────────────────────────────────────────────

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ────────────────────────────────────────────────
// Proxy endpoint → MedHub
// ────────────────────────────────────────────────

app.post('/proxy-to-medhub', async (req, res) => {
  try {
    // Forward the form data exactly as received
    const mhResponse = await fetch(
      'https://northwell.medhub.com/functions/apps/codereadr/index.mh',
      {
        method:  'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent'  : 'Scan Postback',
          'Accept'      : 'application/json, text/plain, */*'
        },
        body: new URLSearchParams(req.body).toString()
      }
    );

    const text = await mhResponse.text();
    res.status(mhResponse.status).send(text);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({
      error:   'Proxy error',
      message: err.message
    });
  }
});

// ────────────────────────────────────────────────
// Listen
// ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MedHub Attendance proxy listening on port ${PORT}`);
});
