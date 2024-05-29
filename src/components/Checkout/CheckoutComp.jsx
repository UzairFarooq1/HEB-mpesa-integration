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

const CheckoutComp = ({ pendingTickets }) => {
  const [promoCode, setPromoCode] = useState("");
  const [formData, setFormData] = useState([]);
  const [expiredTickets, setExpiredTickets] = useState([]);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
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
                eventName = eventData.eventDesc || "";
                return {
                    email: formData[index]?.email || "",
                    phone_number: formData[index]?.phone_number || "",
                    gender: formData[index]?.gender || "",
                    full_name: formData[index]?.full_name || "",
                    type: ticket.type,
                    amount: ticket.price,
                    eventDesc: eventName, // Add eventDesc to formDataArray
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
                        used: false,
                        validOn: ticket.validOn,
                    };

                    await setDoc(ticketRef, ticketData);
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
