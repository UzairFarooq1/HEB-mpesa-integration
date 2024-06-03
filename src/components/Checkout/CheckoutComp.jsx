import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  deleteDoc,
  collection,
} from "firebase/firestore";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { IoIosArrowRoundBack } from "react-icons/io";
import "./checkoutstyle.css"; // Import the CSS file

let mpesaReceipt;
let eventName;
let hostId;

const CheckoutComp = ({ pendingTickets }) => {
  const [promoCode, setPromoCode] = useState("");
  const [formData, setFormData] = useState([]);
  const [expiredTickets, setExpiredTickets] = useState([]);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkPendingTickets = async () => {
      try {
        pendingTickets.forEach(async (ticket) => {
          const eventId = ticket.eventId; // Extract eventId from the pending ticket
          const db = getFirestore();
          const eventRef = doc(db, "events", eventId);
          const eventSnap = await getDoc(eventRef);
          const eventDoc = eventSnap.data();

          if (eventDoc && eventDoc.pendingTickets) {
            const pendingTicketIds = Object.keys(eventDoc.pendingTickets);
            const existingTickets = await Promise.all(
              pendingTicketIds.map(async (ticketId) => {
                const ticketDoc = doc(
                  db,
                  "events",
                  eventId,
                  "pendingTickets",
                  ticketId
                );
                const ticketSnap = await getDoc(ticketDoc);
                return ticketSnap.exists();
              })
            );

            // Check if any pending tickets no longer exist and handle accordingly
            const ticketsExist = existingTickets.every(
              (ticketExists) => ticketExists
            );
            if (!ticketsExist) {
              // Handle case where some pending tickets do not exist
              console.log("Some pending tickets have expired");
              // Set the expired tickets
              setExpiredTickets(
                pendingTickets.filter(
                  (ticket) => !existingTickets.includes(ticket.id)
                )
              );
              // Display message to user and prompt to choose tickets again
              // Display alert to user
              alert(
                "Your pending tickets have expired. You will be redirected to the Event Details page."
              );
              // Redirect user to EventDetails page after 3 seconds
              setTimeout(() => {
                navigate(`/event/${eventId}`);
              }, 3000);
            }
          }
        });
      } catch (error) {
        console.error("Error checking pending tickets:", error);
      }
    };

    // Check pending tickets when component mounts
    checkPendingTickets();

    // Check pending tickets every 5 seconds
    const interval = setInterval(checkPendingTickets, 5000);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [pendingTickets, navigate]);

  const handleInputChange = (index, field, value) => {
    const updatedFormData = [...formData];
    updatedFormData[index] = { ...updatedFormData[index], [field]: value };
    setFormData(updatedFormData);
  };

  const handleCompletePayment = async () => {
    try {
      const db = getFirestore();

      // Fetch event details and map to formDataArray
      const formDataArray = await Promise.all(
        pendingTickets.map(async (ticket, index) => {
          const eventRef = doc(db, "events", ticket.eventId);
          const eventSnapshot = await getDoc(eventRef);

          if (!eventSnapshot.exists()) {
            throw new Error(`Event with ID ${ticket.eventId} not found`);
          }

          const eventData = eventSnapshot.data();
          hostId = eventData.userId || "";
          eventName = eventData.eventName || "";
          return {
            email: formData[index]?.email || "",
            phone_number: formData[index]?.phone_number || "",
            gender: formData[index]?.gender || "",
            full_name: formData[index]?.full_name || "",
            type: ticket.type,
            amount: ticket.price,
            eventDesc: eventName,
          };
        })
      );

      // Calculate total amount for all tickets
      const totalAmount = pendingTickets.reduce((total, ticket) => total + ticket.price, 0);

      setIsPaymentProcessing(true);
      setPaymentFailed(false);

      // Send a single payment request
      const phone = formData[0]?.phone_number;
      const response = await fetch(
        "https://mpesa-backend-api.vercel.app/api/stkpush",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: phone,
            amount: totalAmount,
            event: eventName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to initiate payment");
      }

      // Show the "Confirm Payment" button
      setShowConfirmPayment(true);
    } catch (error) {
      console.error("Error completing payment:", error);
      setPaymentFailed(true);
      setTimeout(() => {
        navigate(`/event/${pendingTickets[0].eventId}`);
      }, 3000);
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setIsPaymentProcessing(true);
      const startTime = Date.now();
      let ticketPaid = false;
      const maxTimeout = 20000; // 20 seconds timeout

      while (Date.now() - startTime < maxTimeout) {
        const paymentStatusResponse = await fetch("https://mpesa-backend-api.vercel.app/paymentStatus");
        if (!paymentStatusResponse.ok) {
          console.error("Failed to fetch payment status");
          throw new Error("Failed to fetch payment status");
        }
        const data = await paymentStatusResponse.json();
        if (data.message === 'Successful Payment') {
          mpesaReceipt = data.mpesaReceipt;
          ticketPaid = true;
          break; // Exit the loop if payment is successful
        } else {
          console.log("Waiting for payment...");
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
        }
      }

      if (ticketPaid) {
        const db = getFirestore();
        await Promise.all(
          pendingTickets.map(async (ticket, index) => {
            // Check if the ticket is still pending
            const ticketRef = doc(
              db,
              "events",
              ticket.eventId,
              "pendingTickets",
              ticket.ticketId
            );
            const ticketSnapshot = await getDoc(ticketRef);

            if (!ticketSnapshot.exists()) {
              // If the ticket does not exist in the pendingTickets collection, show an alert and redirect to the event page
              alert("The timeout for this ticket has expired. You will be redirected to the Event Details page.");
              navigate(`/event/${ticket.eventId}`);
              return; // Skip processing this ticket
            }

            // Proceed with registering the ticket
            const ticketData = {
              ...formData[index],
              price: ticket.price,
              ticketId: ticket.ticketId,
              mpesaReceiptNumber: mpesaReceipt,
              type: ticket.type,
              eventId: ticket.eventId,
              host: hostId,
              used: false,
              validOn: ticket.validOn,
            };

            const ticketRef1 = doc(db, "events", ticket.eventId, "tickets", ticket.ticketId); // Set the document ID here
            await setDoc(ticketRef1, ticketData);
            await deleteDoc(ticketRef);
          })
        );

        // Update formDataArray with mpesaReceipt and send email
        await Promise.all(
          pendingTickets.map(async (ticket, index) => {
            const updatedFormDataArray = formDataArray.map((data) => ({
              ...data,
              ticketId: ticket.ticketId,
              mpesaReceipt: mpesaReceipt, // Add mpesaReceipt to each entry
            }));
            const formData = updatedFormDataArray[index];

            await fetch("https://email-server-flax.vercel.app/send-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(formData), // Include eventDesc and mpesaReceipt in the data sent to the server
            });
          })
        );

        setIsPaymentProcessing(false);
        setIsPaymentConfirmed(true);
        setTimeout(() => {
          navigate("/");
        }, 3000);
        setFormData([]); // Reset form data
      } else {
        setPaymentFailed(true);
        setTimeout(() => {
          navigate(`/event/${pendingTickets[0].eventId}`);
        }, 3000);
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      setPaymentFailed(true);
      setTimeout(() => {
        navigate(`/event/${pendingTickets[0].eventId}`);
      }, 3000);
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleGoBack = () => {
    const eventId = pendingTickets[0]?.eventId; // Ensure pendingTickets array is not empty
    if (eventId) {
      navigate(`/event/${eventId}`);
    }
  };

  return (
    <Wrapper>
      <BackButton onClick={handleGoBack}>
        <IoIosArrowRoundBack />
        <span>Go back</span>
      </BackButton>
      {expiredTickets.length > 0 ? (
        <ExpiredTicketsContainer>
          <h2>Expired Tickets</h2>
          {expiredTickets.map((ticket) => (
            <ExpiredTicket key={ticket.id}>
              <p>Ticket ID: {ticket.id}</p>
              <p>Event: {ticket.eventName}</p>
              <p>Type: {ticket.type}</p>
            </ExpiredTicket>
          ))}
        </ExpiredTicketsContainer>
      ) : (
        <FormContainer>
          {pendingTickets.map((ticket, index) => (
            <div key={index}>
              <h2>Ticket {index + 1}</h2>
              <FormField>
                <Label>Email:</Label>
                <Input
                  type="email"
                  value={formData[index]?.email || ""}
                  onChange={(e) =>
                    handleInputChange(index, "email", e.target.value)
                  }
                />
              </FormField>
              <FormField>
                <Label>Phone Number:</Label>
                <Input
                  type="tel"
                  value={formData[index]?.phone_number || ""}
                  onChange={(e) =>
                    handleInputChange(index, "phone_number", e.target.value)
                  }
                />
              </FormField>
              <FormField>
                <Label>Gender:</Label>
                <Select
                  value={formData[index]?.gender || ""}
                  onChange={(e) =>
                    handleInputChange(index, "gender", e.target.value)
                  }
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
              </FormField>
              <FormField>
                <Label>Full Name:</Label>
                <Input
                  type="text"
                  value={formData[index]?.full_name || ""}
                  onChange={(e) =>
                    handleInputChange(index, "full_name", e.target.value)
                  }
                />
              </FormField>
            </div>
          ))}
          <PromoCodeContainer>
            <Label>Promo Code:</Label>
            <PromoCodeInput
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
            />
            <ApplyButton onClick={() => { /* Handle promo code application */ }}>
              Apply
            </ApplyButton>
          </PromoCodeContainer>
          <SubmitButton onClick={handleCompletePayment}>
            Complete Payment
          </SubmitButton>
          {isPaymentProcessing && (
            <ProcessingContainer>
              <ProcessingMessage>Processing payment...</ProcessingMessage>
              <Loader />
            </ProcessingContainer>
          )}
          {showConfirmPayment && (
            <ConfirmPaymentButton onClick={handleConfirmPayment}>
              Confirm Payment
            </ConfirmPaymentButton>
          )}
          {paymentFailed && (
            <ErrorContainer>
              <ErrorMessage>
                Payment failed. You will be redirected back to the event page.
              </ErrorMessage>
            </ErrorContainer>
          )}
          {isPaymentConfirmed && (
            <SuccessContainer>
              <SuccessMessage>Payment Successful!</SuccessMessage>
            </SuccessContainer>
          )}
        </FormContainer>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  padding: 20px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;

  &:hover {
    background-color: #0056b3;
  }

  span {
    margin-left: 5px;
  }
`;

const ExpiredTicketsContainer = styled.div`
  padding: 20px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 5px;
`;

const ExpiredTicket = styled.div`
  margin-bottom: 10px;
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: bold;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
`;

const PromoCodeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PromoCodeInput = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  flex: 1;
`;

const ApplyButton = styled.button`
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;

  &:hover {
    background-color: #218838;
  }
`;

const SubmitButton = styled.button`
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;

  &:hover {
    background-color: #0056b3;
  }
`;

const ProcessingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
`;

const ProcessingMessage = styled.p`
  font-size: 16px;
  font-weight: bold;
  color: #007bff;
`;

const Loader = styled.div`
  border: 4px solid #f3f3f3;
  border-radius: 50%;
  border-top: 4px solid #007bff;
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const ConfirmPaymentButton = styled.button`
  padding: 10px 20px;
  background-color: #ffc107;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 20px;

  &:hover {
    background-color: #e0a800;
  }
`;

const ErrorContainer = styled.div`
  padding: 20px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 5px;
  margin-top: 20px;
`;

const ErrorMessage = styled.p`
  font-size: 16px;
  font-weight: bold;
  color: #721c24;
`;

const SuccessContainer = styled.div`
  padding: 20px;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 5px;
  margin-top: 20px;
`;

const SuccessMessage = styled.p`
  font-size: 16px;
  font-weight: bold;
  color: #155724;
`;

export default CheckoutComp;
