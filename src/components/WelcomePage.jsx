import React, { useState } from 'react';
import Header from './Header';
import Carousel from './Caurosel';
import EventCard from './EventCard';
import styled, { keyframes } from 'styled-components';
import { FaSearch } from 'react-icons/fa';

// Keyframes for the slide-up animation
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

// Styled components for the search bar
const SearchBarContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  animation: ${slideUpAnimation} 1s ease-out;
`;

const SearchIcon = styled(FaSearch)`
  font-size: 24px;
  color: #333;
  margin-right: 8px;
`;

const SearchInput = styled.input`
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 5px;
`;

const EventSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  animation: ${slideUpAnimation} 1s ease-out;
`;

const WelcomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  return (
    <>
      <Header />
      {/* Add the SearchBar component */}
      <SearchBarContainer>
        <SearchIcon style={{ cursor: 'pointer' }} />
        <SearchInput
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </SearchBarContainer>
      {!searchQuery && <Carousel />}
      {!searchQuery && (
        <hr
          style={{
            border: '0',
            height: '1px',
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0)',
          }}
      />
      )}
      <EventSection>
        <EventCard searchQuery={searchQuery} />
      </EventSection>
    </>
  );
};

export default WelcomePage;
