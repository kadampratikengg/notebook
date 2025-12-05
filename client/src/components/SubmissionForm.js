import React, { useState, useEffect } from "react";
import axios from "axios";
import "./SubmissionForm.css";

/* global L */ // FIX: allow Leaflet global variable

const SubmissionForm = () => {
  // GET ACCURATE IST TIME
  const getISTDateTime = () => {
    const now = new Date();
    const istOffset = 330;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utc + istOffset * 60000);

    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, "0");
    const day = String(istDate.getDate()).padStart(2, "0");
    const hours = String(istDate.getHours()).padStart(2, "0");
    const minutes = String(istDate.getMinutes()).padStart(2, "0");

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
  const [popup, setPopup] = useState(false);
  const [summary, setSummary] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const names = ["Siddhesh", "Omkar", "Saurabh", "Soham", "Vaibhav", "Dhanashri", "Shivani"];
  const paymentModes = ["Online", "Cash"];

  // FETCH GPS + SUBMISSIONS
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
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

  // FETCH FROM BACKEND
  const fetchSubmissions = async () => {
    try {
      const res = await axios.get(`${API}/submissions`);
      setSubmissions(res.data);
      calculateSummary(res.data);
    } catch (err) {
      console.error("Error fetching submissions", err);
    }
  };

  // AUTO CALCULATE SUMMARY
  const calculateSummary = (data) => {
    const totals = {};
    data.forEach((item) => {
      if (!totals[item.name]) totals[item.name] = 0;
      totals[item.name] += Number(item.amount);
    });
    setSummary(totals);
  };

  // INPUT HANDLER
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // SUBMIT FORM
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await axios.post(`${API}/submit`, form);

      setPopup(true);
      setTimeout(() => setPopup(false), 3000);

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

    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  };

  // DOWNLOAD EXCEL
  const handleDownload = () => {
    window.open(`${API}/download`, "_blank");
  };

  // ===========================
  // LOAD MAP AFTER TABLE
  // ===========================
  useEffect(() => {
    if (submissions.length === 0) return;

    const last = submissions[submissions.length - 1];
    if (!last.location) return;

    const [lat, lng] = last.location.split(",").map(Number);

    // FIX: Clear previous map instance
    const container = L.DomUtil.get("map");
    if (container != null) {
      container._leaflet_id = null;
    }

    // Create map
    const map = L.map("map").setView([lat, lng], 15);

    // FREE OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Marker
    L.marker([lat, lng]).addTo(map)
      .bindPopup("Last Recorded Location 📍")
      .openPopup();

  }, [submissions]);

  return (
    <div className="app-wrap">
      {popup && <div className="popup">Form Submitted Successfully ✅</div>}

      {/* FORM CARD */}
      <div className="card">
        <h2 className="h1">Payment Receipt</h2>

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
            <label>Purpose</label>
            <textarea
              name="description"
              rows="2"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className="field full" style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>

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
              <tr><th>Name</th><th>Total Amount</th></tr>
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
                  {Object.values(summary).reduce((a, b) => a + b, 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SUBMISSIONS TABLE */}
      <div className="card">
        <h3 className="h1">Payments</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Amount</th>
                <th>Payment Mode</th>
                <th>Purpose</th>
                <th>WhatsApp</th>
              </tr>
            </thead>

            <tbody>
              {submissions.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>
                    {new Date(s.date).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </td>
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
Date: ${new Date(s.date).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}
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

      {/* MAP SECTION */}
      <div className="card" style={{ marginTop: "20px" }}>
        <h3 className="h1">Last Location Map</h3>
        <div
          id="map"
          style={{
            width: "100%",
            height: "350px",
            borderRadius: "10px",
            marginTop: "10px",
          }}
        ></div>
      </div>
    </div>
  );
};

export default SubmissionForm;
