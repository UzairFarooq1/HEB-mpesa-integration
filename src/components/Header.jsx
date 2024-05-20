import { Button } from "@/components/ui/button"
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Styled components
const HeaderContainer = styled.div`
  background-color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ccc;
`;

const CompanyInfo = styled.div`
  display: flex;
  align-items: center;
`;

const CompanyName = styled.span`
  color: gold;
  font-size: 24px;
  font-weight: bold;
  margin-right: 20px;
`;

const Question = styled.span`
  font-size: 18px;
  margin-bottom: 10px;
  max-width : 200px
`;


const Dropdown = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownContent = styled.div`
  display: none;
  position: absolute;
  background-color: #f9f9f9;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 1;

  ${Dropdown}:hover & {
    display: block;
  }
`;

const DropdownOption = styled.div`
  padding: 12px 16px;
  text-decoration: none;
  display: block;
  color: #333;
  cursor: pointer;

  &:hover {
    background-color: #ddd;
  }
`;
const LoginButton = styled.button`
  color: white;
  background-color: gold;
  margin-bottom: 10px;
`;

const EventButton = styled(Button)`
  color: white;
  background-color: gold;
  margin-bottom: 10px;
`;
const Profile = styled(Button)`
  color: white;
  background-color: gold;
  margin-bottom: 10px;
`;

const SignUpButton = styled(Button)`
  color: gold;
  background-color: white;
  border: 1px solid gold;
`;
const LogoutButton = styled(Button)`
  color: white;
  background-color: #333;
  margin-right: 10px;
`;

const LoaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 1);
  z-index: 999;
`;

const Spinner = styled.div`
width: 40px;
height: 40px;
background-color: gold;
border-radius: 50%;
animation: bounce 1s infinite;

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-20px);
  }
  60% {
    transform: translateY(-10px);
  }
}
`;

const Header = ({ isHostProfilePage }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [firstName, setFirstName] = useState(null);
  const [lastName, setLastName] = useState(null);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const fetchData = async () => {
      const auth = getAuth();
      try {
        // Set loading to true while fetching data
        setLoading(true);
  
        // Create a Promise to wait for onAuthStateChanged to complete
        const user = await new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            // Resolve the Promise with the user once the state has changed
            resolve(user);
            // Unsubscribe to avoid memory leaks
            unsubscribe();
          });
        });
  
        if (user) {
          setUser(user);
  
          const userDocRef1 = doc(db, 'attendees', user.uid);
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnapshot = await getDoc(userDocRef);
          const userDocSnapshot1 = await getDoc(userDocRef1);
  
          if (userDocSnapshot && userDocSnapshot.exists()) {
            setCompanyName(userDocSnapshot.data().Company);
          } else if (userDocSnapshot1 && userDocSnapshot1.exists()) {
            setFirstName(userDocSnapshot1.data().FirstName);
            setLastName(userDocSnapshot1.data().LastName);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [db, user]);

  const handleLoginClick = () => {
    navigate('/login');
  };


  const handleHostSignUpClick = () => {
    // Redirect to the host login page
    navigate('/signup');
  };

  const handleAttendeeSignUpClick = () => {
    // Redirect to the event attendee login page
    navigate('/attendeesignup');
  };

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    navigate('./')
    window.location.reload();
  };

  const handleevent = async () => {
    navigate('/Event Registration');
  };

  const handleprofile = async () => {
    navigate('/My Profile');
  };

  return (
    <>
      <HeaderContainer>
        <CompanyInfo>
          <CompanyName>
            <a
              style={{
                color: 'gold',
                fontSize: '24px',
                fontWeight: 'bold',
                marginRight: '20px',
              }}
              href="../"
            >
              Halal EventBrite{' '}
            </a>{' '}
          </CompanyName>
          {!loading && user && (
            <>
              <Question style={{ marginLeft: '10px', marginTop: '10px' }}>
                Welcome, {companyName || firstName + ' ' + lastName}!
              </Question>
            </>
          )}
        </CompanyInfo>
        {loading ? (
          <LoaderContainer>
            <Spinner />
          </LoaderContainer>
        ) : user ? (
          <div style={{ marginLeft: 'auto' }}>
            {companyName ? (
              // Render only Logout button if the user exists in the attendee database
              <>
                <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
                {isHostProfilePage && <EventButton onClick={handleevent}>Create an Event</EventButton>}
                {isHostProfilePage || <Profile onClick={handleprofile}>View Profile</Profile>}
              </>
            ) : (
              // Render both Create Event and Logout buttons if the user exists in the users database
              <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
            )}
          </div>
        ) : (
          <div>
            <Dropdown>
              <SignUpButton>Sign Up</SignUpButton>
              <DropdownContent>
                <DropdownOption onClick={handleHostSignUpClick}>Sign Up as Host</DropdownOption>
                <DropdownOption onClick={handleAttendeeSignUpClick}>Sign Up as Attendee</DropdownOption>
              </DropdownContent>
            </Dropdown>
            <LoginButton onClick={handleLoginClick}>Log in</LoginButton>
          </div>
        )}
      </HeaderContainer>
    </>
  );
};

export default Header;
