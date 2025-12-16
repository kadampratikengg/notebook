// client/src/pages/Dashboard.js
// Dashboard — keeps original logic, moves action buttons to the right via CSS.
// Reference: original uploaded file.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Dashboard.css';

/* ---------- Icons (kept same) ---------- */
const IconBrand = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <rect x='2' y='2' width='20' height='20' rx='5' fill='#0ea5a4' />
    <path
      d='M7 12h10M7 8h10M7 16h6'
      stroke='#fff'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const IconPlus = ({ size = 18, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path
      d='M12 5v14M5 12h14'
      stroke={stroke}
      strokeWidth='1.6'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const IconEye = ({ size = 18, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path
      d='M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <circle cx='12' cy='12' r='3' stroke={stroke} strokeWidth='1.4' />
  </svg>
);

const IconClipboard = ({ size = 18, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path
      d='M9 2h6a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H9A2 2 0 0 1 7 4v0a2 2 0 0 1 2-2z'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M7 8v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const IconLink = ({ size = 18, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path
      d='M10 14a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 6.93'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M14 10a5 5 0 0 0-7.07 0L5.52 11.41a5 5 0 0 0 7.07 7.07L14 17.07'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const IconLogout = ({ size = 18, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path
      d='M16 17l5-5-5-5'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M21 12H9'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M13 19H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const IconCheck = ({ size = 16, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path
      d='M20 6L9 17l-5-5'
      stroke={stroke}
      strokeWidth='1.6'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const IconX = ({ size = 16, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path
      d='M18 6L6 18M6 6l12 12'
      stroke={stroke}
      strokeWidth='1.6'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const IconTrash = ({ size = 16, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path
      d='M3 6h18'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M10 11v6M14 11v6'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'
      stroke={stroke}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

/* --------------------------------------------------------- */

export default function Dashboard() {
  const [trips, setTrips] = useState([]);
  const [pendingCounts, setPendingCounts] = useState({});
  const [openRequestsFor, setOpenRequestsFor] = useState(null);
  const [requestsList, setRequestsList] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinInput, setJoinInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      try {
        const res = await api.get('/trips');
        setTrips(res.data || []);
        // load my join requests (for non-owners who requested to join other trips)
        try {
          const r = await api.get('/join-requests/me');
          setMyRequests(r.data || []);
        } catch (e) {
          setMyRequests([]);
        }
        // fetch pending counts for owned trips
        try {
          const counts = {};
          await Promise.all(
            (res.data || []).map(async (t) => {
              try {
                const r = await api.get(`/trips/${t._id}/join-requests`);
                counts[t._id] = Array.isArray(r.data) ? r.data.length : 0;
              } catch (e) {
                counts[t._id] = 0;
              }
            })
          );
          setPendingCounts(counts);
        } catch (e) {
          /* ignore */
        }
      } catch (err) {
        console.error('Failed to load trips', err);
        if (err?.response?.status === 401) {
          navigate('/login');
        } else {
          toast.error(err?.response?.data?.error || 'Failed to load trips');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [navigate]);

  // If the user has pending join requests, poll /join-requests/me so they get
  // updated status (accepted/rejected) without manual refresh.
  useEffect(() => {
    if (!myRequests || myRequests.length === 0) return;
    const hasPending = myRequests.some((m) => m.status === 'pending');
    if (!hasPending) return;

    let attempts = 0;
    const iv = setInterval(async () => {
      attempts += 1;
      try {
        const r = await api.get('/join-requests/me');
        setMyRequests(r.data || []);
        if (!r.data || !r.data.some((m) => m.status === 'pending')) {
          clearInterval(iv);
        }
      } catch (e) {
        // ignore transient errors
      }
      if (attempts >= 30) clearInterval(iv); // stop after ~4 minutes
    }, 8000);

    return () => clearInterval(iv);
  }, [myRequests]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      /* ignore server logout errors */
    }
    try {
      localStorage.removeItem('token');
    } catch (e) {}
    toast.success('Logged out');
    setTimeout(() => navigate('/login'), 600);
  };

  // Extract join code from raw input (code or full url)
  const extractJoinCode = (raw) => {
    if (!raw) return '';
    try {
      const u = new URL(raw);
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('join');
      if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1];
      if (u.searchParams.has('joinCode')) return u.searchParams.get('joinCode');
    } catch (e) {}
    return raw.trim();
  };

  const handleJoinByCode = async () => {
    const code = extractJoinCode(joinInput);
    if (!code) {
      toast.error('Enter a join code or paste the join link');
      return;
    }

    try {
      const res = await api.get(`/trips/join/${code}`);
      const trip = res.data;
      if (!trip || !trip._id) {
        toast.error('Trip not found');
        return;
      }

      // attempt two possible join endpoints (legacy handling)
      try {
        await api.post(`/trips/${trip._id}/join-requests`, {
          message: 'Request to join from dashboard',
        });
      } catch (e) {
        // If unauthenticated (401), fall back to legacy public endpoint. For other
        // errors (e.g., already a participant), surface the server message.
        if (e?.response?.status === 401) {
          await api.post(`/trips/join/${code}/request`, {
            message: 'Request to join from dashboard',
          });
        } else {
          throw e;
        }
      }

      toast.success(
        `Join request sent for "${
          trip.title || '(Untitled)'
        }". The trip owner will review.`
      );
      setJoinInput('');
    } catch (err) {
      console.error('Join-by-code error', err);
      toast.error(
        err?.response?.data?.error || 'Error requesting to join trip'
      );
    }
  };

  const copyJoinLink = (t) => {
    const url = `${window.location.origin}/join/${t.joinCode}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        toast.success('Join link copied to clipboard');
      })
      .catch(() => {
        alert(`Copy this link: ${url}`);
      });
  };

  const openRequests = async (tripId) => {
    try {
      const res = await api.get(`/trips/${tripId}/join-requests`);
      setRequestsList(res.data || []);
      setOpenRequestsFor(tripId);
    } catch (err) {
      console.error('Could not load requests', err);
      toast.error(err?.response?.data?.error || 'Failed to load requests');
    }
  };

  const closeRequests = () => {
    setOpenRequestsFor(null);
    setRequestsList([]);
  };

  const acceptRequest = async (tripId, reqId) => {
    try {
      await api.post(`/trips/${tripId}/join-requests/${reqId}/accept`);
      toast.success('Request accepted');
      // refresh
      const res = await api.get('/trips');
      setTrips(res.data || []);
      await openRequests(tripId);
      // refresh counts
      const counts = { ...pendingCounts };
      counts[tripId] = Math.max(0, (counts[tripId] || 1) - 1);
      setPendingCounts(counts);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to accept');
    }
  };

  const rejectRequest = async (tripId, reqId) => {
    try {
      await api.post(`/trips/${tripId}/join-requests/${reqId}/reject`);
      toast.success('Request rejected');
      await openRequests(tripId);
      const counts = { ...pendingCounts };
      counts[tripId] = Math.max(0, (counts[tripId] || 1) - 1);
      setPendingCounts(counts);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to reject');
    }
  };

  const deleteTrip = async (tripId) => {
    const ok = window.confirm(
      'Delete this trip? This action cannot be undone.'
    );
    if (!ok) return;
    try {
      // optimistic UI — fixed typo: use _id only
      setTrips((prev) => prev.filter((t) => t._id !== tripId));
      await api.delete(`/trips/${tripId}`);
      toast.success('Trip deleted');
    } catch (err) {
      console.error('Delete trip error', err);
      toast.error(err?.response?.data?.error || 'Failed to delete trip');
      // re-fetch on failure to restore correct state
      try {
        const res = await api.get('/trips');
        setTrips(res.data || []);
      } catch (_) {
        /* ignore */
      }
    }
  };

  // helper to get a participant count (handles different possible field shapes)
  const getParticipantCount = (t) => {
    if (!t) return 0;
    if (Array.isArray(t.participants)) return t.participants.length;
    if (typeof t.participantCount === 'number') return t.participantCount;
    if (typeof t.participantsCount === 'number') return t.participantsCount;
    return 0;
  };

  return (
    <div className='app-wrap dashboard-root'>
      <div className='page-inner'>
        <header className='hdr'>
          <div className='hdr-left'>
            <IconBrand size={45} />
          </div>

          {/* Right side: join-wrapper (full width) + controls */}
          <div className='hdr-right'>
            <div className='join-wrapper'>
              <input
                className='join-input'
                placeholder='Paste join code or link'
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                aria-label='Join code or link'
                title='Paste join code or link'
              />
              <button
                onClick={handleJoinByCode}
                className='icon-btn bg-join'
                aria-label='Request to join'
                title='Request to join'
              >
                <span className='icon-small'>
                  <IconLink stroke='#fff' />
                </span>
              </button>

              {/* Create (icon-only) */}
              <Link
                to='/create-trip'
                aria-label='Create trip'
                title='Create trip'
                className='icon-btn bg-create'
              >
                <span className='icon-small'>
                  <IconPlus stroke='#fff' />
                </span>
              </Link>

              {/* Logout (icon-only) */}
              <button
                onClick={handleLogout}
                className='icon-btn bg-logout'
                aria-label='Logout'
                title='Logout'
              >
                <span className='icon-small'>
                  <IconLogout stroke='#fff' />
                </span>
              </button>
            </div>
          </div>
        </header>

        <main>
          {myRequests.length > 0 && (
            <section style={{ marginBottom: 12 }}>
              <h3 className='title'>Your join requests</h3>
              <div className='muted'>Recent requests and their status</div>
              <div style={{ marginTop: 8 }}>
                {myRequests.map((m) => (
                  <div
                    key={m._id}
                    style={{
                      padding: 8,
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div>
                        <strong>{m.trip?.title || 'Trip'}</strong> —{' '}
                        <span className='muted'>{m.status}</span>
                      </div>
                      <div className='small'>{m.message}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {m.status === 'pending' && (
                        <button
                          className='icon-btn bg-delete'
                          title='Cancel request'
                          onClick={async () => {
                            try {
                              await api.delete(`/join-requests/${m._id}`);
                              toast.success('Request cancelled');
                              const r = await api.get('/join-requests/me');
                              setMyRequests(r.data || []);
                            } catch (err) {
                              console.error('Cancel request error', err);
                              toast.error(
                                err?.response?.data?.error || 'Failed to cancel'
                              );
                            }
                          }}
                          aria-label='Cancel request'
                        >
                          <span className='icon-small'>
                            <IconX stroke='#fff' />
                          </span>
                        </button>
                      )}

                      {m.status === 'accepted' && m.trip && (
                        <>
                          <Link
                            to={`/trip/${m.trip._id}`}
                            className='icon-btn bg-view'
                            title='View trip'
                            aria-label='View trip'
                          >
                            <span className='icon-small'>
                              <IconEye stroke='#fff' />
                            </span>
                          </Link>
                          <Link
                            to={`/submit?tripId=${m.trip._id}`}
                            className='icon-btn bg-create'
                            title='Add payment'
                            aria-label='Add payment'
                          >
                            <span className='icon-small'>
                              <IconPlus stroke='#fff' />
                            </span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className='trips-header'>
            <h2 className='title'>Your Trips</h2>
            <div className='muted'>
              {loading ? 'Loading...' : `${trips.length} trip(s)`}
            </div>
          </section>

          <div className='trips-list-root'>
            {loading ? (
              <div className='empty-state'>Loading trips...</div>
            ) : trips.length === 0 ? (
              <div className='empty-card'>
                <div className='empty-title'>No trips yet.</div>
                <div className='empty-desc'>
                  You haven't created any trips. Click the Create icon to get
                  started.
                </div>
                <div style={{ marginTop: 6 }}>
                  <Link
                    to='/create-trip'
                    aria-label='Create trip'
                    title='Create trip'
                    className='icon-btn bg-create'
                  >
                    <span className='icon-small'>
                      <IconPlus stroke='#fff' />
                    </span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className='trip-grid'>
                {trips.map((t) => {
                  const participantCount = getParticipantCount(t);
                  return (
                    <article
                      key={t._id}
                      className='trip-card'
                      aria-label={`Trip ${t.title || 'Unnamed'}`}
                    >
                      <div className='trip-card-top'>
                        <div className='trip-card-meta'>
                          <div className='trip-title'>
                            {t.title || 'Unnamed Trip'}
                          </div>

                          <div className='trip-dates'>
                            <div className='date-line'>
                              {t.startDate
                                ? new Date(t.startDate).toLocaleDateString()
                                : ''}{' '}
                              {t.endDate
                                ? `— ${new Date(
                                    t.endDate
                                  ).toLocaleDateString()}`
                                : ''}
                            </div>
                            <div className='participant-count'>
                              {participantCount} participant
                              {participantCount === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>

                        <div className='joincode'>
                          <div className='joincode-label'>Join code</div>
                          <div className='joincode-value'>{t.joinCode}</div>
                        </div>
                      </div>

                      {t.description && (
                        <div className='trip-desc'>{t.description}</div>
                      )}

                      <div className='card-actions'>
                        <div className='card-actions-left'>
                          {/* left-side can be used later for other small info; currently empty */}
                        </div>

                        <div className='card-actions-right'>
                          {/* Pending join requests (owner-only) */}
                          {pendingCounts[t._id] > 0 && (
                            <button
                              className='icon-btn bg-join'
                              onClick={() => openRequests(t._id)}
                              title={`${
                                pendingCounts[t._id]
                              } pending request(s)`}
                              aria-label='View requests'
                            >
                              <span className='icon-small'>
                                <svg
                                  width='14'
                                  height='14'
                                  viewBox='0 0 24 24'
                                  fill='none'
                                >
                                  <path
                                    d='M12 5v14M5 12h14'
                                    stroke='#fff'
                                    strokeWidth='1.4'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                  />
                                </svg>
                              </span>
                              <span className='badge'>
                                {pendingCounts[t._id]}
                              </span>
                            </button>
                          )}
                          <Link
                            to={`/trip/${t._id}`}
                            aria-label='View or manage'
                            title='View / Manage'
                            className='icon-btn bg-view'
                          >
                            <span className='icon-small'>
                              <IconEye stroke='#fff' />
                            </span>
                          </Link>

                          <button
                            className='icon-btn bg-copy'
                            onClick={() => copyJoinLink(t)}
                            aria-label='Copy join link'
                            title='Copy link'
                          >
                            <span className='icon-small'>
                              <IconClipboard stroke='#fff' />
                            </span>
                          </button>

                          <button
                            className='icon-btn bg-delete'
                            onClick={() => deleteTrip(t._id)}
                            aria-label='Delete trip'
                            title='Delete trip'
                          >
                            <span className='icon-small'>
                              <IconTrash stroke='#fff' />
                            </span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          {/* Requests panel */}
          {openRequestsFor && (
            <div className='requests-panel'>
              <div className='card'>
                <h3 className='h1'>Pending Join Requests</h3>
                <div style={{ marginTop: 8 }}>
                  {requestsList.length === 0 ? (
                    <div className='empty-state'>No pending requests</div>
                  ) : (
                    requestsList.map((r) => (
                      <div key={r._id} className='request-row'>
                        <div style={{ flex: 1 }}>
                          <div>
                            <strong>{r.name || '(Unnamed)'}</strong>{' '}
                            <span className='muted'>
                              • {new Date(r.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className='small'>{r.message}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className='icon-btn bg-create'
                            title='Accept request'
                            onClick={() =>
                              acceptRequest(openRequestsFor, r._id)
                            }
                            aria-label='Accept'
                          >
                            <span className='icon-small'>
                              <IconCheck stroke='#fff' />
                            </span>
                          </button>

                          <button
                            className='icon-btn bg-delete'
                            title='Reject request'
                            onClick={() =>
                              rejectRequest(openRequestsFor, r._id)
                            }
                            aria-label='Reject'
                          >
                            <span className='icon-small'>
                              <IconX stroke='#fff' />
                            </span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  <button
                    className='icon-btn bg-delete'
                    onClick={closeRequests}
                    title='Close'
                    aria-label='Close requests panel'
                  >
                    <span className='icon-small'>
                      <IconX stroke='#fff' />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ToastContainer position='top-right' autoClose={2500} />
    </div>
  );
}
