import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SubmissionForm.css';

/* global L */ // FIX: allow Leaflet global variable

const SubmissionForm = () => {
  // GET ACCURATE IST TIME
  const getISTDateTime = () => {
    const now = new Date();
    const istOffset = 330;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utc + istOffset * 60000);

    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    const hours = String(istDate.getHours()).padStart(2, '0');
    const minutes = String(istDate.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // INPUT HANDLER
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle split UI
  const toggleSplit = () => {
    setSplitEnabled((s) => !s);
    setSplitDropdownOpen(true);
  };

  // Toggle a name in the split selection
  const toggleSelectName = (n) => {
    setSplitSelected((prev) => ({ ...prev, [n]: !prev[n] }));
  };

  const API = process.env.REACT_APP_API_URL;

  const [form, setForm] = useState({
    name: '',
    date: getISTDateTime(),
    location: '',
    amount: '',
    paymentMode: 'Online',
    description: '',
  });

  const [submissions, setSubmissions] = useState([]);
  const [popup, setPopup] = useState(false);
  const [summary, setSummary] = useState({});
  const [settlements, setSettlements] = useState([]);
  const [paidTotalsState, setPaidTotalsState] = useState({});
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false);
  const [expandedSplitRows, setExpandedSplitRows] = useState({});
  // list of participant names (used by splitSelected initializer)
  const names = [
    'Siddhesh',
    'Omkar',
    'Saurabh',
    'Soham',
    'Vaibhav',
    'Dhanashri',
    'Shivani',
  ];

  const [splitSelected, setSplitSelected] = useState(() => {
    const map = {};
    // default all selected
    names.forEach((n) => (map[n] = true));
    return map;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const paymentModes = ['Online', 'Cash'];

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
      console.error('Error fetching submissions', err);
    }
  };

  // AUTO CALCULATE SUMMARY
  const calculateSummary = (data) => {
    // paidTotals: how much each person actually paid
    // consumedTotals: how much each person should bear
    const paidTotals = {};
    const consumedTotals = {};
    names.forEach((n) => {
      paidTotals[n] = 0;
      consumedTotals[n] = 0;
    });

    data.forEach((item) => {
      const payer = item.name;
      const amount = Number(item.amount) || 0;
      if (paidTotals[payer] == null) paidTotals[payer] = 0;
      paidTotals[payer] += amount;

      if (
        item.splitWith &&
        Array.isArray(item.splitWith) &&
        item.splitWith.length > 0
      ) {
        const share =
          item.splitShare != null
            ? Number(item.splitShare)
            : +(amount / item.splitWith.length).toFixed(2);
        item.splitWith.forEach((p) => {
          if (consumedTotals[p] == null) consumedTotals[p] = 0;
          consumedTotals[p] += Number(share);
        });
      } else {
        if (consumedTotals[payer] == null) consumedTotals[payer] = 0;
        consumedTotals[payer] += amount;
      }
    });

    // show consumed totals in Name-wise table
    setSummary(consumedTotals);
    // also expose paid totals so the UI can show Paid vs Share
    setPaidTotalsState(paidTotals);

    // compute nets and suggested transfers
    const netsArr = names.map((n) => ({
      name: n,
      net: +((paidTotals[n] || 0) - (consumedTotals[n] || 0)).toFixed(2),
    }));
    const creditors = netsArr.filter((x) => x.net > 0).map((x) => ({ ...x }));
    const debtors = netsArr.filter((x) => x.net < 0).map((x) => ({ ...x }));
    creditors.sort((a, b) => b.net - a.net);
    debtors.sort((a, b) => a.net - b.net);

    const tx = [];
    let i = 0,
      j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const payAmount = Math.min(Math.abs(debtor.net), creditor.net);
      if (payAmount > 0.009)
        tx.push({
          from: debtor.name,
          to: creditor.name,
          amount: +payAmount.toFixed(2),
        });
      debtor.net += payAmount;
      creditor.net -= payAmount;
      if (Math.abs(debtor.net) < 0.01) i++;
      if (creditor.net < 0.01) j++;
    }

    const totalPaid = Object.values(paidTotals).reduce((s, v) => s + v, 0);
    const avg = totalPaid / names.length;
    setSettlements({
      total: +totalPaid.toFixed(2),
      avg: +avg.toFixed(2),
      nets: netsArr,
      tx,
    });
  };

  const selectedCount =
    Object.values(splitSelected).filter(Boolean).length || 0;
  const amountNumber = Number(form.amount) || 0;
  const perShare =
    selectedCount > 0 ? +(amountNumber / selectedCount).toFixed(2) : 0;

  // SUBMIT FORM
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // include split metadata in payload (frontend-only helper fields)
      const payload = { ...form };
      if (splitEnabled) {
        payload.splitWith = Object.keys(splitSelected).filter(
          (k) => splitSelected[k]
        );
        payload.splitCount = selectedCount;
        payload.splitShare = perShare;
      }

      await axios.post(`${API}/submit`, payload);

      setPopup(true);
      setTimeout(() => setPopup(false), 3000);

      setForm({
        name: '',
        date: getISTDateTime(),
        location: form.location,
        amount: '',
        paymentMode: 'Online',
        description: '',
      });

      fetchSubmissions();
    } catch (err) {
      alert('Error submitting form');
    }

    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  };

  // DOWNLOAD EXCEL
  const handleDownload = () => {
    window.open(`${API}/download`, '_blank');
  };

  // ===========================
  // LOAD MAP AFTER TABLE
  // ===========================
  useEffect(() => {
    if (submissions.length === 0) return;

    const last = submissions[submissions.length - 1];
    if (!last.location) return;

    const [lat, lng] = last.location.split(',').map(Number);

    // FIX: Clear previous map instance
    const container = L.DomUtil.get('map');
    if (container != null) {
      container._leaflet_id = null;
    }

    // Create map
    const map = L.map('map').setView([lat, lng], 15);

    // FREE OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Marker
    L.marker([lat, lng])
      .addTo(map)
      .bindPopup('Last Recorded Location 📍')
      .openPopup();
  }, [submissions]);

  return (
    <div className='app-wrap'>
      {popup && <div className='popup'>Form Submitted Successfully ✅</div>}

      {/* FORM CARD */}
      <div className='card'>
        <h2 className='h1'>Payment Receipt</h2>

        <form onSubmit={handleSubmit} className='form-grid'>
          <div className='field'>
            <label>Name</label>
            <select
              name='name'
              value={form.name}
              onChange={handleChange}
              required
            >
              <option value=''>Select name</option>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className='field'>
            <label>Date & Time (IST)</label>
            <input
              type='datetime-local'
              name='date'
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          {/* SPLIT AMOUNT CONTROLS */}
          <div className='field' style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type='checkbox'
                checked={splitEnabled}
                onChange={toggleSplit}
              />
              Split amount among selected
            </label>

            {splitEnabled && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    position: 'relative',
                    display: 'block',
                    width: '100%',
                  }}
                >
                  <button
                    type='button'
                    className='btn btn-ghost'
                    onClick={() => setSplitDropdownOpen((s) => !s)}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    Split with ({selectedCount}) ▾
                  </button>

                  {splitDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        zIndex: 30,
                        background: 'white',
                        border: '1px solid #ddd',
                        padding: 8,
                        marginTop: 6,
                        borderRadius: 6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        width: '100%',
                        top: '100%',
                        left: 0,
                      }}
                    >
                      {names.map((n) => (
                        <label
                          key={n}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <input
                            type='checkbox'
                            checked={!!splitSelected[n]}
                            onChange={() => toggleSelectName(n)}
                          />
                          {n}
                        </label>
                      ))}
                      <div style={{ marginTop: 8 }}>
                        <button
                          type='button'
                          className='btn'
                          onClick={() => setSplitDropdownOpen(false)}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className='small mt-8'>
                  Per-person share: ₹{perShare} (split across {selectedCount}{' '}
                  people)
                </div>
              </div>
            )}
          </div>

          <div className='field full'>
            <label>Location (auto-detected)</label>
            <input
              type='text'
              name='location'
              value={form.location}
              onChange={handleChange}
              required
            />
            <div className='small mt-8'>If GPS blocked, enter manually.</div>
          </div>

          <div className='row'>
            <div className='field'>
              <label>Amount</label>
              <input
                type='number'
                name='amount'
                min='0'
                step='0.01'
                value={form.amount}
                onChange={handleChange}
                required
              />
            </div>

            <div className='field'>
              <label>Payment Mode</label>
              <select
                name='paymentMode'
                value={form.paymentMode}
                onChange={handleChange}
                required
              >
                {paymentModes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='field full'>
            <label>Purpose</label>
            <textarea
              name='description'
              rows='2'
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className='field full' style={{ display: 'flex', gap: 10 }}>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>

            <button
              type='button'
              onClick={handleDownload}
              className='btn btn-ghost'
            >
              Download Excel
            </button>
          </div>
        </form>
      </div>

      {/* SUMMARY TABLE */}
      {/* Combined Name-wise Totals & Settlement Summary */}
      <div className='card'>
        <h3 className='h1'>Name-wise Totals & Settlements</h3>
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Paid By</th>
                <th>Share</th>
                <th>Net (Paid - Share)</th>
              </tr>
            </thead>
            <tbody>
              {names.map((name) => {
                const paid = paidTotalsState[name] || 0;
                const share = summary[name] || 0;
                const net = +(paid - share).toFixed(2);
                return (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>₹{paid.toFixed(2)}</td>
                    <td>₹{share.toFixed(2)}</td>
                    <td style={{ color: net >= 0 ? 'green' : 'red' }}>
                      {net >= 0
                        ? `+₹${net.toFixed(2)}`
                        : `-₹${Math.abs(net).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
                <td>Total</td>
                <td>
                  ₹
                  {Object.values(paidTotalsState)
                    .reduce((a, b) => a + (b || 0), 0)
                    .toFixed(2)}
                </td>
                <td>
                  ₹
                  {Object.values(summary)
                    .reduce((a, b) => a + (b || 0), 0)
                    .toFixed(2)}
                </td>
                <td>
                  ₹
                  {Object.values(paidTotalsState)
                    .reduce((a, b) => a + (b || 0), 0)
                    .toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SUBMISSIONS TABLE */}
      <div className='card'>
        <h3 className='h1'>Payments</h3>
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Amount</th>
                <th>Split Amount</th>
                <th>Payment Mode</th>
                <th>Split With</th>
                <th>Purpose</th>
                <th>WhatsApp</th>
              </tr>
            </thead>

            <tbody>
              {submissions.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>
                    {new Date(s.date).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}
                  </td>
                  <td>{s.location}</td>
                  <td>₹{s.amount}</td>
                  <td>
                    {s.splitShare
                      ? `₹${s.splitShare.toFixed(2)}`
                      : `₹${s.amount}`}
                  </td>
                  <td>{s.paymentMode}</td>
                  <td>
                    {s.splitWith && s.splitWith.length > 0 ? (
                      <div
                        style={{
                          position: 'relative',
                          display: 'inline-block',
                        }}
                      >
                        <button
                          type='button'
                          className='btn btn-ghost'
                          onClick={() =>
                            setExpandedSplitRows((prev) => ({
                              ...prev,
                              [s._id]: !prev[s._id],
                            }))
                          }
                          style={{ padding: '4px 8px', fontSize: '0.9em' }}
                        >
                          {s.splitWith.length} people{' '}
                          {expandedSplitRows[s._id] ? '▲' : '▼'}
                        </button>
                        {expandedSplitRows[s._id] && (
                          <div
                            style={{
                              position: 'absolute',
                              zIndex: 10,
                              background: 'white',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              padding: '8px',
                              minWidth: '150px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              top: '100%',
                              left: 0,
                              marginTop: '4px',
                            }}
                          >
                            {s.splitWith.map((name) => (
                              <div
                                key={name}
                                style={{ padding: '4px 0', fontSize: '0.9em' }}
                              >
                                {name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>{s.name}</span>
                    )}
                  </td>
                  <td>{s.description}</td>
                  <td>
                    <button
                      className='btn btn-whatsapp'
                      onClick={() => {
                        const message = `
Submission Details 📝

Name: ${s.name}
Amount: ₹${s.amount}
Payment Mode: ${s.paymentMode}
Date: ${new Date(s.date).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                        })}
Location: ${s.location}
Description: ${s.description || 'N/A'}
                        `;
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(message)}`,
                          '_blank'
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
      <div className='card' style={{ marginTop: '20px' }}>
        <h3 className='h1'>Last Location Map</h3>
        <div
          id='map'
          style={{
            width: '100%',
            height: '350px',
            borderRadius: '10px',
            marginTop: '10px',
          }}
        ></div>
      </div>
      <h4 className='h1' style={{ marginTop: 12 }}>
        Final Settlement
      </h4>
      <div className='table-wrap'>
        <table>
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {settlements && settlements.tx && settlements.tx.length > 0 ? (
              settlements.tx.map((t, idx) => (
                <tr key={idx}>
                  <td>{t.from}</td>
                  <td>{t.to}</td>
                  <td>₹{t.amount.toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>All settled — no transfers required.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubmissionForm;
