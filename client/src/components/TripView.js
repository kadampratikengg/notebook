import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import SubmissionForm from './SubmissionForm';
import TripCreate from './TripCreate';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/* ---------- ICONS (same visual language as Dashboard) ---------- */

const IconBack = ({ stroke = '#fff' }) => (
  <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
    <path
      d='M15 18l-6-6 6-6'
      stroke={stroke}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const IconEdit = ({ stroke = '#fff' }) => (
  <svg width='16' height='16' viewBox='0 0 24 24' fill='none'>
    <path
      d='M3 21v-3.75L14.06 6.19a2 2 0 0 1 2.83 0l1.92 1.92a2 2 0 0 1 0 2.83L7.75 21H3z'
      stroke={stroke}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M14 7l3 3'
      stroke={stroke}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const IconLogout = ({ stroke = '#fff' }) => (
  <svg width='16' height='16' viewBox='0 0 24 24' fill='none'>
    <path
      d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'
      stroke={stroke}
      strokeWidth='1.5'
    />
    <path d='M16 17l5-5-5-5' stroke={stroke} strokeWidth='1.5' />
    <path d='M21 12H9' stroke={stroke} strokeWidth='1.5' />
  </svg>
);

/* -------------------------------------------------------------- */

export default function TripView() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  /* ---------- LOAD TRIP ---------- */
  useEffect(() => {
    let mounted = true;

    const loadTrip = async () => {
      try {
        const res = await api.get(`/trips/${tripId}`);
        if (mounted) setTrip(res.data);
        // determine ownership
        try {
          const me = await api.get('/auth/me');
          if (me?.data?.user && res?.data?.owner) {
            setIsOwner(String(me.data.user._id) === String(res.data.owner));
          }
        } catch (e) {
          // ignore - not authenticated
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load trip');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTrip();
    return () => {
      mounted = false;
    };
  }, [tripId]);

  /* ---------- LOGOUT ---------- */
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className='app-wrap'>
        <div className='card'>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className='app-wrap'>
        <div className='card'>
          <h2>Trip not found</h2>
          <button className='icon-btn bg-create' onClick={() => navigate('/')}>
            <span className='icon-small'>
              <IconBack />
            </span>
          </button>
        </div>
      </div>
    );
  }

  const initialForEdit = {
    title: trip.title || '',
    startDate: trip.startDate?.split('T')[0] || '',
    endDate: trip.endDate?.split('T')[0] || '',
    participants: trip.participants?.map((p) => p.name) || [],
  };

  return (
    <div className='app-wrap'>
      {/* ---------- TOP BAR (RIGHT ALIGNED BUTTONS) ---------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {/* (Participants button removed - not used) */}

        {/* Edit (owner only) */}
        {isOwner && (
          <button
            className='icon-btn bg-view'
            onClick={() => setEditing(true)}
            title='Edit Trip'
          >
            <span className='icon-small'>
              <IconEdit />
            </span>
          </button>
        )}

        {/* Back to Dashboard */}
        <button
          className='icon-btn bg-create'
          onClick={() => navigate('/')}
          title='Back to Dashboard'
        >
          <span className='icon-small'>
            <IconBack />
          </span>
        </button>

        {/* Logout */}
        <button
          className='icon-btn bg-delete'
          onClick={handleLogout}
          title='Logout'
        >
          <span className='icon-small'>
            <IconLogout />
          </span>
        </button>
      </div>

      {/* ---------- TRIP DETAILS ---------- */}
      <div className='card'>
        <h2 className='h1'>{trip.title}</h2>
        <p>
          <strong>Start:</strong> {trip.startDate?.split('T')[0]}
        </p>
        <p>
          <strong>End:</strong> {trip.endDate?.split('T')[0]}
        </p>
        <p id='participants'>
          <strong>Participants:</strong>{' '}
          {trip.participants?.length
            ? trip.participants.map((p) => p.name).join(', ')
            : 'None'}{' '}
          <a
            href={`/trip/${tripId}/history`}
            style={{ marginLeft: 12 }}
            className='muted'
          >
            History
          </a>
        </p>
      </div>

      {/* ---------- EDIT MODE ---------- */}
      {editing && (
        <div style={{ marginTop: 12 }}>
          <TripCreate
            initialData={initialForEdit}
            tripId={tripId}
            onSaved={(updated) => {
              if (updated) setTrip(updated);
              setEditing(false);
            }}
          />
        </div>
      )}

      {/* ---------- SUBMISSION FORM ---------- */}
      <div style={{ marginTop: 12 }}>
        <SubmissionForm />
      </div>

      <ToastContainer position='top-right' autoClose={3000} />
    </div>
  );
}
