import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../main.jsx';

// Styled components
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
`;

const EventDetailsContainer = styled.div`
  width: 70%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const PosterSection = styled.div`
  width: 30%;
  height: auto;
`;

const PosterImage = styled.img`
  width: 100%;
  height: auto;
`;

const DetailsSection = styled.div`
  width: 68%;
`;

const Title = styled.h2`
  color: #333;
`;

const Description = styled.p`
  color: #666;
`;

const SpeakersSection = styled.div`
  margin-top: 20px;
`;

const SpeakersTitle = styled.h3`
  color: #333;
`;

const SpeakerItem = styled.div`
  margin-bottom: 10px;
`;

const TicketSection = styled.div`
  margin-top: 20px;
`;

const TicketsTitle = styled.h3`
  color: #333;
`;

const TicketItem = styled.div`
  margin-bottom: 10px;
`;

const AddButton = styled.button`
  background-color: gold;
  color: #fff;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;

const UsersSection = styled.div`
  margin-top: 20px;
`;

const UsersTitle = styled.h3`
  color: #333;
`;

const UserItem = styled.div`
  margin-bottom: 10px;
`;

const EditRoleButton = styled.button`
  margin-right: 10px;
`;

const DeleteUserButton = styled.button`
  background-color: #ff4d4d;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
`;

const deleteUser = async (eventId, email) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (eventDoc.exists()) {
      const eventData = eventDoc.data();

      // Check if the user exists in the users field of the event
      if (eventData.users && eventData.users[email]) {
        // Delete the user's record from the users field in the event document
        const updatedUsers = { ...eventData.users };
        delete updatedUsers[email];
        await updateDoc(eventRef, { users: updatedUsers });
      } else {
        console.log('User not found in the users field of the event');
      }

      // Search for the user's email in the attendees collection
      const attendeesQuerySnapshot = await getDocs(query(collection(db, 'attendees'), where('Email', '==', email)));

      if (!attendeesQuerySnapshot.empty) {
        // User found in attendees collection
        const attendeeDoc = attendeesQuerySnapshot.docs[0];
        const attendeeData = attendeeDoc.data();

        // Check if the organizations object exists within the attendee's data
        if (attendeeData.organizations && attendeeData.organizations[eventId]) {
          // Delete the record associated with the eventId within the organizations object
          const updatedOrganizations = { ...attendeeData.organizations };
          delete updatedOrganizations[eventId];
          attendeeData.organizations = updatedOrganizations;

          // Update the attendee's document in the attendees collection
          await updateDoc(attendeeDoc.ref, attendeeData);
        } else {
          console.log('No organization found for the user with eventId:', eventId);
        }
      } else {
        console.log('User not found in attendees collection');
      }
    } else {
      console.log('Event not found');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};


const AddSpeakerForm = ({ eventId }) => {
  const [speakerName, setSpeakerName] = useState('');
  const [speakerDescription, setSpeakerDescription] = useState('');
  
  const handleAddSpeaker = async () => {
    try {
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        const newSpeaker = { name: speakerName, description: speakerDescription };
        const updatedSpeakers = [...(eventData.speakers || []), newSpeaker];
        await updateDoc(eventRef, { speakers: updatedSpeakers });
        setSpeakerName('');
        setSpeakerDescription('');
      } else {
        console.log('Event not found');
      }
    } catch (error) {
      console.error('Error adding speaker:', error);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={speakerName}
        onChange={(e) => setSpeakerName(e.target.value)}
        placeholder="Speaker Name"
      />
      <input
        type="text"
        value={speakerDescription}
        onChange={(e) => setSpeakerDescription(e.target.value)}
        placeholder="Speaker Description"
      />
      <AddButton onClick={handleAddSpeaker}>Add Speaker</AddButton>
    </div>
  );
};

const AddUserForm = ({ eventId }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  const handleAddUser = async (e) => {
    e.preventDefault();
  
    try {
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
  
      if (eventDoc.exists()) {
        const userData = {
          email,
          role,
          organizationStatus: 'pending' // Set organization status to pending
        };
  
        // Search for the user in the attendees collection
        const userQuerySnapshot = await getDocs(query(collection(db, 'attendees'), where('Email', '==', email)));
  
        if (!userQuerySnapshot.empty) {
          // User found in attendees collection
          // Get the attendee's data
          const attendeeData = userQuerySnapshot.docs[0].data();
  
          // Check if the organizations object exists, if not create it
          if (!attendeeData.organizations) {
            attendeeData.organizations = {};
          }
  
          // Add eventId, role, and status to the attendee's organizations object
          attendeeData.organizations[eventId] = {
            role,
            status: 'pending'
          };
  
          // Update the attendee's document in the attendees collection
          await updateDoc(doc(db, 'attendees', userQuerySnapshot.docs[0].id), attendeeData);
  
          // Add the user to the event's users field
          await updateDoc(eventRef, {
            users: {
              ...eventDoc.data().users,
              [email]: {
                role,
                status: 'pending'
              }
            }
          });
  
          // Clear input fields after adding user
          setEmail('');
          setRole('');
        } else {
          console.log('User not found in attendees collection');
        }
      } else {
        console.log('Event not found');
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };
  
  



  

  return (
    <div>
      <form onSubmit={handleAddUser}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        >
          <option value="">Select Role</option>
          <option value="Admin">Admin</option>
          <option value="TicketHandler">Ticket Handler</option>
        </select>
        <AddButton type="submit">Add User</AddButton>
      </form>
    </div>
  );
};

const editSpeaker = async (eventId, speakerId, updatedSpeaker) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventData = (await getDoc(eventRef)).data();
    
    if (eventData && eventData.speakers) {
      const updatedSpeakers = eventData.speakers.map(speaker => {
        if (speaker.id === speakerId) {
          return { ...speaker, ...updatedSpeaker };
        }
        return speaker;
      });

      await updateDoc(eventRef, { speakers: updatedSpeakers });
    } else {
      console.log('Speakers not found');
    }
  } catch (error) {
    console.error('Error editing speaker:', error);
  }
};

const deleteSpeaker = async (eventId, speakerId) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventData = (await getDoc(eventRef)).data();
    
    if (eventData && eventData.speakers) {
      const updatedSpeakers = eventData.speakers.filter(speaker => speaker.id !== speakerId);

      await updateDoc(eventRef, { speakers: updatedSpeakers });
    } else {
      console.log('Speakers not found');
    }
  } catch (error) {
    console.error('Error deleting speaker:', error);
  }
};

const EditEventPage = () => {
  const { eventId } = useParams(); // Extract the event ID from the URL
  const [eventDetails, setEventDetails] = useState(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnapshot = await getDoc(eventRef);
        if (eventSnapshot.exists()) {
          setEventDetails(eventSnapshot.data());
        } else {
          console.log('Event not found');
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
      }
    };

    fetchEventDetails();
  }, [eventId]);
   
  if (!eventDetails) {
    // Render loading indicator or return null
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <EventDetailsContainer>
        <PosterSection>
          <PosterImage src={eventDetails?.posterUrl} alt="Event Poster" />
        </PosterSection>
        <DetailsSection>
          <Title>{eventDetails?.eventName}</Title>
          <Description>{eventDetails?.eventDesc}</Description>
          <SpeakersSection>
            <SpeakersTitle>Speakers</SpeakersTitle>
            {eventDetails?.speakers?.map((speaker, index) => (
              <SpeakerItem key={index}>
                <p>{speaker.name}</p>
                <p>{speaker.description}</p>
                <EditRoleButton onClick={() => editSpeaker(eventId, speaker.id, { name: 'New Name', description: 'New Description' })}>
                  Edit Speaker
                </EditRoleButton>
                <DeleteUserButton onClick={() => deleteSpeaker(eventId, speaker.id)}>
                  Delete Speaker
                </DeleteUserButton>
              </SpeakerItem>
            ))}
             <AddSpeakerForm eventId={eventId} />
          </SpeakersSection>
          <TicketSection>
            <TicketsTitle>Tickets</TicketsTitle>
            {eventDetails?.ticketTypes && Object.values(eventDetails.ticketTypes).map((ticketType, index) => (
              <TicketItem key={index}>
                <p>Ticket Type: {ticketType.type}</p>
                <p>Price: ${ticketType.price}</p>
                <p>Available Tickets: {ticketType.numberOfTickets}</p>
              </TicketItem>
            ))}
            <AddButton>Add Ticket Type</AddButton>
          </TicketSection>
          <AddUserForm eventId={eventId}/>
          {eventDetails.users && (
            <UsersSection>
              <UsersTitle>Users</UsersTitle>
              {Object.entries(eventDetails.users).map(([email, userData]) => (
                <UserItem key={email}>
                  <p>Email: {email}</p>
                  <p>Role: {userData.role}</p>
                  <EditRoleButton>Edit Role</EditRoleButton>
                  <DeleteUserButton onClick={() => deleteUser(eventId,email)}>Delete User</DeleteUserButton>
                </UserItem>
              ))}
            </UsersSection>
          )}
        </DetailsSection>
      </EventDetailsContainer>
    </Container>
  );
};

export default EditEventPage;
