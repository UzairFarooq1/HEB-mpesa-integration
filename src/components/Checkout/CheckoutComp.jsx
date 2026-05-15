import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
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
  const [formDataArray, setFormDataArray] = useState([]);
  const [confirmingPayment, setconfirmingPayment] = useState(false);
  const [mpesaReceiptInput, setMpesaReceiptInput] = useState("");
  const [verifyingReceipt, setVerifyingReceipt] = useState(false);
  const [receiptVerifyError, setReceiptVerifyError] = useState("");

  const navigate = useNavigate();
  const intervalRef = useRef(null); // Store interval ID to clear it when payment is confirmed

  useEffect(() => {
    // Don't check tickets if payment is already confirmed
    if (isPaymentConfirmed) {
      return;
    }

    const checkPendingTickets = async () => {
      try {
        // Don't check if payment is confirmed
        if (isPaymentConfirmed) {
          return;
        }

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
    intervalRef.current = setInterval(checkPendingTickets, 5000);

    // Clear interval on component unmount or when payment is confirmed
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pendingTickets, navigate, isPaymentConfirmed]);

  // Prevent back navigation after payment is confirmed
  useEffect(() => {
    if (isPaymentConfirmed) {
      // Replace current history entry to prevent back navigation
      window.history.replaceState(null, "", window.location.pathname);

      // Add popstate listener to prevent back navigation
      const handlePopState = () => {
        // Prevent going back after payment is confirmed
        window.history.pushState(null, "", window.location.pathname);
        // Optionally show a message
        console.log("Cannot go back after payment is confirmed");
      };

      window.addEventListener("popstate", handlePopState);

      // Cleanup
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [isPaymentConfirmed]);

  const handleInputChange = (index, field, value) => {
    const updatedFormData = [...formData];
    updatedFormData[index] = { ...updatedFormData[index], [field]: value };
    setFormData(updatedFormData);
  };

  const getOrderTotal = () => {
    const total = pendingTickets.reduce((sum, ticket) => {
      const price =
        typeof ticket.price === "string"
          ? parseFloat(ticket.price)
          : ticket.price;
      return sum + (price || 0);
    }, 0);
    return Math.max(1, Math.ceil(total));
  };

  const ensureFormDataArray = async () => {
    if (formDataArray.length > 0) return formDataArray;

    const db = getFirestore();
    const built = await Promise.all(
      pendingTickets.map(async (ticket, index) => {
        const eventRef = doc(db, "events", ticket.eventId);
        const eventSnapshot = await getDoc(eventRef);
        if (!eventSnapshot.exists()) {
          throw new Error(`Event with ID ${ticket.eventId} not found`);
        }
        const eventData = eventSnapshot.data();
        hostId = eventData.userId || hostId;
        eventName = eventData.eventName || eventName;
        return {
          email: formData[index]?.email || "",
          phone_number: formData[index]?.phone_number || "",
          gender: formData[index]?.gender || "",
          full_name: formData[index]?.full_name || "",
          type: ticket.type,
          amount: ticket.price,
          eventDesc: eventData.eventName || eventName,
        };
      }),
    );
    setFormDataArray(built);
    return built;
  };

  const checkReceiptNotUsed = async (receipt) => {
    const db = getFirestore();
    const eventIds = [...new Set(pendingTickets.map((t) => t.eventId))];

    for (const eventId of eventIds) {
      const ticketsQuery = query(
        collection(db, "events", eventId, "tickets"),
        where("mpesaReceiptNumber", "==", receipt),
      );
      const snapshot = await getDocs(ticketsQuery);
      if (!snapshot.empty) {
        throw new Error(
          "This M-Pesa receipt has already been used to register tickets.",
        );
      }
    }
  };

  const finalizePayment = async (receipt) => {
    await checkReceiptNotUsed(receipt);
    const emailFormData = await ensureFormDataArray();
    const db = getFirestore();

    await Promise.all(
      pendingTickets.map(async (ticket, index) => {
        const ticketRef = doc(
          db,
          "events",
          ticket.eventId,
          "pendingTickets",
          ticket.ticketId,
        );
        const ticketSnapshot = await getDoc(ticketRef);

        if (!ticketSnapshot.exists()) {
          alert(
            "The timeout for this ticket has expired. You will be redirected to the Event Details page.",
          );
          navigate(`/event/${ticket.eventId}`);
          return;
        }

        const ticketData = {
          ...formData[index],
          price: ticket.price,
          ticketId: ticket.ticketId,
          mpesaReceiptNumber: receipt,
          type: ticket.type,
          eventId: ticket.eventId,
          host: hostId,
          used: false,
          validOn: ticket.validOn,
        };

        const ticketRef1 = doc(
          db,
          "events",
          ticket.eventId,
          "tickets",
          ticket.ticketId,
        );
        await setDoc(ticketRef1, ticketData);
        await deleteDoc(ticketRef);
      }),
    );

    await Promise.all(
      pendingTickets.map(async (ticket, index) => {
        const updatedFormDataArray = emailFormData.map((data) => ({
          ...data,
          ticketId: ticket.ticketId,
          mpesaReceipt: receipt,
        }));
        const payload = updatedFormDataArray[index];

        await fetch("https://email-server-flax.vercel.app/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }),
    );

    mpesaReceipt = receipt;
    setIsPaymentProcessing(false);
    setIsPaymentConfirmed(true);
    setPaymentFailed(false);
    setReceiptVerifyError("");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    window.history.replaceState(null, "", window.location.pathname);

    setTimeout(() => {
      navigate("/", { replace: true });
    }, 3000);

    setFormData([]);
  };

  const handleVerifyReceipt = async () => {
    const receiptCode = mpesaReceiptInput.trim();
    if (!receiptCode) {
      setReceiptVerifyError("Enter the M-Pesa confirmation code from your SMS.");
      return;
    }

    try {
      setVerifyingReceipt(true);
      setReceiptVerifyError("");
      setPaymentFailed(false);

      const phone = formData[0]?.phone_number;
      if (!phone || phone.trim() === "") {
        throw new Error("Phone number is required before verifying payment.");
      }

      await ensureFormDataArray();

      const response = await fetch(
        "https://mpesa-backend-api.vercel.app/api/verify-receipt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            receiptCode,
            amount: getOrderTotal(),
          }),
        },
      );

      const data = await response.json();
      if (!response.ok || !data.status) {
        throw new Error(
          data.msg || data.message || "Could not verify this receipt code.",
        );
      }

      await finalizePayment(data.mpesaReceipt);
    } catch (error) {
      console.error("Receipt verification error:", error);
      setReceiptVerifyError(
        error.message || "Failed to verify receipt. Please try again.",
      );
    } finally {
      setVerifyingReceipt(false);
    }
  };

  const ReceiptVerificationBlock = ({ compact = false }) => (
    <div
      className={
        compact
          ? "mt-4 pt-4 border-t border-gray-200"
          : "mt-6 p-4 border border-amber-200 rounded-lg bg-amber-50"
      }
    >
      <p
        className={`text-sm ${compact ? "text-gray-600 mb-2" : "text-amber-900 font-medium mb-2"}`}
      >
        {compact
          ? "Already paid via M-Pesa? Enter your confirmation code:"
          : "Paid on M-Pesa but tickets not confirmed? Enter the confirmation code from your M-Pesa SMS (e.g. QJK1ABC2DE):"}
      </p>
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          type="text"
          value={mpesaReceiptInput}
          onChange={(e) => {
            setMpesaReceiptInput(e.target.value.toUpperCase());
            setReceiptVerifyError("");
          }}
          placeholder="M-Pesa receipt code"
          className="outline-none px-3 py-2 border border-gray-300 rounded flex-1 uppercase tracking-wide"
          disabled={verifyingReceipt || isPaymentConfirmed}
        />
        <button
          type="button"
          onClick={handleVerifyReceipt}
          disabled={verifyingReceipt || isPaymentConfirmed}
          className="font-bold bg-lime-600 hover:bg-lime-700 text-white px-4 py-2 rounded disabled:opacity-50 whitespace-nowrap"
        >
          {verifyingReceipt ? "Verifying..." : "Verify Payment"}
        </button>
      </div>
      {receiptVerifyError && (
        <p className="text-red-600 text-sm mt-2">{receiptVerifyError}</p>
      )}
    </div>
  );

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
      setFormDataArray(formDataArray);

      // Calculate total amount for all tickets
      // Ensure we're using numbers, not strings
      let totalAmount = pendingTickets.reduce((total, ticket) => {
        const price =
          typeof ticket.price === "string"
            ? parseFloat(ticket.price)
            : ticket.price;
        return total + (price || 0);
      }, 0);

      console.log("Raw total amount (before rounding):", totalAmount);
      console.log(
        "Ticket prices:",
        pendingTickets.map((t) => ({ type: t.type, price: t.price }))
      );

      // Ensure totalAmount is a valid number
      if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new Error(
          "Invalid total amount. Please check your ticket prices."
        );
      }

      // Round up to nearest whole number for M-Pesa (M-Pesa doesn't accept decimals)
      // Ensure minimum 1 KSH (M-Pesa minimum transaction amount)
      const roundedAmount = Math.max(1, Math.ceil(totalAmount));

      console.log("Final amount to send to M-Pesa:", roundedAmount);

      // Warn if original amount was very small (might indicate promo code issue)
      if (totalAmount < 1 && roundedAmount === 1) {
        console.warn(
          "Warning: Original amount was less than 1 KSH. Rounded up to 1 KSH for M-Pesa minimum."
        );
      }

      // Use rounded amount for payment
      totalAmount = roundedAmount;

      setIsPaymentProcessing(true);
      setPaymentFailed(false);

      // Send a single payment request
      const phone = formData[0]?.phone_number;

      /* ========== ORIGINAL CODE (BEFORE EDITING) - START ==========
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
        throw new Error("Failed to initiate payment");  // <-- GENERIC ERROR MESSAGE
      }
      ========== ORIGINAL CODE (BEFORE EDITING) - END ========== */

      // ========== NEW CODE (AFTER EDITING) - START ==========
      // Validate phone number before sending
      if (!phone || phone.trim() === "") {
        throw new Error("Phone number is required");
      }

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

      // Try to parse JSON response, handle errors gracefully
      let responseData;
      const contentType = response.headers.get("content-type");

      try {
        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json();
        } else {
          const text = await response.text();
          console.error("Non-JSON response:", text);
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`
          );
        }
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error(
          `Failed to parse server response (Status: ${response.status})`
        );
      }

      if (!response.ok) {
        const errorMessage =
          responseData?.msg ||
          responseData?.error ||
          `Failed to initiate payment (Status: ${response.status})`;
        console.error("Payment initiation error:", {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        });
        throw new Error(errorMessage); // <-- NOW SHOWS DETAILED ERROR FROM BACKEND
      }

      // Payment initiated successfully
      console.log("Payment initiated successfully:", responseData);

      // Show success message to user
      if (responseData.msg) {
        console.log("M-Pesa Prompt:", responseData.msg);
      }
      // ========== NEW CODE (AFTER EDITING) - END ==========
    } catch (error) {
      console.error("Error completing payment:", error);
      setPaymentFailed(true);

      // Clear interval on error as well
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setTimeout(() => {
        navigate(`/event/${pendingTickets[0].eventId}`);
      }, 3000);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setIsPaymentProcessing(true);
      setPaymentFailed(false);

      const startTime = Date.now();
      let ticketPaid = false;
      const maxTimeout = 20000; // 20 seconds timeout

      while (Date.now() - startTime < maxTimeout) {
        const paymentStatusResponse = await fetch(
          "https://mpesa-backend-api.vercel.app/paymentStatus"
        );
        if (!paymentStatusResponse.ok) {
          console.error("Failed to fetch payment status");
          throw new Error("Failed to fetch payment status");
        }
        const data = await paymentStatusResponse.json();
        if (data.message === "Successful Payment") {
          mpesaReceipt = data.mpesaReceipt;
          ticketPaid = true;
          break; // Exit the loop if payment is successful
        } else {
          console.log("Waiting for payment...");
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
        }
      }

      if (ticketPaid) {
        await finalizePayment(mpesaReceipt);
      } else {
        setPaymentFailed(true);
        setReceiptVerifyError(
          "Automatic confirmation timed out. If you already paid, enter your M-Pesa receipt code below.",
        );
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      setPaymentFailed(true);
      setReceiptVerifyError(
        error.message ||
          "Could not confirm payment automatically. Enter your M-Pesa receipt code if you already paid.",
      );
    } finally {
      setIsPaymentProcessing(false);
      setconfirmingPayment(false);
    }
  };

  const handleConfirmPaymentClick = () => {
    setconfirmingPayment(true);
    handleConfirmPayment();
  };
  // const verifyPaymentStatus = async (transactionId) => {
  //   // Implement this function to check payment status with M-Pesa API
  //   // Return 'completed' if payment is successful, otherwise return 'pending' or 'failed'
  // };

  const handleApplyPromoCode = () => {
    console.log("Applying promo code:", promoCode);
  };

  // Calculate subtotal - handle both string and number prices
  // Add safety check to ensure pendingTickets is an array
  const subtotal =
    pendingTickets && Array.isArray(pendingTickets) && pendingTickets.length > 0
      ? pendingTickets.reduce((acc, ticket) => {
          const price =
            typeof ticket.price === "string"
              ? parseFloat(ticket.price)
              : ticket.price;
          return acc + (price || 0);
        }, 0)
      : 0;

  return (
    <>
      {isPaymentProcessing && (
        <div className="loader-overlay">
          <div className="max-w-md w-full mx-4 p-6 bg-white rounded-lg shadow-lg">
            <div className="spinner"></div>
            <p className="loader-text">
              Processing payment... Please enter your M-Pesa PIN in the prompt.
            </p>
            <br />
            <div style={{ textAlign: "center" }}>
              {confirmingPayment ? (
                <div className="button-spinner"></div>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmPaymentClick}
                  className="font-bold bg-orange-500 text-white px-4 py-2 rounded"
                >
                  Confirm Payment
                </button>
              )}
            </div>
            <ReceiptVerificationBlock compact />
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
              {!isPaymentConfirmed && (
                <p
                  className="flex items-center font-light text-sm cursor-pointer hover:text-lime-400"
                  onClick={() => {
                    if (!isPaymentConfirmed && !isPaymentProcessing) {
                      navigate(-1);
                    }
                  }}
                  style={{
                    pointerEvents: isPaymentProcessing ? "none" : "auto",
                    opacity: isPaymentProcessing ? 0.5 : 1,
                  }}
                >
                  <IoIosArrowRoundBack />
                  Back
                </p>
              )}
              {isPaymentConfirmed && (
                <p className="flex items-center font-light text-sm text-gray-400">
                  Payment Confirmed ✓
                </p>
              )}
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

              <ReceiptVerificationBlock />
            </div>
          </div>
        </div>
      )}
      {paymentFailed && !isPaymentConfirmed && (
        <div className="loader-overlay">
          <div className="max-w-md w-full mx-4 p-6 bg-white rounded-lg shadow-lg">
            <p className="loader-text mb-2">
              Payment could not be confirmed automatically. If M-Pesa deducted
              your money, enter the confirmation code from your SMS below.
            </p>
            <ReceiptVerificationBlock compact />
            <button
              type="button"
              onClick={() => {
                setPaymentFailed(false);
                setReceiptVerifyError("");
              }}
              className="mt-4 font-bold bg-gray-500 text-white px-4 py-2 rounded w-full"
            >
              Back to checkout
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CheckoutComp;
