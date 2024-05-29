import React, { useState, useEffect } from 'react';
import ProfileCard from './ProfileCard';
import EventsTabsProfile from './EventsTabsProfile';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styled from 'styled-components';
import Header from './Header';

const HostProfile = () => {
  const [message, setMessage] = useState('');

  const onScanSuccess = async (decodedText, decodedResult) => {
    // Assuming the QR code contains JSON data with the ticketId
    const ticketData = JSON.parse(decodedText);
    const response = await fetch('https://mpesa-backend-api.vercel.app/verifyticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketId: ticketData.ticketId }),
    });

    if (response.ok) {
      setMessage('Ticket verified successfully');
    } else {
      const error = await response.text();
      setMessage(`Verification failed: ${error}`);
    }
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: 250
    });

    scanner.render(onScanSuccess);

    return () => {
      scanner.clear();
    };
  }, []);

  return (
    <>
      <Header isHostProfilePage />
      <div>
        <h1>QR Code Scanner</h1>
        <div id="reader" style={{ width: '500px' }}></div>
        {message && <p>{message}</p>}
      </div>

      <ProfileCard />
      <EventsTabsProfile />
    </>
  );
};

export default HostProfile;
 