require("dotenv").config();
const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");
const { Client } = require("@elastic/elasticsearch");


const esClient = new Client({ node: process.env.ELASTICSEARCH_NODE });

const config = {
  imap: {
    user: process.env.GMAIL_USER,
    password: process.env.GMAIL_APP_PASSWORD,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    authTimeout: 3000,
    tlsOptions: { rejectUnauthorized: false }
  }
};

async function readEmails() {
  try {
    const connection = await imaps.connect({ imap: config.imap });
    await connection.openBox("INBOX");

   
   const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const searchCriteria = [['SINCE', thirtyDaysAgo.toISOString().slice(0, 10)]];

    const fetchOptions = {
      bodies: [""],
      markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const item of messages) {
  const all = item.parts.find(part => part.which === "");
  const parsed = await simpleParser(all.body);

  const emailData = {
    from: parsed.from?.text,
    to: parsed.to?.text,
    subject: parsed.subject,
    date: parsed.date,
    text: parsed.text,
    html: parsed.html
  };


  await new Promise(resolve => setTimeout(resolve, 2000));


  const category = await categorizeEmail(parsed.subject, parsed.text);
  emailData.category = category;

 
  await esClient.index({
    index: "emails",
    body: emailData
  });

  console.log(` Indexed: "${emailData.subject}" → Category: ${category}`);
}


    connection.end();
  } catch (err) {
    console.error(" Error:", err.message);
  }
}

readEmails();

const axios = require("axios");

async function categorizeEmail(subject, body) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",  
        messages: [
          {
            role: "system",
            content:
              "You are an AI model that categorizes emails. Categorize into one of these: Interested, Meeting Booked, Not Interested, Spam, Out of Office.",
          },
          {
            role: "user",
            content: `Subject: ${subject}\n\nBody: ${body}`,
          },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://localhost", 
          "X-Title": "ReachInbox Categorizer",
        },
      }
    );

    const aiReply = response.data.choices[0].message.content.trim();
    return aiReply;
  } catch (err) {
    console.error("AI Categorization error:", err.message);
    return "Uncategorized";
  }
}


module.exports = {
  readEmails,
  categorizeEmail
};


