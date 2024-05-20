import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import Header from './Header';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import CheckoutComp from './Checkout/CheckoutComp';

import { useLocation } from 'react-router-dom';


const Checkout = () => {
  const location = useLocation();
  const { state } = location;

  if (!state || !state.pendingTickets) {
    // Handle the case where pendingTickets is not available in state
    return <div>No pending tickets found</div>;
  }

  const { pendingTickets } = state;

  return (
    <>
      <Header />
      <CheckoutComp pendingTickets={pendingTickets} />
    </>
  );
};

export default Checkout;