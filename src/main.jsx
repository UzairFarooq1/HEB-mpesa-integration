/* eslint-disable no-unused-vars */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

<link rel="stylesheet" href="<https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css>" />
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import firebaseConfig from './firebaseConfig'; // Adjust the path accordingly
import { getFirestore } from 'firebase/firestore';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <ToastContainer />
  </React.StrictMode>,
)