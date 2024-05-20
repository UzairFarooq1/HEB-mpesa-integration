import React from 'react';
import styled from 'styled-components';
import { getAuth, signInWithEmailAndPassword, signInWithPopup,signOut, GoogleAuthProvider, onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence  } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {db} from "../main.jsx";
import { useParams } from 'react-router-dom';


const CardContainer = styled.div`
  margin: 2%;
  margin-left: 5%;
  width: 90%;
  height: 300px;
  border: None;
  border-radius: 10px;
`;

const ImageCard = styled.div`
  width: 20%;
  height: 80%;
  margin: 1%;
  border: solid;
  margin-top: 4%;
  overflow: hidden;
  float: left;
  border-radius: 10px;
  box-shadow:  9px 9px 18px #e8e8e8,
             -9px -9px 18px #ffffff;
`;

const InfoCard = styled.div`
  width: 75%;
  height: 295px;
  overflow: hidden;
  float: right;
  border-radius: 8px;
background: #ffffff;
box-shadow:  9px 9px 18px #e8e8e8,
             -9px -9px 18px #ffffff;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const TextContainer = styled.div`
  width: 46%;
  margin: 1%;
  margin-top:2%;

  height: 270px;
  float: left;
  text-align: left;
`;

const TextContainer2 = styled.div`
  width: 46%;
  margin: 1%;
  margin-top:2%;
  height: 270px;
  float: right;
  text-align: left;
`;

const CompanyName = styled.span`
  color: gold;
  font-size: 14px;
  width: 46%;

`;

const EventDate = styled.p`
  color: #333;
  width: 46%;

`;

const TextPairContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;
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
const ProfileCard = () => {
  const [userData, setUserData] = useState(null);
  const { userId } = useParams();
  const auth = getAuth();
  setPersistence(auth, browserLocalPersistence);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Checking sessions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // console.log('User is signed in:', user.uid);

      } else {
        // console.log('User is signed out');

      }
    });

    return () => unsubscribe();
  }, [auth]); 

  // Fetching data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        // Check if the user is authenticated
        if (auth.currentUser) {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const userSnapshot = await getDoc(userDocRef);

          if (userSnapshot.exists()) {
            setUserData(userSnapshot.data());
          }
        } else {
          // If not authenticated, fetch public profile based on userId
          const publicUserDocRef = doc(db, 'users', userId);
          const publicUserSnapshot = await getDoc(publicUserDocRef);

          if (publicUserSnapshot.exists()) {
            setUserData(publicUserSnapshot.data());
          }
        }
      } catch (error) {
        console.error('Error fetching user data.', error);
      }finally {
        setIsLoading(false); // Set loading to false when data fetch completes
      }
    };

    // Fetch user data when the component mounts
    fetchUserData();
  }, [auth.currentUser, userId]);
  if (isLoading) {
    return <Loader />;
  }
  return (
    <CardContainer>
      <ImageCard>
        <Image src='/assets/images/carousel1.jpg' alt="Event 1" />
      </ImageCard>
      <InfoCard>
      <TextContainer>
          <TextPairContainer>
            <CompanyName>Company Name:</CompanyName>
            <EventDate>{userData?.Company || 'N/A'}</EventDate>
          </TextPairContainer>
          <TextPairContainer>
            <CompanyName>Email:</CompanyName>
            <EventDate>{userData?.email || 'N/A'}</EventDate>
          </TextPairContainer>
          <TextPairContainer>
            <CompanyName>Phone Number:</CompanyName>
            <EventDate>{userData?.Contact || 'N/A'}</EventDate>
          </TextPairContainer>
        </TextContainer>
      </InfoCard>
    </CardContainer>
  );
};

export default ProfileCard;


