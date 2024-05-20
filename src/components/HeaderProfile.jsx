import React from 'react';
import  { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaSearch } from 'react-icons/fa';
import { RxAvatar } from "react-icons/rx";
import { useNavigate } from 'react-router-dom'; // Import the useNavigate hook
import { getAuth, signInWithEmailAndPassword, signInWithPopup,signOut, GoogleAuthProvider, onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence  } from 'firebase/auth';
  import Popup from 'reactjs-popup';
  import { getDoc, doc, getFirestore } from 'firebase/firestore';


// Styled components
const HeaderContainer = styled.div`
  background-color: white;
  margin:-1%;
  display: flex;
  flex-direction: column;
  padding: 10px 20px;
  border-bottom: 1px solid #ccc;
`;

const CompanyName = styled.span`
  color: gold;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
  float:left;
  
`;
const LabelName = styled.span`
  color: black;
  font-size: 18px;
  font-weight: bold;
  margin-top: 10px;

`;
const Question = styled.span`
  font-size: 18px;
  margin-bottom: 10px;
  float:left;
`;

const Button = styled.button`
  padding: 8px 16px;
  margin: 0 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const LogoutButton = styled(Button)`
  color: white;
  background-color: gold;
  margin-bottom: 10px;
  float:right;
`;
const HomeButton = styled(Button)`
  color: gold;
  background-color: white;
  margin-bottom: 10px;
  border:None;
  font-size: 30px;
  font-weight: bold;
`;
const LoginButton = styled(Button)`
  color: white;
  background-color: gold;
  margin-bottom: 10px;
`;
const SignUpButton = styled(Button)`
  color: gold;
  background-color: white;
  border: 1px solid gold;
`;
const ProfileButton = styled(Button)`
  color: white;
  margin-top: -1px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-left:70px;
  float:right;
  &:hover {
    content: "Profile";

  }
`;
const ProfileIconButton = styled(Button)`
  color: white;
  margin-bottom: 10px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  
  }
`;
const EventButton = styled(Button)`
  color: white;
  background-color: Gold;
  margin-bottom: 10px;
  margin-left: 30px;
`;
// Styled components for the search bar
const SearchBarContainer = styled.div`
  display: flex;
  width:70%;
  align-items: center;
  justify-content: center;
  float: right;
`;

const SearchIcon = styled(FaSearch)`
  font-size: 24px;
  color: #333;
  margin-right: 4px;
`;
const ProfileIcon = styled(RxAvatar)`
  font-size: 20px;
  color: #333;
`;
const SearchInput = styled.input`
  padding: 4px;
  width:100%;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 5px;
  height:30px;
`;


// Header component
const HeaderProfile = () => {
  const googleProvider= new GoogleAuthProvider();
  const navigate = useNavigate(); 
  const auth = getAuth();
  setPersistence(auth, browserLocalPersistence);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProfilePopupOpen, setProfilePopupOpen] = useState(false);
  const [userName, setUserName] = useState(null); // Add this line

  useEffect(() => {
    const fetchData = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);

        if (user) {
          // console.log('User is signed in:', user.uid);

          // Fetch user data from Firestore
          const firestore = getFirestore();
          const userDocRef = doc(firestore, 'users', user.uid);

          try {
            const userDocSnapshot = await getDoc(userDocRef);

            if (userDocSnapshot.exists()) {
              const userData = userDocSnapshot.data();
              // Set the user's name in the state
              setUserName(userData.Company);
            } else {
              console.warn('User document does not exist');
            }
          } catch (error) {
            console.error('Error fetching user data:', error.message);
          }

        } else {
          // console.log('User is signed out');
        }
      });

      return () => unsubscribe();
    };

    fetchData();
  }, [auth, setUserName]);

  const handleLogoutClick = async () =>{
    try{
      await signOut(auth);
      setUserName(null);
      navigate('/');

    }catch (error) {
      console.error('Logout failed:', error.message);
    }

  };

  const handleEventClick = () => {
    navigate('/Event Registration'); 
  }

  const handleProfileClick = () => {
    navigate('/'); 
  };
  const handleLoginClick = () => {
    navigate('/login'); 
  };
  const handleIconProfileClick = () => {
    navigate('/My Profile'); 
  };

  const handleSignUpClick = () => {
    navigate('/signup'); 
  };

// Popup
const openProfilePopup = () => {
  setProfilePopupOpen(true);
};

const closeProfilePopup = () => {
  setProfilePopupOpen(false);
};

const renderProfilePopupContent = () => (
  <div>
    <div style={{ margin: '30px ', width:'100%', display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border:'None',
          marginLeft:'-2px',
          flexDirection: 'column',
          height:'120px' }}>
         {currentUser && (
            <ProfileIconButton onClick={handleIconProfileClick}>
              <ProfileIcon style={{ fontSize: '40px', color: 'gold' }} />
            </ProfileIconButton>
          )}
       <LabelName style={{ marginLeft:'-5px', color: 'black' }} >{userName || 'Guest'}</LabelName>

    </div>
    <div>
    {currentUser ? (
        <LogoutButton onClick={handleLogoutClick} style={{width:'60%',marginLeft:'10%'  }} >Log Out</LogoutButton>
      ) : (
        <>
          <SignUpButton onClick={handleSignUpClick}>Sign Up</SignUpButton>
          <LoginButton onClick={handleLoginClick}>Login</LoginButton>
        </>
      )}
    </div>
  </div>
);
  return (
    <HeaderContainer>
      <div>
        {/* <CompanyName>HalalEventBrite</CompanyName> */}
        <HomeButton onClick={handleProfileClick}>HalalEventBrite</HomeButton>
          <SearchBarContainer>
            <SearchInput type="text" placeholder=" Search events..." ></SearchInput>
            <ProfileButton onClick={openProfilePopup}>
            <ProfileIcon />
          </ProfileButton>
          <Popup
            open={isProfilePopupOpen}
            onClose={closeProfilePopup}
            arrow={false}
            position="bottom center"
            offset={[0, 10]} 
            contentStyle={{ background: 'white', padding: '10px', border: '1px solid #ccc',borderRadius:'10px', justifyContent: 'center', alignItems: 'center',  backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
            overlayStyle={{ background: 'rgba(0, 0, 0, 0.5)' }}
            closeOnDocumentClick
          >
            {renderProfilePopupContent()}
          </Popup>
          </SearchBarContainer>
      </div>
      <div>
      

      {currentUser ? (
          <>
            {/* <LogoutButton onClick={handleLogoutClick}>Logout</LogoutButton> */}
            <EventButton onClick={handleEventClick}>Create Event</EventButton>
          </>
        ) : null}
      </div>
    </HeaderContainer>
  );
};

export default HeaderProfile;


