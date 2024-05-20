import React, { useState, useEffect } from 'react';
import Header from './Header';
import { getAuth,signOut,onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { getDocs, collection, where, query, getFirestore,doc, setDoc} from 'firebase/firestore'




// Styled components
const SignUpForm = styled.div`
  max-width: 400px;
  margin: auto;
  margin-top: 50px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-top : 3px solid #fed700;

`;

const SignUpHeader = styled.h2`
  color: gold;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
`;

const Input = styled.input`
width: 90%;
height: 42px;
outline: none;
border: 1px solid rgba(200, 200, 200, 0.3);
border-radius: 5px;
padding: 0px 10px;
transition: all 200ms ease-in-out;
margin-bottom: 10px;

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
background: linear-gradient(
  58deg, rgba(243,172,18,1) 20%, rgba(241,196,15,1) 100%
);

&:hover {
  filter: brightness(1.03);
}
ali
`;

const AttendeeSignUp = () => {
  const navigate = useNavigate()
  const db = getFirestore()
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contacts, setContacts] = useState('');

  
  const handleSignUp = async () => {
    try {
      // Check if any field is left blank
      if (!email || !password || !firstName || !lastName || !contacts) {
        alert('Please fill in all fields.');
        return;
      }
  
      // Check if the email already exists
      const existingHost = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
      if (existingHost.size > 0) {
        alert('Email already exists. Please use a different email address.');
        return;
      }

      const existingAttendee = await getDocs(query(collection(db, 'attendees'), where('Email', '==', email)));
      if (existingAttendee.size > 0) {
        alert('Email already exists. Please use a different email address.');
        return;
      }

    // Enforce a strong password policy (at least 8 characters, contains a capital letter, and a special symbol)
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      alert('Password must be at least 8 characters long, contain a capital letter and a special symbol.');
      return;
    }

    if (contacts.length < 10) {
      alert("Please input a valid contact");
      return;
    }
  
  
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      await sendEmailVerification(user);
  
      // Save additional user information to Firebase
      const userDocRef = doc(db, 'attendees', user.uid);
      await setDoc(userDocRef, {
        
        Email: email,
        FirstName: firstName,
        LastName: lastName,
        Contact: contacts,
        userType: "attendee"
      });
  
      console.log("Document written with ID: ", userDocRef.id);
  
      alert('Signup Success');
      alert('An email verification link has been sent to your email. kindly verify your email!')
      console.log('Success');
      await signOut(auth);
      navigate('../login');
    } catch (error) {
      console.error('Sign-up failed:', error.message);
    }
  };
  


  return (
    <>
    <Header />
    <SignUpForm>
      <SignUpHeader>Sign Up</SignUpHeader>
      <Label>First Name:</Label>
      <Input type="text" placeholder='Enter First Name' value={firstName} onChange={(e) => setFirstName(e.target.value)} />

      <Label>Last Name:</Label>
      <Input type="text" placeholder='Enter Last Name' value={lastName} onChange={(e) => setLastName(e.target.value)} />

      <Label>Email:</Label>
      <Input type="email" placeholder='Enter Email Address' value={email} onChange={(e) => setEmail(e.target.value)} />

      <Label>Password:</Label>
      <Input style={{marginBottom : '0px'}} type="password" placeholder='Enter Password' value={password} onChange={(e) => setPassword(e.target.value)} />

        <small style={{fontWeight: 'lighter', fontFamily:'"Times New Roman", Times, serif', color : 'GrayText'}}>Password should contain: 
          <ul style={{marginTop : '0px'}}>
          <li>At least 8 characters</li>
          <li>A capital letter</li>
          <li>A special symbol</li>
          </ul>
          </small>
      
      <Label>Contacts:</Label>
      <Input type="text" placeholder='07********' value={contacts} onChange={(e) => setContacts(e.target.value)} />

      <br />
      <br />
      <Button onClick={handleSignUp}>Sign Up</Button>
      <br />
      Already have an account?<Link to="/login">Log in</Link>

    </SignUpForm>
    </>
  );
};

export default AttendeeSignUp;
