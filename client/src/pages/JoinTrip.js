// client/src/pages/JoinTrip.js
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';

export default function JoinTrip() {
  const { joinCode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!joinCode) return;
    api
      .get(`/trips/join/${joinCode}`)
      .then((res) => {
        const trip = res.data;
        // Redirect to public submission form with tripId in query
        // delay navigation slightly to avoid React unmount timing issues
        setTimeout(
          () => navigate(`/submit?tripId=${trip._id}`, { replace: true }),
          0
        );
      })
      .catch((err) => {
        console.error('Join trip error', err);
        alert('Trip not found or error fetching trip');
        setTimeout(() => navigate('/', { replace: true }), 0);
      });
  }, [joinCode, navigate]);

  return (
    <div className='app-wrap'>
      <div className='card'>
        <h2 className='h1'>Redirecting to submission form...</h2>
      </div>
    </div>
  );
}
