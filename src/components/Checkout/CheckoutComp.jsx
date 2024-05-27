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
            eventDesc: eventName,
          };
        })
      );
  
      setIsPaymentProcessing(true);
      setPaymentFailed(false);
  
      await Promise.all(
        formData.map(async (data, index) => {
          const phone = formData[index]?.phone_number;
          const amount = subtotal;
          // const ticketId = pendingTickets[index].ticketId;
          const event = eventName;
  
          const response = await fetch("https://mpesa-backend-api.vercel.app/api/stkpush", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phone: phone,
              amount: amount,
              // ticketId: ticketId,
              event : event,
            }),
          });
  
          if (!response.ok) {
            throw new Error("Failed to initiate payment for ticket: " + ticketId);
          }
        })
      );
  
      const startTime = Date.now();
      let ticketPaid = false;
      const maxTimeout = 20000; // 20 seconds timeout
  
      while (Date.now() - startTime < maxTimeout) {
        const response = await fetch("https://mpesa-backend-api.vercel.app/api/paidtickets");
        if (!response.ok) {
          console.error("Failed to fetch paid tickets");
          throw new Error("Failed to fetch paid tickets");
        }
  
        const paidTickets = await response.json();
        ticketPaid = paidTickets.every(ticket => ticket.resultCode === 0);
  
        if (ticketPaid) {
          mpesaReceipt = paidTickets[0]?.mpesaReceiptNumber;
          break;
        } else {
          console.log("Waiting for payment...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

      }
  
      if (ticketPaid) {
        await Promise.all(
          pendingTickets.map(async (ticket, index) => {
            const ticketRef = doc(db, "events", ticket.eventId, "pendingTickets", ticket.ticketId);
            const ticketSnapshot = await getDoc(ticketRef);
  
            if (!ticketSnapshot.exists()) {
              alert("The timeout for this ticket has expired. You will be redirected to the Event Details page.");
              navigate(`/event/${ticket.eventId}`);
              return;
            }
  
            const ticketData = {
              ...formData[index],
              price: ticket.price,
              ticketId: ticket.ticketId,
              mpesaReceiptNumber: mpesaReceipt,
              type: ticket.type,
              eventId: ticket.eventId,
              validOn: ticket.validOn,
            };
  
            await addDoc(collection(db, "events", ticket.eventId, "tickets"), ticketData);
            await deleteDoc(ticketRef);
          })
        );
  
        await Promise.all(
          pendingTickets.map(async (ticket, index) => {
            const updatedFormDataArray = formDataArray.map((data) => ({
              ...data,
              ticketId: ticket.ticketId,
              mpesaReceipt: mpesaReceipt,
              event: eventName
            }));
            const formData = updatedFormDataArray[index];
  
            await fetch("https://mpesa-backend-api.vercel.app/api/send-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: formData.email,
                phone_number: formData.phone_number,
                gender: formData.gender,
                full_name: formData.full_name,
                type: formData.type,
                amount: formData.amount,
                eventDesc: formData.eventDesc,
                mpesaReceipt: formData.mpesaReceipt,
                ticketId: formData.ticketId,
              }),
            });
          })
        );
  
        navigate("/");
      } else {
        setPaymentFailed(true);
        alert("The payment process was not completed within the expected timeframe. Please try again.");
      }
  
    } catch (error) {
      console.error("Error completing payment:", error);
      alert("An error occurred while completing the payment. Please try again.");
    } finally {
      setIsPaymentProcessing(false);
    }
  };
  

  // const verifyPaymentStatus = async (transactionId) => {
  //   // Implement this function to check payment status with M-Pesa API
  //   // Return 'completed' if payment is successful, otherwise return 'pending' or 'failed'
  // };

  const handleApplyPromoCode = () => {
    console.log("Applying promo code:", promoCode);
  };

  const subtotal = pendingTickets.reduce((acc, ticket) => {
    return acc + parseInt(ticket.price); // Assuming the price is in string format and needs to be parsed to an integer
  }, 0);

  return (
    <>
      {isPaymentProcessing && (
        <div className="loader-overlay">
          <div>
            <div className="spinner"></div>
            <p className="loader-text">Processing payment... Please wait.</p>
          </div>
        </div>
      )}

      {isPaymentConfirmed && (
        <div className="loader-overlay">
          <div>
            <div className="spinner"></div>
            <p className="loader-test">Payment confirmed! Redirecting...</p>
          </div>
        </div>
      )}

      {!isPaymentProcessing && !isPaymentConfirmed && (
        <div className="flex flex-row my-20">
          <div className="w-3/12 h-52 border rounded-xl ml-24 p-6 bg-white shadow">
            <div className="bg-white h-full">
              <h2 className="font-bold text-lime-400">Order Summary</h2>
              <p className="flex items-center font-light text-sm">
                <IoIosArrowRoundBack />
                Back
              </p>
              <h4 className="flex items-center font-semibold text-sm w-4/5 border-2 rounded-sm p-1 bg-slate-200 m-1">
                Sub-Total{" "}
                <span className="font-bold ml-8 text-lime-400">
                  Ksh. {subtotal.toFixed(2)}
                </span>
              </h4>
              <form className="flex items-center font-semibold text-sm w-4/5 border-2 rounded-sm p-1 bg-slate-200 m-1">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Promo code:"
                  className="outline-none px-2 py-1 w-3/4"
                />
                <button
                  type="button"
                  onClick={handleApplyPromoCode}
                  className="font-bold ml-2 bg-orange-500 text-white px-4 py-1 rounded"
                >
                  Apply
                </button>
              </form>
              <h4 className="flex items-center font-semibold text-sm w-4/5 border-2 rounded-sm p-1 bg-slate-200 m-1">
                Total{" "}
                <span className="font-bold ml-8 text-lime-400">
                  Ksh. {subtotal.toFixed(2)}
                </span>
              </h4>
            </div>
          </div>
          <div className="w-3/6 h-auto border rounded-xl ml-24 p-6 bg-white shadow">
            <div className="bg-white h-full">
              <h1 className="font-bold text-lime-400">Contact Information</h1>
              <br />
              {pendingTickets.map((ticket, index) => (
                <div key={index}>
                  <h2 className="font-semibold">Attendee {index + 1}</h2>
                  {expiredTickets.some(
                    (expiredTicket) => expiredTicket.id === ticket.id
                  ) ? (
                    <p>
                      The ticket associated with this attendee has expired.
                      Please choose the number of tickets again.
                    </p>
                  ) : (
                    <form>
                      <div className="flex flex-col">
                        <div className="flex items-center font-semibold text-sm rounded-sm p-1 m-1">
                          <div className="border border-gray-300 rounded-sm mr-2">
                            <input
                              type="text"
                              value={formData[index]?.email || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  index,
                                  "email",
                                  e.target.value
                                )
                              }
                              placeholder="Email:"
                              className="outline-none px-2 py-1 w-3/4"
                            />
                          </div>
                          <div className="border border-gray-300 rounded-sm">
                            <input
                              type="text"
                              value={formData[index]?.phone_number || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  index,
                                  "phone_number",
                                  e.target.value
                                )
                              }
                              placeholder="Phone number:"
                              className="outline-none px-2 py-1 w-3/4"
                            />
                          </div>
                        </div>
                        <div className="flex items-center font-semibold text-sm rounded-sm p-1 m-1">
                          <div className="border border-gray-300 rounded-sm mr-2">
                            <input
                              type="text"
                              value={formData[index]?.full_name || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  index,
                                  "full_name",
                                  e.target.value
                                )
                              }
                              placeholder="Fullname:"
                              className="outline-none px-2 py-1 w-3/4"
                            />
                          </div>
                          <div className="border border-gray-300 rounded-sm">
                            <select
                              value={formData[index]?.gender || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  index,
                                  "gender",
                                  e.target.value
                                )
                              }
                              className="outline-none px-2 py-1 w-4/4"
                            >
                              <option value="">Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          </div>
                          <div className="flex items-center font-semibold text-sm rounded-sm p-1 m-1">
                            <input
                              type="text"
                              value={formData[index]?.ticketType || ticket.type} // Populate with ticket type name
                              readOnly // Make it read-only since we're populating it
                              className="outline-none px-2 py-1 w-3/4"
                            />
                          </div>
                        </div>
                      </div>
                      <br />
                    </form>
                  )}
                </div>
              ))}

              <h1 className="font-bold text-lime-400">Payment Information</h1>
              <div className="flex items-center font-semibold text-sm rounded-sm p-1 m-1">
                <div className="border border-gray-300 rounded-sm mr-2">
                  <select className="outline-none px-2 py-1 w-4/4">
                    <option value="">Mpesa</option>
                    <option value="male">Paypal</option>
                    <option value="female">VISA</option>
                  </select>
                </div>
                <div className="border border-gray-300 rounded-sm">
                  <input
                    type="text"
                    value={formData[0]?.phone_number || ""}
                    onChange={(e) =>
                      handleInputChange(0, "phone_number", e.target.value)
                    }
                    placeholder="Phone number:"
                    className="outline-none px-2 py-1 w-3/4"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCompletePayment}
                className="font-bold ml-2 bg-orange-500 text-white px-4 py-1 rounded my-2"
              >
                Complete Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentFailed && (
        <div className="loader-overlay">
          <div>
            <div className="spinner"></div>
            <p className="loader-text">
              Payment verification failed. Please try again or contact support.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CheckoutComp;
