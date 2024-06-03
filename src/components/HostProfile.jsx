import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ProfileCard from './ProfileCard';
import EventsTabsProfile from './EventsTabsProfile';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styled from 'styled-components';
import Header from './Header';
import { Button } from "@/components/ui/button"
import { getFirestore } from 'firebase/firestore';
import { toast } from "react-toastify";



const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-top: 20px;
`;

const HostProfile = () => {
  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;
  const userId = user ? user.uid : null;
  const [message, setMessage] = useState('');
  const [ticketId, setTicketId] = useState('');

  const onScanSuccess = async (decodedText, decodedResult) => {
    try {
      // Assuming the QR code contains JSON data with the ticketId
      const ticketData = JSON.parse(decodedText);
      setTicketId(ticketData.ticketId);
    } catch (error) {
      console.error('Error parsing QR code:', error);
      setMessage('Failed to parse QR code');
    }
  };

  const verifyTicket = async () => {
    try {
      if (!ticketId) {
        setMessage('No ticket ID available for verification');
        return;
      }

      const response = await fetch(`https://mpesa-backend-api.vercel.app/verify-ticket/${ticketId}?userId=${userId}`);

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'verified') {
          toast.success("Ticket verified successfully");
          // setMessage('Ticket verified successfully');
        } else if (result.status === 'used') {
          toast.warn('Ticket has already been used');
          // setMessage('Ticket already used');
        } else {
          toast.warn('Ticket verification failed');
          // setMessage('Verification status unknown');
        }
      } else {
        const error = await response.text();
        toast.warn(`Verification failed: ${error}`)
        // setMessage(`Verification failed: ${error}`);
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
      <Container>
        <h1>QR Code Scanner</h1>
        <div id="reader" style={{ width: '500px', marginBottom: '20px' }}></div>
        {message && <p>{message}</p>}
        <Button onClick={verifyTicket}>Verify</Button>
      </Container>

      <ProfileCard />
      <EventsTabsProfile />
    </>
  );
};

export default HostProfile;
