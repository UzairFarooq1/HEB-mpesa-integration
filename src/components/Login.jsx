import React, { useState, useEffect } from 'react';
import { getAuth,signOut, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import Header from './Header';
import { getDocs, collection, where, query,getDoc, getFirestore, doc, setDoc} from 'firebase/firestore'



const LoginForm = styled.div`
  max-width: 400px;
  margin: auto;
  margin-top: 50px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-top: 3px solid #fed700;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
`;

const RoleDropdown = styled.select`
  width: 100%;
  height: 42px;
  outline: none;
  border: 1px solid rgba(200, 200, 200, 0.3);
  border-radius: 5px;
  padding: 0px 10px;
  transition: all 200ms ease-in-out;
  margin-bottom: 10px;
  font : cursive;

  &:focus {
    outline: none;
    border-bottom: 1px solid rgba(241, 196, 15, 1);
  }
`;

const LoginHeader = styled.h2`
  color: gold;
`;

const Input = styled.input`
  width: 90%;
  height: 42px;
  outline: none;
  border: 1px solid rgba(200, 200, 200, 0.3);
  border-radius: 5px;
  padding: 0px 10px;
  transition: all 200ms ease-in-out;
  margin-bottom: 5px;

  &::placeholder {
    color: rgba(200, 200, 200, 1);
  }

  &:focus {
    outline: none;
    border-bottom: 1px solid rgba(241, 196, 15, 1);
  }
`;


const Button = styled.button`
  width: 100%;
  max-width: 150px;
  padding: 10px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  transition: all 240ms ease-in-out;
  background: linear-gradient(58deg, rgba(243, 172, 18, 1) 20%, rgba(241, 196, 15, 1) 100%);

  &:hover {
    filter: brightness(1.03);
  }
`;

const Alert = styled.div`
  background-color: #f44336;
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 16px;
`;

const Login = () => {
  const [role, setRole] = useState('attendee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [hostAlert, sethostAlert] = useState(false);
  const [attendeeAlert, setattendeeAlert] = useState(false);

  const navigate = useNavigate();


  const handleLogin = async () => {
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const db = getFirestore()

      

      if (user.emailVerified) {
        // Check the role selected in the dropdown
        if (role === 'host') {
          // Check if the user is a host based on Firestore data
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnapshot = await getDoc(userDocRef);
  
          if (userDocSnapshot.exists()) {
            // User is a host, allow login
            console.log('Login successful! User is a host.');
            navigate('/My Profile');
          } else {
            // User is not a host, show an alert
            console.log('Login failed! User is not a host. Try Logging in as an attendee');
            sethostAlert(true);
            await signOut(auth);
          }
        } if(role === 'attendee') {

          const userDocRef = doc(db, 'attendees', user.uid);
          const userDocSnapshot = await getDoc(userDocRef);
  
          if (userDocSnapshot.exists()) {
            // User is a host, allow login
            console.log('Login successful! User is a Attendee.');
            navigate('/');
          } else {
            // User is not a host, show an alert
            console.log('Login failed! User is not a Attendee. Try Logging in as Host');
            setattendeeAlert(true);
            await signOut(auth);


          }
        }
      } else {
        // Email is not verified, show an alert
        console.log('Login failed! Email not verified.');
        setShowAlert(true);
        await signOut(auth);
      }
    } catch (error) {
      console.error('Login failed:', error.message);
      alert('Incorrect username or password');
    }
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    setattendeeAlert(false);
    sethostAlert(false);
  };

  return (
    <>
    <Header />
    <LoginForm>
      <LoginHeader>Login</LoginHeader>
      {showAlert && (
        <Alert>
          Your email is not verified. Please check your email and verify your account.
          <span onClick={handleAlertClose} style={{ cursor: 'pointer', float: 'right' }}>
            &times;
          </span>
        </Alert>
      )}
      {hostAlert && (
        <Alert>
          Login failed! User is not a host.
          <span onClick={handleAlertClose} style={{ cursor: 'pointer', float: 'right' }}>
            &times;
          </span>
        </Alert>
      )}
        {attendeeAlert && (
        <Alert>
          Login failed! User is not a attendee.
          <span onClick={handleAlertClose} style={{ cursor: 'pointer', float: 'right' }}>
            &times;
          </span>
        </Alert>
      )}
      <Label>Role :</Label>
      <RoleDropdown style={{fontFamily : 'inherit'}} value={role} onChange={(e) => setRole(e.target.value)}>
          <option style={{fontFamily: 'cursive'}} value="attendee">Attendee</option>
          <option style={{fontFamily: 'cursive'}} value="host">Host</option>
      </RoleDropdown>
      <Label>Email:</Label>
      <Input type="email" placeholder="Enter Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />

      <Label>Password:</Label>
      <Input type="password" placeholder="Enter Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <br />
      <br />
      <Button onClick={handleLogin}>Login</Button>
      <br />
      <Link style={{textDecoration: 'none', color: 'black'}} to="/passwordreset">Forgot Password? </Link>
      <br />
      Don't have an account?<Link to="/signup">Sign up</Link>
    </LoginForm>
    
    </>
  );
};

export default Login;
