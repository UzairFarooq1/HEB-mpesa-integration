import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
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

const CheckoutComp = ({ pendingTickets }) => {
  const [promoCode, setPromoCode] = useState("");
  const [formData, setFormData] = useState([]);
  const [expiredTickets, setExpiredTickets] = useState([]);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);

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
          eventName = eventData.eventDesc || "";
          return {
            email: formData[index]?.email || "",
            phone_number: formData[index]?.phone_number || "",
            gender: formData[index]?.gender || "",
            full_name: formData[index]?.full_name || "",
            type: ticket.type,
            amount: subtotal,
            eventDesc: eventName, // Add eventDesc to formDataArray
          };
        })
      );

      setIsPaymentProcessing(true);
      setPaymentFailed(false);

      await Promise.all(
        formData.map(async (data, index) => {
          const phone = formData[index]?.phone_number;
          const amount = subtotal;
          const event = eventName;

          const response = await fetch(
            "https://mpesa-backend-api.vercel.app/api/stkpush",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                phone: phone,
                amount: amount,
                event: event,
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to initiate payment for ticket");
          }
        })
      );

      const startTime = Date.now();
      let ticketPaid = false;
      const maxTimeout = 20000; // 20 seconds timeout

      while (Date.now() - startTime < maxTimeout) {
        const paidTicketsCollection = collection(db, "paidTickets");
        const paidTicketsSnapshot = await getDocs(paidTicketsCollection);
        const paidTicketIds = paidTicketsSnapshot.docs.map(doc => doc.data().ticketId);

        ticketPaid = pendingTickets.every((ticket) =>
          paidTicketIds.includes(ticket.ticketId)
        );

        if (ticketPaid) {
          const response = await fetch(
            "https://mpesa-backend-api.vercel.app/api/paidtickets"
          );
          if (!response.ok) {
            console.error("Failed to fetch paid tickets");
            throw new Error("Failed to fetch paid tickets");
          }
          console.log("Received mpesaReceiptNumber:", mpesaReceipt);

          break; // Exit the loop if all tickets are paid
        } else {
          console.log("Waiting for payment...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        // Log ticketId and mpesaReceiptNumber for each comparison
        console.log(
          "Comparing ticketId:",
          pendingTickets.map((ticket) => ticket.ticketId)
        );
        console.log("Current paidTicketIds:", paidTicketIds);
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
              alert(
                "The timeout for this ticket has expired. You will be redirected to the Event Details page."
              );
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
              validOn: ticket.validOn,
            };

            await addDoc(
              collection(db, "events", ticket.eventId, "tickets"),
              ticketData
            );
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

  const handleApplyPromoCode = () => {
    console.log("Applying promo code:", promoCode);
  };

  const subtotal = pendingTickets.reduce((acc, ticket) => {
    return acc + parseInt(ticket.price); // Assuming the price is in string format and needs to be parsed to an integer
  }, 0);

  return (
    <>
      {isPaymentProcessing && (
        <div className="loader-container">
          <div className="loader"></div>
          <p className="loader-message">Processing payment...</p>
        </div>
      )}
      {isPaymentConfirmed && (
        <div className="payment-success-container">
          <div className="payment-success">
            <h3>Payment Successful!</h3>
            <p>Thank you for your purchase.</p>
          </div>
        </div>
      )}
      {paymentFailed && (
        <div className="payment-failure-container">
          <div className="payment-failure">
            <h3>Payment Failed</h3>
            <p>Please try again or contact support.</p>
          </div>
        </div>
      )}
      {!isPaymentProcessing && !isPaymentConfirmed && !paymentFailed && (
        <>
          <BackButton onClick={() => navigate(-1)}>
            <IoIosArrowRoundBack size={24} />
          </BackButton>
          <CheckoutContainer>
            <FormContainer>
              {pendingTickets.map((ticket, index) => (
                <div key={ticket.id}>
                  <h3>Ticket for {ticket.type}</h3>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData[index]?.full_name || ""}
                    onChange={(e) =>
                      handleInputChange(index, "full_name", e.target.value)
                    }
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData[index]?.email || ""}
                    onChange={(e) =>
                      handleInputChange(index, "email", e.target.value)
                    }
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData[index]?.phone_number || ""}
                    onChange={(e) =>
                      handleInputChange(index, "phone_number", e.target.value)
                    }
                    required
                  />
                  <select
                    value={formData[index]?.gender || ""}
                    onChange={(e) =>
                      handleInputChange(index, "gender", e.target.value)
                    }
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              ))}
              <PromoCodeContainer>
                <PromoCodeInput
                  type="text"
                  placeholder="Promo Code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
                <ApplyButton onClick={handleApplyPromoCode}>
                  Apply
                </ApplyButton>
              </PromoCodeContainer>
              <TotalContainer>
                <p>Subtotal: ${subtotal}</p>
                <CompletePaymentButton onClick={handleCompletePayment}>
                  Complete Payment
                </CompletePaymentButton>
              </TotalContainer>
            </FormContainer>
          </CheckoutContainer>
        </>
      )}
    </>
  );
};

const BackButton = styled.button`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  background-color: transparent;
  border: none;
  cursor: pointer;
`;

const CheckoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 500px;
`;

const PromoCodeContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
`;

const PromoCodeInput = styled.input`
  flex: 1;
  padding: 10px;
  font-size: 16px;
`;

const ApplyButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  margin-left: 10px;
`;

const TotalContainer = styled.div`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const CompletePaymentButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  margin-top: 10px;
`;

export default CheckoutComp;
