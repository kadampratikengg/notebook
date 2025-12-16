import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '../api/api';
import './SubmissionForm.css';

const SubmissionForm = () => {
  // Helper: return a datetime-local string for the current local time
  const getLocalDateTime = () => {
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000; // offset in ms
    return new Date(d - tzoffset).toISOString().slice(0, 16);
  };

  // Helper: format a date into IST in the form "10 Dec 2025, 03:30 PM"
  const formatToIST = (dateInput) => {
    const d = new Date(dateInput);
    const parts = d.toLocaleString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Normalize spacing and commas to ensure stable format
    return parts.replace(/\s+/g, ' ').replace(' ,', ',').trim();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSplit = () => {
    setSplitEnabled((s) => !s);
    setSplitDropdownOpen(true);
  };

  const toggleSelectName = (n) => {
    setSplitSelected((prev) => ({ ...prev, [n]: !prev[n] }));
  };

  // Ensure API base always points to the backend API prefix (/api). If
  // REACT_APP_API_URL is set but doesn't include /api, append it.
  const _envApi = (process.env.REACT_APP_API_URL || '').replace(/\/+$/g, '');
  let API = '/api';
  if (_envApi) {
    API = _envApi.endsWith('/api') ? _envApi : `${_envApi}/api`;
  }

  const [form, setForm] = useState({
    name: '',
    // initial value for the datetime-local input (local)
    date: getLocalDateTime(),
    location: '',
    amount: '',
    paymentMode: 'Online',
    description: '',
  });

  const [submissions, setSubmissions] = useState([]);
  const [popup, setPopup] = useState(false);
  const [summary, setSummary] = useState({});
  const [settlements, setSettlements] = useState({
    total: 0,
    avg: 0,
    nets: [],
    tx: [],
  });
  const [paidTotalsState, setPaidTotalsState] = useState({});
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false);
  const [expandedSplitRows, setExpandedSplitRows] = useState({});
  const [names, setNames] = useState([]);
  const [trip, setTrip] = useState(null);
  const [splitSelected, setSplitSelected] = useState({});
  const [mapAvailable, setMapAvailable] = useState(true);
  const [meUser, setMeUser] = useState(null);
  const [canSubmit, setCanSubmit] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    date: '',
    location: '',
  });
  const WA_BASE = process.env.REACT_APP_WA_BASE || 'https://wa.me/?text=';
  const params = useParams();
  const [searchParams] = useSearchParams();
  const tripIdParam = params.tripId || searchParams.get('tripId') || null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const paymentModes = ['Online', 'Cash'];

  // Fetch submissions and optionally get GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setForm((prev) => ({
          ...prev,
          location: `${pos.coords.latitude}, ${pos.coords.longitude}`,
        }));
      });
    }

    if (tripIdParam) loadTripParticipants(tripIdParam);
    fetchSubmissions();
  }, [tripIdParam]);

  async function loadTripParticipants(tid) {
    try {
      const res = await api.get(`/trips/${tid}`);
      const parts = Array.isArray(res.data.participants)
        ? res.data.participants.map((p) => p.name)
        : [];
      setNames(parts);
      setTrip(res.data);
    } catch (err) {
      console.error('Could not load trip participants', err);
    }
  }

  // initialize splitSelected when names change
  useEffect(() => {
    const map = {};
    names.forEach((n) => (map[n] = true));
    setSplitSelected(map);
    // Prefer the logged-in user's name if available in participants
    const meNameLocal = meUser?.name;
    if (meNameLocal && names.includes(meNameLocal)) {
      setForm((prev) => ({ ...prev, name: meNameLocal }));
    } else if (!form.name && names.length > 0) {
      setForm((prev) => ({ ...prev, name: names[0] }));
    }
  }, [names, meUser]);

  // Try to fetch current user (optional) to preselect name if present in trip
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/auth/me');
        if (mounted && res?.data?.user) setMeUser(res.data.user);
      } catch (e) {
        // ignore - not logged in
      }
    })();
    return () => (mounted = false);
  }, []);

  // compute whether current user can submit for this trip
  useEffect(() => {
    if (!trip || !trip._id) {
      setCanSubmit(true);
      return;
    }
    if (!meUser) {
      // if not logged in, disallow trip-scoped submissions (server enforces auth)
      setCanSubmit(false);
      return;
    }
    const isOwner = trip.owner && String(trip.owner) === String(meUser._id);
    const isParticipant = names.includes(meUser.name);
    setCanSubmit(isOwner || isParticipant);
  }, [trip, meUser, names]);

  // If user is not yet allowed to submit for this trip (waiting for owner approval),
  // poll the trip endpoint periodically so that the UI updates when the owner accepts.
  useEffect(() => {
    if (!trip || !meUser || canSubmit) return;
    let stopped = false;
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts += 1;
      try {
        const res = await api.get(`/trips/${trip._id}`);
        const updated = res.data;
        if (!updated) return;
        const parts = Array.isArray(updated.participants)
          ? updated.participants.map((p) => p.name)
          : [];
        setNames(parts);
        const meNameLocal = meUser?.name;
        const isMember =
          meNameLocal &&
          parts.some(
            (n) => n.trim().toLowerCase() === meNameLocal.trim().toLowerCase()
          );
        if (
          isMember ||
          (updated.owner && String(updated.owner) === String(meUser._id))
        ) {
          setCanSubmit(true);
          stopped = true;
          clearInterval(iv);
        }
      } catch (e) {
        // ignore transient errors
      }
      if (attempts >= 10 && !stopped) {
        clearInterval(iv);
      }
    }, 8000);
    return () => clearInterval(iv);
  }, [trip, meUser, canSubmit]);

  const fetchSubmissions = async () => {
    try {
      const query = tripIdParam ? `?tripId=${tripIdParam}` : '';
      const res = await api.get(`/submissions${query}`);
      setSubmissions(res.data);
      calculateSummary(res.data);
    } catch (err) {
      console.error('Error fetching submissions', err);
    }
  };

  const calculateSummary = (data) => {
    const paidTotals = {};
    const consumedTotals = {};
    const namesToUse = names.length
      ? names
      : Array.from(new Set(data.map((d) => d.name)));
    namesToUse.forEach((n) => {
      paidTotals[n] = 0;
      consumedTotals[n] = 0;
    });

    data.forEach((item) => {
      const payer = item.name;
      const amount = Number(item.amount) || 0;
      if (paidTotals[payer] == null) paidTotals[payer] = 0;
      paidTotals[payer] += amount;

      if (item.splitWith?.length > 0) {
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

    setSummary(consumedTotals);
    setPaidTotalsState(paidTotals);

    // Use the namesToUse (from trip participants or submissions) to compute nets
    const netsArr = namesToUse.map((n) => ({
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
    const avg = namesToUse.length > 0 ? totalPaid / namesToUse.length : 0;
    setSettlements({
      total: +totalPaid.toFixed(2),
      avg: +avg.toFixed(2),
      nets: netsArr,
      tx,
    });
  };

  // If the participants (`names`) are loaded after submissions, recalc summary
  // so final settlement uses the correct participant list (namesToUse).
  useEffect(() => {
    // Recalculate summary whenever trip participants change
    calculateSummary(submissions || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names]);

  const selectedCount =
    Object.values(splitSelected).filter(Boolean).length || 0;
  const namesForDisplay = names.length
    ? names
    : Array.from(new Set(submissions.map((s) => s.name)));
  const perShare =
    selectedCount > 0
      ? +((Number(form.amount) || 0) / selectedCount).toFixed(2)
      : 0;

  // Submit: treat datetime-local input as IST local time -> convert to UTC instant ISO
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = { ...form };

      if (form.date) {
        // form.date is "YYYY-MM-DDTHH:MM" (no timezone).
        // Treat it as IST local time and convert to the correct UTC instant:
        const [datePart, timePart] = form.date.split('T'); // ["YYYY-MM-DD", "HH:MM"]
        if (datePart && timePart) {
          const [y, m, d] = datePart.split('-').map(Number);
          const [hh, mm] = timePart.split(':').map(Number);

          // IST offset in ms
          const istOffsetMs = 5.5 * 60 * 60 * 1000; // 19800000

          // Use Date.UTC to get milliseconds for the same numeric Y/M/D/H/M as if they were UTC,
          // then subtract IST offset to get the actual UTC instant corresponding to that IST local time.
          const utcForThatIstMs =
            Date.UTC(y, m - 1, d, hh, mm, 0) - istOffsetMs;
          payload.date = new Date(utcForThatIstMs).toISOString();
        } else {
          // fallback
          payload.date = new Date(form.date).toISOString();
        }
      }

      if (splitEnabled) {
        payload.splitWith = Object.keys(splitSelected).filter(
          (k) => splitSelected[k]
        );
        payload.splitCount = selectedCount;
        payload.splitShare = perShare;
      }

      // If this form is for a specific trip, attach trip id so backend filters include it
      if (tripIdParam) payload.trip = tripIdParam;

      await api.post('/submit', payload);

      setPopup(true);
      setTimeout(() => setPopup(false), 3000);

      setForm({
        name: '',
        date: getLocalDateTime(),
        location: form.location,
        amount: '',
        paymentMode: 'Online',
        description: '',
      });

      fetchSubmissions();
    } catch (err) {
      console.error(err);
      alert('Error submitting form');
    }

    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  };

  const handleDownload = () => {
    window.open(`${API}/download`, '_blank');
  };

  // Map rendering
  useEffect(() => {
    if (submissions.length === 0) return;
    const last = submissions[submissions.length - 1];
    if (!last.location) return;

    const [lat, lng] = last.location.split(',').map(Number);

    // If Leaflet (`L`) is not available (e.g., CDN blocked), skip map rendering
    if (typeof L === 'undefined') {
      // don't spam console with errors; set a flag to show a friendly message
      setMapAvailable(false);
      return undefined;
    }

    // Create map and cleanup on unmount to avoid dangling DOM ops
    let map;
    try {
      const container = L.DomUtil.get('map');
      if (container != null) {
        container._leaflet_id = null;
      }
      map = L.map('map').setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.marker([lat, lng])
        .addTo(map)
        .bindPopup('Last Recorded Location 📍')
        .openPopup();
    } catch (e) {
      // non-fatal: show friendly message and skip map
      console.debug('Map render skipped (Leaflet error)', e);
      setMapAvailable(false);
    }

    return () => {
      try {
        if (map) map.remove();
      } catch (e) {
        // ignore
      }
    };
  }, [submissions]);

  return (
    <div className='app-wrap'>
      {popup && <div className='popup'>Form Submitted Successfully ✅</div>}

      {/* FORM CARD */}
      <div className='card'>
        <h2 className='h1'>Payment Receipt</h2>

        {tripIdParam && !canSubmit ? (
          <div className='muted'>
            You don't have permission to submit payments for this trip. If you
            believe this is an error, ask the trip owner to approve your join
            request.
            {meUser ? (
              <div style={{ marginTop: 8 }}>
                <button
                  className='btn btn-primary'
                  onClick={async () => {
                    try {
                      await api.post(`/trips/${trip._id}/join-requests`, {
                        message: 'Requesting to join the trip',
                      });
                      alert('Join request sent to the trip owner');
                    } catch (e) {
                      console.error(e);
                      alert('Error sending join request');
                    }
                  }}
                >
                  Request to Join
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                Please log in to request to join this trip.
              </div>
            )}
          </div>
        ) : (
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
                {names.length > 0 ? (
                  names.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))
                ) : (
                  <option value=''>(No participants)</option>
                )}
              </select>
            </div>

            {/* DATE/TIME INPUT */}
            <div className='field'>
              <label>Date & Time (IST)</label>
              <input
                type='datetime-local'
                name='date'
                value={form.date}
                onChange={handleChange}
                required
              />
              <div className='small mt-4'>
                Enter the event time (will be saved as IST and displayed in
                IST).
              </div>
            </div>

            {/* SPLIT UI */}
            <div className='field mt-4'>
              <label className='split-checkbox-label'>
                <input
                  type='checkbox'
                  checked={splitEnabled}
                  onChange={toggleSplit}
                />
                <span className='checkbox-text'>
                  Split amount among selected
                </span>
              </label>

              {splitEnabled && (
                <div className='mt-8'>
                  <div className='relative'>
                    <button
                      type='button'
                      className='btn btn-ghost dropdown-button'
                      onClick={() => setSplitDropdownOpen((s) => !s)}
                    >
                      Split with ({selectedCount}) ▾
                    </button>

                    {splitDropdownOpen && (
                      <div className='split-dropdown-menu'>
                        {names.length > 0 ? (
                          names.map((n) => (
                            <label key={n} className='split-menu-item'>
                              <input
                                type='checkbox'
                                checked={!!splitSelected[n]}
                                onChange={() => toggleSelectName(n)}
                              />
                              <span>{n}</span>
                            </label>
                          ))
                        ) : (
                          <div className='small muted'>
                            No participants to split with
                          </div>
                        )}

                        <div className='split-menu-done'>
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

            <div className='field full submit-row'>
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
        )}
      </div>

      {/* SUMMARY TABLE */}
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
              {namesForDisplay.map((name) => {
                const paid = paidTotalsState[name] || 0;
                const share = summary[name] || 0;
                const net = +(paid - share).toFixed(2);
                return (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>₹{paid.toFixed(2)}</td>
                    <td>₹{share.toFixed(2)}</td>
                    <td className={net >= 0 ? 'net-positive' : 'net-negative'}>
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
                  {editingId === s._id ? (
                    <>
                      <td>{s.name}</td>
                      <td>
                        <input
                          type='datetime-local'
                          value={editForm.date}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, date: e.target.value }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.location}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              location: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.amount}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              amount: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        {s.splitShare
                          ? `₹${s.splitShare.toFixed(2)}`
                          : `₹${s.amount}`}
                      </td>
                      <td>{s.paymentMode}</td>
                      <td>
                        {s.splitWith?.length > 0
                          ? `${s.splitWith.length} people`
                          : s.name}
                      </td>
                      <td>
                        <input
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              description: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <button
                          type='button'
                          className='btn btn-primary'
                          title='Save'
                          aria-label='Save'
                          onClick={async () => {
                            try {
                              // convert editForm.date (datetime-local) to ISO (IST aware)
                              const payload = { ...editForm };
                              if (payload.date) {
                                // if includes 'T' assume local datetime-local and convert to UTC ISO
                                const [datePart, timePart] =
                                  payload.date.split('T');
                                if (datePart && timePart) {
                                  const [y, m, d] = datePart
                                    .split('-')
                                    .map(Number);
                                  const [hh, mm] = timePart
                                    .split(':')
                                    .map(Number);
                                  const istOffsetMs = 5.5 * 60 * 60 * 1000;
                                  const utcForThatIstMs =
                                    Date.UTC(y, m - 1, d, hh, mm, 0) -
                                    istOffsetMs;
                                  payload.date = new Date(
                                    utcForThatIstMs
                                  ).toISOString();
                                }
                              }
                              await api.put(`/submissions/${s._id}`, payload);
                              setEditingId(null);
                              fetchSubmissions();
                              alert('Submission updated');
                            } catch (e) {
                              console.error(e);
                              const status = e?.response?.status;
                              const msg =
                                e?.response?.data?.error ||
                                e.message ||
                                'Error updating submission';
                              if (status === 404) {
                                alert(
                                  'Submission not found (it may have been deleted).'
                                );
                                setEditingId(null);
                                fetchSubmissions();
                                return;
                              }
                              if (
                                status === 400 &&
                                msg.toLowerCase().includes('parent trip')
                              ) {
                                alert(
                                  'Trip for this submission no longer exists. The submission cannot be edited.'
                                );
                                setEditingId(null);
                                fetchSubmissions();
                                return;
                              }
                              alert(msg);
                            }
                          }}
                        >
                          💾
                        </button>
                        <button
                          type='button'
                          className='btn btn-ghost'
                          title='Cancel'
                          aria-label='Cancel'
                          onClick={() => setEditingId(null)}
                        >
                          ✖
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{s.name}</td>
                      {/* show stored date in IST with "10 Dec 2025, 03:30 PM" */}
                      <td>{s.date ? formatToIST(s.date) : '—'}</td>
                      <td>{s.location}</td>
                      <td>₹{s.amount}</td>
                      <td>
                        {s.splitShare
                          ? `₹${s.splitShare.toFixed(2)}`
                          : `₹${s.amount}`}
                      </td>
                      <td>{s.paymentMode}</td>
                      <td>
                        {s.splitWith?.length > 0 ? (
                          <div
                            className='inline-block'
                            style={{ position: 'relative' }}
                          >
                            <button
                              type='button'
                              className='btn btn-ghost split-count-btn'
                              onClick={() =>
                                setExpandedSplitRows((prev) => ({
                                  ...prev,
                                  [s._id]: !prev[s._id],
                                }))
                              }
                            >
                              {s.splitWith.length} people{' '}
                              {expandedSplitRows[s._id] ? '▲' : '▼'}
                            </button>
                            {expandedSplitRows[s._id] && (
                              <div className='split-expanded-popup'>
                                {s.splitWith.map((name) => (
                                  <div key={name} style={{ padding: '4px 0' }}>
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
                          title='Share on WhatsApp'
                          aria-label='Share on WhatsApp'
                          onClick={() => {
                            // If location looks like lat,lng, convert to Google Maps link
                            let locationLine = s.location || 'N/A';
                            if (s.location) {
                              const m = s.location
                                .trim()
                                .match(
                                  /(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
                                );
                              if (m) {
                                const lat = m[1];
                                const lng = m[2];
                                const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                locationLine = `${lat}, ${lng} (${mapsLink})`;
                              }
                            }

                            const message = `\nSubmission Details 📝\n\nName: ${
                              s.name
                            }\nAmount: ₹${s.amount}\nPayment Mode: ${
                              s.paymentMode
                            }\nDate: ${
                              s.date ? formatToIST(s.date) : '—'
                            }\nLocation: ${locationLine}\nDescription: ${
                              s.description || 'N/A'
                            }`;
                            window.open(
                              `${WA_BASE}${encodeURIComponent(message)}`,
                              '_blank'
                            );
                          }}
                        >
                          🟢
                        </button>
                        {meUser &&
                          trip &&
                          String(trip.owner) === String(meUser._id) && (
                            <button
                              className='btn btn-ghost'
                              title='Edit'
                              aria-label='Edit'
                              onClick={() => {
                                setEditingId(s._id);
                                setEditForm({
                                  amount: s.amount,
                                  description: s.description || '',
                                  date: s.date
                                    ? new Date(s.date)
                                        .toISOString()
                                        .slice(0, 16)
                                    : '',
                                  location: s.location || '',
                                });
                              }}
                            >
                              ✎
                            </button>
                          )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MAP */}
      <div className='card'>
        <h3 className='h1'>Last Location Map</h3>
        {mapAvailable ? (
          <div id='map' className='map-container'></div>
        ) : (
          <div className='small muted'>
            Map unavailable (Leaflet not loaded).
          </div>
        )}
      </div>

      <h4 className='section-title'>Final Settlement</h4>

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
