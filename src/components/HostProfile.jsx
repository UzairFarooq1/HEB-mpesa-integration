import React, { useState, useEffect } from 'react';
import ProfileCard from './ProfileCard';
import EventsTabsProfile from './EventsTabsProfile';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styled from 'styled-components';
import Header from './Header';

const HostProfile = () => {
  const [message, setMessage] = useState('');

  const onScanSuccess = async (decodedText, decodedResult) => {
    try {
      // Assuming the QR code contains JSON data with the ticketId
      const ticketData = JSON.parse(decodedText);
      const response = await fetch(`https://mpesa-backend-api.vercel.app/verify-ticket/${ticketData.ticketId}`);
  
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'verified') {
          setMessage('Ticket verified successfully');
        } else if (result.status === 'used') {
          setMessage('Ticket already used');
        } else {
          setMessage('Verification status unknown');
        }
      } else {
        const error = await response.text();
        setMessage(`Verification failed: ${error}`);
      }
    } catch (error) {
      console.error('Error during verification:', error);
      setMessage('Verification failed due to an error');
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
