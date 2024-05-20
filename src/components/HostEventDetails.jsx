import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import {
  getDocs,
  collection,
  query,
  where,
  getFirestore,
  onSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const Loader = styled.div`
  border: 8px solid #f3f3f3;
  border-top: 8px solid gold;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: auto;
  margin-top: 100px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const createTableData = async (userId, status) => {
  const data = [];

  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('userId', '==', userId), where('status', '==', status));

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const eventData = doc.data();
      const ticketsArray = Object.values(eventData.ticketTypes || {});
      let datesArray = [];

      if (eventData.eventDates instanceof Array) {
        // Assuming eventData.eventDates is an array of Timestamps
        datesArray = eventData.eventDates.map(date => date.toDate());
      } else if (eventData.eventDates instanceof Object && eventData.eventDates.toDate) {
        // Assuming eventData.eventDates is a single Timestamp object
        datesArray = [eventData.eventDates.toDate()];
      }

      data.push({
        id: doc.id,
        name: eventData.eventName,
        description: eventData.eventDesc,
        dates: datesArray,
        tickets: ticketsArray,
        location: eventData.location,
        status: eventData.status,
        attendees: eventData.attendees || [],
        ticketsSold: eventData.ticketsSold || 0,
      });
    });
  } catch (error) {
    console.error('Error fetching events:', error);
  }

  return data;
};

const HostEventDetails = () => {
  const { userId: paramUserId } = useParams();
  const [userId, setUserId] = useState(null);
  const auth = getAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        let targetUserId = userId;

        // Use the authenticated user's ID if available, otherwise use the parameter userId
        if (!userId && paramUserId) {
          targetUserId = paramUserId;
        }

        const data = await createTableData(targetUserId, 'approved');
        setTableData(data);
      } catch (error) {
        console.error('Error fetching table data.', error);
      } finally {
        setIsLoading(false); 
      }
    };

    fetchData();
  }, [userId, paramUserId]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      {/* Add your JSX for displaying the host event details, tickets sold, attendees, and analytics here */}
      {tableData.map((event, index) => (
        <div key={index}>
          <h2>{event.name}</h2>
          <p>Description: {event.description}</p>
          <p>Dates: {event.dates.join(', ')}</p>
          <p>Location: {event.location}</p>
          {/* <p>Status: {event.status}</p> */}
          <p>Tickets Sold: {event.ticketsSold}</p>
          <p>Attendees: {event.attendees.join(', ')}</p>

        </div>
      ))}
    </>
  );
};

export default HostEventDetails;
