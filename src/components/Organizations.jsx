import React, { useState, useEffect } from 'react';
import Header from './Header';
import styled, { keyframes } from 'styled-components';
import { FaSearch } from 'react-icons/fa';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../main.jsx';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Define keyframes for animation
const slideUpAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled components for search bar
const SearchBarContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  animation: ${slideUpAnimation} 1s ease-out;
  margin-bottom: 30px;
`;

const SearchIcon = styled(FaSearch)`
  font-size: 24px;
  color: orange;
  margin-right: 8px;
`;

const SearchInput = styled.input`
  padding: 10px;
  font-size: 16px;
  border: 1px solid orange;
  border-radius: 5px;
`;

// Styled components for tabs
const TabsContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
`;

const Tab = styled.div`
  padding: 10px 20px;
  background-color: ${(props) => (props.active ? 'orange' : 'transparent')};
  color: ${(props) => (props.active ? '#fff' : '#333')};
  border-radius: 5px;
  cursor: pointer;
  margin-right: 10px;
`;

// Styled components for organization cards
const OrganizationCard = styled.div`
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 20px;
  margin-bottom: 20px;
`;

const Organizations = () => {
  const [activeTab, setActiveTab] = useState('joined');
  const [organizations, setOrganizations] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const auth = getAuth();
      onAuthStateChanged(auth, (user) => {
        if (user) {
          setUserId(user.uid);
        }
      });
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        if (!userId) return; // Return if userId is not available
  
        // Query the attendees collection based on the userId
        const q = query(collection(db, 'attendees'), where('userId', '==', userId));
        const attendeeQuerySnapshot = await getDocs(q);
  
        // Extract organization details from the first document found
        const attendeeDoc = attendeeQuerySnapshot.docs[0];
        if (attendeeDoc.exists()) {
          const data = attendeeDoc.data();
          const organizations = data.organizations;
  
          // Convert organizations map to an array of objects
          const orgs = Object.keys(organizations).map(eventId => ({
            eventId,
            role: organizations[eventId].role,
            status: organizations[eventId].status
            // Add other organization details if needed
          }));
  
          setOrganizations(orgs);
        } else {
          console.log('No matching attendee document found for userId:', userId);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };
  
    fetchOrganizations();
  }, [userId]);
  

  return (
    <>
      <Header />
      <div>
        <h2>Organizations</h2>

        {/* Search bar */}
        <SearchBarContainer>
          <SearchIcon />
          <SearchInput />
        </SearchBarContainer>

        {/* Tabs */}
        <TabsContainer>
          <Tab active={activeTab === 'joined'} onClick={() => handleTabChange('joined')}>
            Joined Organizations
          </Tab>
          <Tab active={activeTab === 'pending'} onClick={() => handleTabChange('pending')}>
            Pending Requests
          </Tab>
        </TabsContainer>

        {/* Organization cards */}
        {activeTab === 'joined' && (
          <div>
            {organizations.map((org) => (
              <OrganizationCard key={org.id}>
                <h3>{org.id}</h3>
                <p>Email: {org.Email}</p>
                {/* Add other organization details here */}
              </OrganizationCard>
            ))}
          </div>
        )}

        {activeTab === 'pending' && (
          <div>
            {organizations.map((org) => (
              <OrganizationCard key={org.id}>
                <h3>{org.id}</h3>
                <p>Email: {org.Email}</p>
                {/* Add other organization details here */}
              </OrganizationCard>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Organizations;
