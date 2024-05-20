import React from 'react';
import ProfileCard from './ProfileCard';
import EventsTabsProfile from './EventsTabsProfile';


import styled from 'styled-components';
import { FaSearch } from 'react-icons/fa';
import Header from './Header';





const HostProfile = () => {
  return (
    <>
      <Header isHostProfilePage />

      <ProfileCard />

       <EventsTabsProfile /> 



    </>
  );
};



export default HostProfile;


