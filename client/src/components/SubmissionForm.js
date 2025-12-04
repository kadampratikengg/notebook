import React, { useState, useEffect } from "react";
import axios from "axios";
import "./SubmissionForm.css";

const SubmissionForm = () => {
  // Accurate IST Time
  const getISTDateTime = () => {
    const now = new Date();
    const istString = now.toLocaleString("en-GB", { timeZone: "Asia/Kolkata" });
    const [datePart, timePart] = istString.split(", ");
    const [day, month, year] = datePart.split("/");
    const [hours, minutes] = timePart.split(":");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const API = process.env.REACT_APP_API_URL;

  const [form, setForm] = useState({
    name: "",
    date: getISTDateTime(),
    location: "",
    amount: "",
    paymentMode: "Online",
    description: "",
  });

  const [submissions, setSubmissions] = useState([]);

  // eslint-disable-next-line no-unused-vars
  const [popup, setPopup] = useState(false);

  const [summary, setSummary] = useState({});

  const names = [
    "Siddhesh Bhau",
    "Omkar Tatya",
    "Saurabh Dada",
    "Soham Baba",
    "Vaibhav Appa",
    "Dhanashri Tai",
    "Shivani Didi"
  ];

  const paymentModes = ["Online", "Cash"];

  // GPS + Fetch Submissions
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setForm((prev) => ({
          ...prev,
          location: `${pos.coords.latitude}, ${pos.coords.longitude}`,
        }));
      });
    }

    fetchSubmissions();
  }, []);

  // Fetch backend data
  const fetchSubmissions = async () => {
    try {
      const res = await axios.get(`${API}/submissions`);
      setSubmissions(res.data);
      calculateSummary(res.data);
    } catch (err) {
      console.error("Error fetching submissions", err);
    }
  };

  // Auto calculate summary
  const calculateSummary = (data) => {
    const totals = {};
    data.forEach((item) => {
      if (!totals[item.name]) totals[item.name] = 0;
      totals[item.name] += Number(item.amount);
    });
    setSummary(totals);
  };

  // Handle input fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/submit`, form);

      setPopup(true);
      setTimeout(() => setPopup(false), 2500);

      setForm({
        name: "",
        date: getISTDateTime(),
        location: form.location,
        amount: "",
        paymentMode: "Online",
        description: "",
      });

      fetchSubmissions();
    } catch (err) {
      alert("Error submitting form");
    }
  };

  // Excel download
  const handleDownload = () => {
    window.open(`${API}/download`, "_blank");
  };

  return (
    <div className="app-wrap">
      {popup && <div className="popup">Form Submitted Successfully ✅</div>}

      <div className="card">
        <h2 className="h1">Submission Form</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>Name</label>
            <select name="name" value={form.name} onChange={handleChange} required>
              <option value="">Select name</option>
              {names.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Date & Time (IST)</label>
            <input
              type="datetime-local"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field full">
            <label>Location (auto-detected)</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              required
            />
            <div className="small mt-8">If GPS blocked, enter manually.</div>
          </div>

          <div className="row">
            <div className="field">
              <label>Amount</label>
              <input
                type="number"
                name="amount"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label>Payment Mode</label>
              <select
                name="paymentMode"
                value={form.paymentMode}
                onChange={handleChange}
                required
              >
                {paymentModes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field full">
            <label>Description</label>
            <textarea
              name="description"
              rows="2"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className="field full" style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn btn-primary">Submit</button>
            <button type="button" onClick={handleDownload} className="btn btn-ghost">
              Download Excel
            </button>
          </div>

        </form>
      </div>

      {/* SUMMARY TABLE */}
      <div className="card">
        <h3 className="h1">Name-wise Total Amount</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(summary).map((name) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{summary[name].toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: "bold", background: "#f5f5f5" }}>
                <td>Total</td>
                <td>
                  {Object.values(summary)
                    .reduce((acc, val) => acc + val, 0)
                    .toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SUBMISSIONS TABLE */}
      <div className="card">
        <h3 className="h1">Submissions</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Amount</th>
                <th>Payment Mode</th>
                <th>Description</th>
                <th>WhatsApp</th>
              </tr>
            </thead>

            <tbody>
              {submissions.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>{new Date(s.date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                  <td>{s.location}</td>
                  <td>{s.amount}</td>
                  <td>{s.paymentMode}</td>
                  <td>{s.description}</td>
                  <td>
                    <button
                      className="btn btn-whatsapp"
                      onClick={() => {
                        const message = `
Submission Details 📝

Name: ${s.name}
Amount: ₹${s.amount}
Payment Mode: ${s.paymentMode}
Date & Time: ${new Date(s.date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Location: ${s.location}
Description: ${s.description || "N/A"}
                        `;
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(message)}`,
                          "_blank"
                        );
                      }}
                    >
                      WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
};

export default SubmissionForm;
