require('dotenv').config();
const express = require('express');
const { readEmails, categorizeEmail } = require('./imapClient');
const axios = require("axios");

const { Client } = require('@elastic/elasticsearch');
const path = require('path');
const app = express();

// Serve static files like emails.html
app.use(express.static('public'));

// Connect to Elasticsearch
const client = new Client({ node: 'http://localhost:9200' });





const port = process.env.PORT || 3000;

// Elasticsearch client
const esClient = new Client({ node: 'http://localhost:9200' }); // or your ES URL

// Search endpoint (multi-field)


// url for get operation : http://localhost:3000/search?q=invoice



app.get('/search', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const result = await esClient.search({
      index: 'emails', // your actual index name
      body: {
        query: {
          multi_match: {
            query: query,
            fields: ['subject', 'from', 'text', 'html']
          }
        }
      }
    });

    const hits = result.hits.hits.map(hit => hit._source);
    res.json(hits);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});


// 🔍 New endpoint: search by exact sender email
// app.get('/search/from', async (req, res) => {
//   const senderEmail = req.query.email;

//   if (!senderEmail) {
//     return res.status(400).json({ error: 'Query parameter "email" is required' });
//   }

//   try {
//     const result = await esClient.search({
//       index: 'emails',
//       body: {
//         query: {
//           match: {
//             from: senderEmail
//           }
//         }
//       }
//     });

//     const hits = result.hits.hits.map(hit => hit._source);
//     res.json(hits);
//   } catch (err) {
//     console.error('Search by email error:', err.message);
//     res.status(500).json({ error: 'Search by email failed' });
//   }
// });

// Search by sender email
// url for specific search : http://localhost:3000/search?q=apple

app.get('/search/from', async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ error: 'Query parameter "email" is required' });
  }

  try {
   const result = await client.search({
  index: 'emails', // ✅ match the index name
  query: { match_all: {} }
});


    const hits = result.hits.hits.map(hit => hit._source);
    res.json(hits);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'emails.html'));
});

app.get('/emails', async (req, res) => {
  try {
    const response = await esClient.search({
      index: 'emails',
      size: 100, // adjust as needed
      query: {
        match_all: {}
      }
    });

    const hits = response.hits.hits.map(hit => ({
      subject: hit._source.subject,
      from: hit._source.from,
      to: hit._source.to,
      date: hit._source.date,
      category: hit._source.category
    }));

    res.json(hits);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});
  




app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});










// Process and index emails
(async () => {
  const fetchedEmails = await readEmails();

  for (const email of fetchedEmails) {
    const subject = email.subject || '';
    const body = email.text || email.html || '';
    const from = email.from?.text || 'Unknown Sender';
    const date = email.date || new Date().toISOString();

    const category = await categorizeEmail(subject, body);
    email.category = category;

    const emailData = {
      subject,
      body,
      from,
      date,
      category
    };

    await esClient.index({
      index: 'emails',
      body: emailData,
    });

    console.log(`✅ Indexed: "${subject}" → Category: ${category}`);

    if (category.toLowerCase().includes('interested')) {
      await sendSlackNotification(emailData);
      await sendWebhookNotification(emailData);
    }

    await new Promise(resolve => setTimeout(resolve, 1200)); // Wait 1.2 seconds between requests
  }
})();

// const axios = require("axios");

async function sendSlackNotification(emailData) {
  const slackMessage = {
    text: `📩 *New Interested Email*\n*Subject:* ${emailData.subject}\n*From:* ${emailData.from}\n*Date:* ${emailData.date}`
  };

  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);
    console.log("🔔 Slack notification sent.");
  } catch (err) {
    console.error("❌ Slack notification failed:", err.message);
  }
}

async function sendWebhookNotification(email) {
  try {
    await axios.post(process.env.TEST_WEBHOOK_URL, {
      subject: email.subject,
      body: email.body,
      from: email.from,
      category: email.category,
      date: email.date
    });
    console.log('🌐 Webhook triggered for Interested email');
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
}





