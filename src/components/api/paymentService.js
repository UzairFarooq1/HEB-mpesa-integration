// api/paymentService.js

import axios from 'axios';

// Function to generate access token
export const generateAccessToken = async () => {
  try {
    const response = await axios.get('/api/auth/generate-token');
    return response.data.token;
  } catch (error) {
    console.error('Error generating access token:', error);
    throw error;
  }
};

// Function to initiate payment
export const initiatePayment = async (paymentData) => {
  try {
    const accessToken = await generateAccessToken();
    const response = await axios.post('/api/payments/initiate-payment', paymentData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error initiating payment:', error);
    throw error;
  }
};
