import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { toast } from 'react-toastify';

export default function History() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/trips/${tripId}/history`);
        setItems(res.data || []);
      } catch (err) {
        console.error('Load history', err);
        toast.error(err?.response?.data?.error || 'Failed to load history');
      }
    };
    load();
  }, [tripId]);

  return (
    <div className='app-wrap'>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <button
          className='icon-btn bg-create'
          onClick={() => navigate(-1)}
          title='Back'
          aria-label='Back'
        >
          <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
            <path d='M15 18l-6-6 6-6' stroke='#fff' strokeWidth='1.5' />
          </svg>
        </button>
      </div>

      <div className='card'>
        <h2 className='h1'>Activity History</h2>
        {items.length === 0 ? (
          <div className='empty-state'>No activity yet</div>
        ) : (
          <div>
            {items.map((it) => (
              <div
                key={it._id}
                style={{ padding: 8, borderBottom: '1px solid #eee' }}
              >
                <div style={{ fontSize: 13 }}>
                  <strong>{it.userName || 'System'}</strong>{' '}
                  <span className='muted'>
                    • {new Date(it.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className='small'>
                  {it.action} — {it.details}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
