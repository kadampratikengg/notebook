import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * TripCreate
 * - Create mode: POST /trips
 * - Edit mode: PUT /trips/:id   ✅ updates SAME trip only
 * - NO fallback create when editing
 */
export default function TripCreate({
  initialData = null,
  tripId = null,
  onSaved = null,
}) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [participants, setParticipants] = useState(['']);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  /* ---------- PREFILL DATA FOR EDIT ---------- */
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setStartDate(initialData.startDate || '');
      setEndDate(initialData.endDate || '');
      setParticipants(
        initialData.participants?.length ? initialData.participants : ['']
      );
    }
  }, [initialData]);

  /* ---------- HELPERS ---------- */
  const getTodayYYYYMMDD = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const handleParticipantChange = (i, value) => {
    const list = [...participants];
    list[i] = value;
    setParticipants(list);
  };

  const addParticipant = () => setParticipants([...participants, '']);
  const removeParticipant = (i) =>
    setParticipants(participants.filter((_, idx) => idx !== i));

  /* ---------- SUBMIT ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !title.trim() ||
      !startDate ||
      !endDate ||
      participants.some((p) => !p.trim())
    ) {
      toast.error('All fields are required');
      return;
    }

    const payload = {
      title: title.trim(),
      startDate: new Date(startDate + 'T00:00:00').toISOString(),
      endDate: new Date(endDate + 'T00:00:00').toISOString(),
      participants: participants.map((p) => ({ name: p.trim() })),
    };

    setSaving(true);

    try {
      if (tripId) {
        /* ---------- EDIT EXISTING TRIP (ONLY PUT) ---------- */
        const res = await api.put(`/trips/${tripId}`, payload);
        toast.success('Trip updated successfully');

        if (onSaved) onSaved(res.data);
      } else {
        /* ---------- CREATE NEW TRIP ---------- */
        const res = await api.post('/trips', payload);
        toast.success('Trip created successfully');
        navigate('/');
        if (onSaved) onSaved(res.data);
      }
    } catch (err) {
      console.error('Trip save error', err);
      toast.error(
        err?.response?.data?.error ||
          'Failed to update trip. Please check backend PUT route.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- ICON ---------- */
  const IconBack = () => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
      <path d='M15 18l-6-6 6-6' stroke='#fff' strokeWidth='1.5' />
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

  const IconX = ({ stroke = '#fff' }) => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none'>
      <path
        d='M18 6L6 18M6 6l12 12'
        stroke={stroke}
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className='card'>
      {/* Top-right Back + Logout when used as standalone page */}
      {!onSaved && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <button
            className='icon-btn bg-create'
            onClick={() => navigate(-1)}
            title='Back'
            aria-label='Back'
          >
            <IconBack />
          </button>
          <button
            className='icon-btn bg-delete'
            onClick={handleLogout}
            title='Logout'
            aria-label='Logout'
          >
            <IconLogout />
          </button>
        </div>
      )}
      <h2 className='h1'>{tripId ? 'Edit Trip' : 'Create Trip'}</h2>

      <form onSubmit={handleSubmit} className='form-grid'>
        <div className='field'>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className='field'>
          <label>Start Date</label>
          <input
            type='date'
            value={startDate}
            min={getTodayYYYYMMDD()}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className='field'>
          <label>End Date</label>
          <input
            type='date'
            value={endDate}
            min={startDate || getTodayYYYYMMDD()}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className='field'>
          <label>Participants</label>
          {participants.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input
                value={p}
                onChange={(e) => handleParticipantChange(i, e.target.value)}
                placeholder='Participant name'
              />
              <button
                type='button'
                className='icon-btn bg-delete'
                onClick={() => removeParticipant(i)}
                aria-label='Remove participant'
                title='Remove'
              >
                <IconX />
              </button>
            </div>
          ))}

          <button
            type='button'
            className='icon-btn bg-create'
            onClick={addParticipant}
          >
            +
          </button>
        </div>

        <div className='field full' style={{ display: 'flex', gap: 10 }}>
          <button type='submit' className='btn btn-primary' disabled={saving}>
            {saving ? 'Saving...' : tripId ? 'Save Changes' : 'Create Trip'}
          </button>

          <button
            type='button'
            className='icon-btn bg-create'
            onClick={() => (onSaved ? onSaved(null) : navigate('/'))}
          >
            <IconBack />
          </button>
        </div>
      </form>

      <ToastContainer position='top-right' autoClose={2000} />
    </div>
  );
}
