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
  const [transactionId, setTransactionId] = useState(null); // New state for transaction ID

  const CheckoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px;
  position: absolute;
  top: 20px;
  left: 20px;
`;

  // const [mpesaReceipt, setmpesaReceipt] = useState(false);

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

        const data = await response.json();
        setTransactionId(data.transactionId); // Store transaction ID

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
      if (!transactionId) {
        alert("No transaction ID found. Please initiate the payment first.");
        return;
      }

      const response = await fetch(`https://mpesa-backend-api.vercel.app/paymentStatus/${transactionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch payment status");
      }

      const data = await response.json();
      if (data.message === 'Successful Payment') {
        setIsPaymentConfirmed(true);
        alert("Payment confirmed successfully");
      } else {
        alert("Payment not yet confirmed. Please try again later.");
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      alert("Failed to confirm payment. Please try again later.");
    }
  };

  return (
    <CheckoutContainer>
      <BackButton onClick={() => navigate(-1)}>
        <IoIosArrowRoundBack />
      </BackButton>
      <h2>Complete Your Purchase</h2>
      {pendingTickets.map((ticket, index) => (
        <div key={ticket.ticketId}>
          <h4>{ticket.eventName}</h4>
          <p>Price: {ticket.price}</p>
          <label>
            Full Name:
            <input
              type="text"
              value={formData[index]?.full_name || ""}
              onChange={(e) =>
                handleInputChange(index, "full_name", e.target.value)
              }
            />
          </label>
          <label>
            Email:
            <input
              type="email"
              value={formData[index]?.email || ""}
              onChange={(e) =>
                handleInputChange(index, "email", e.target.value)
              }
            />
          </label>
          <label>
            Phone Number:
            <input
              type="tel"
              value={formData[index]?.phone_number || ""}
              onChange={(e) =>
                handleInputChange(index, "phone_number", e.target.value)
              }
            />
          </label>
          <label>
            Gender:
            <select
              value={formData[index]?.gender || ""}
              onChange={(e) =>
                handleInputChange(index, "gender", e.target.value)
              }
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
      ))}
      <button onClick={handleCompletePayment} disabled={isPaymentProcessing}>
        {isPaymentProcessing ? "Processing Payment..." : "Complete Payment"}
      </button>
      <button onClick={handleConfirmPayment} disabled={isPaymentConfirmed}>
        Confirm Payment
      </button>
      {paymentFailed && (
        <p style={{ color: "red" }}>
          Payment failed or timed out. Redirecting to the event page...
        </p>
      )}
    </CheckoutContainer>
  );
};

export default CheckoutComp;
