import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

import SubmissionForm from './components/SubmissionForm';
import TripCreate from './components/TripCreate';
import TripView from './components/TripView';
import History from './pages/History';

import Dashboard from './pages/Dashboard';
import JoinTrip from './pages/JoinTrip';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/Forgot';

import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Auth */}
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/forgot' element={<ForgotPassword />} />

          {/* Public routes */}
          <Route path='/join/:joinCode' element={<JoinTrip />} />
          <Route path='/submit' element={<SubmissionForm />} />

          {/* Protected routes */}
          <Route
            path='/'
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path='/create-trip'
            element={
              <PrivateRoute>
                <TripCreate />
              </PrivateRoute>
            }
          />

          <Route
            path='/trip/:tripId'
            element={
              <PrivateRoute>
                <TripView />
              </PrivateRoute>
            }
          />
          <Route
            path='/trip/:tripId/history'
            element={
              <PrivateRoute>
                <History />
              </PrivateRoute>
            }
          />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
