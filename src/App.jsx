// App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import SignUp from './components/SignUp';
import Login from './components/Login';
import WelcomePage from './components/WelcomePage';
import EventForm from './components/EventForm';
import AttendeeSignUp from './components/Attendeesignup';
import PasswordReset from './components/PasswordReset';
import Organizations from './components/Organizations';
import HostProfile from './components/HostProfile';
import EditEventPage from './components/EditEventPage';
import EventDetails from './components/EventDetails';
import Checkout from './components/Checkout';


const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />}  />
        <Route path="/passwordreset" element={<PasswordReset />}  />
        <Route path="/Event Registration" element={<EventForm />} />
        <Route path="/Event Registration/:eventId" element={<EventForm />} />
        <Route path="/attendeesignup" element={< AttendeeSignUp/>} />
        <Route path="/HostProfile/:userId" element={<HostProfile />} />
        <Route path="/My Profile" element={<HostProfile />} />
        <Route path="myOrganizations" element={<Organizations/>} />
        <Route path="/event/:eventId" element={<EventDetails/>} />
        <Route path="/" element={<WelcomePage />} />
        <Route path="/Checkout" element={<Checkout />} />

      </Routes>
    </Router>
  );
};

export default App;
