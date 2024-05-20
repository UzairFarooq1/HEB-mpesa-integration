import React  from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { getDoc, doc } from 'firebase/firestore';


const ResetForm = styled.div`
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


const ResetHeader = styled.h2`
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



const PasswordReset = () =>{

  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
  
    // Check if e.target.email exists before accessing its value
    const emailInput = e.target.email;
    if (!emailInput) {
      console.error('Email input not found.');
      return;
    }
  
    const emailVal = emailInput.value;
    const auth = getAuth();
  
    try {

      await sendPasswordResetEmail(auth, emailVal);
      console.log('Check your inbox for a password reset link!');
      navigate("/login");
    } catch (error) {
      alert(error.message);
    }
  };
  
  

  return (
    <>
    <Header />
    <ResetForm>
      <ResetHeader>Password Reset</ResetHeader>
      <form onSubmit={(e)=> handleReset(e)}>
      <Label>Email:</Label>
      <Input type="email" name= "email" placeholder="Enter your Email Address" />

      <br />
      <Button>Reset</Button>
      </form>
      <br />
    </ResetForm>
    
    </>
  );
}

export default PasswordReset;
