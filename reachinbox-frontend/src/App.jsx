import React, { useEffect, useState } from "react";

function App() {
  const [emails, setEmails] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  
  useEffect(() => {
    fetchEmails();
  }, []);

  async function fetchEmails() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/emails");
      if (!res.ok) throw new Error("Failed to fetch emails");
      const data = await res.json();
      setEmails(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchEmails();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setEmails(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>ReachInbox Email Onebox</h1>

      <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: 8, width: 300, marginRight: 10 }}
        />
        <button type="submit" style={{ padding: "8px 16px" }}>
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            fetchEmails();
          }}
          style={{ marginLeft: 10, padding: "8px 16px" }}
        >
          Reset
        </button>
      </form>

      {loading && <p>Loading emails...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!loading && !error && emails.length === 0 && <p>No emails found.</p>}

      {!loading && !error && emails.length > 0 && (
        <table
  style={{
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  }}
>
  <thead>
    <tr>
      <th style={{ borderBottom: "2px solid #ddd", padding: "8px" }}>
        Subject
      </th>
      <th style={{ borderBottom: "2px solid #ddd", padding: "8px" }}>
        Body
      </th>
      <th style={{ borderBottom: "2px solid #ddd", padding: "8px" }}>
        From
      </th>
      <th style={{ borderBottom: "2px solid #ddd", padding: "8px" }}>
        Date
      </th>
      <th style={{ borderBottom: "2px solid #ddd", padding: "8px" }}>
        Category
      </th>
    </tr>
  </thead>
  <tbody>
    {emails.map((email, idx) => {
      let categoryColor = "black";
      if (email.category === "Interested") categoryColor = "green";
      else if (email.category === "Spam") categoryColor = "red";
      else if (email.category === "Important") categoryColor = "blue";
      else if (email.category === "Uncategorized") categoryColor = "gray";

      return (
        <tr
          key={idx}
          style={{
            backgroundColor: idx % 2 === 0 ? "#f9f9f9" : "white",
          }}
        >
          <td style={{ padding: "8px", fontWeight: "bold", color: "#333" }}>
            {email.subject || "(No Subject)"}
          </td>
          <td style={{ padding: "8px", color: "#555" }}>
            {email.body ? email.body.slice(0, 100) + "..." : "(No Body)"}
          </td>
          <td style={{ padding: "8px", color: "#444" }}>
            {email.from || "Unknown"}
          </td>
          <td style={{ padding: "8px", color: "#666" }}>
            {new Date(email.date).toLocaleString()}
          </td>
          <td
            style={{
              padding: "8px",
              fontWeight: "bold",
              color: categoryColor,
            }}
          >
            {email.category || "Uncategorized"}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>

      )}
    </div>
  );
}

export default App;
