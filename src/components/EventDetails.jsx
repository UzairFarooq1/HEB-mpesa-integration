import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import Header from "./Header";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { HiLocationMarker } from "react-icons/hi";
import { SlLocationPin } from "react-icons/sl";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";
import ticketbg from "../assets/images/ticketbg.png"; // make sure the relative path is correct

// Styled components
const EventDetailsContainer = styled.div`
  display: grid;
  grid-template-columns: 5fr 3fr;
  gap: 10px;
  max-width: 1300px;
  margin: 0 auto;
  padding: 20px;
`;

const EventPoster = styled.img`
  width: 400px;
  object-fit: contain;
  border-radius: 20px;
  margin-left: 50px;
`;


const EventInfoContainer = styled.div``;

const EventTitle = styled.h1`
  color: gold;
  margin-bottom: 10px;
  border-color: goldenrod;
  font-size: xxx-large;
  font-weight: bold;
  width: 80%;
  float: right;
  border-style: solid;
  display: flex;
  height: 47px;
  align-items: center;
  flex-shrink: 0;
`;

const TicketTypeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: inherit;
`;

const TicketTypeBox = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 20px;
  height: 150px;
  
`;

const TicketTypeLeftColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

const TicketTypeRightColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

const TicketType = styled.div`
  font-weight: bold;
`;

const TicketTypePrice = styled.div`
  margin-top: 5px;
`;

const SellUntil = styled.div`
  margin-top: 10px;
`;


const ValidOn = styled.div`
  margin-top: 10px;
`;
const TicketQuantityContainer = styled.div`
  display: grid;
  grid-template-rows: repeat(2, 1fr);
  align-items: center;
  justify-content : end;
  padding: 20px 10px 20px 20px ;
`;

const QuantityButton = styled.button`
  width: 30px;
  height: 30px;
  background-color: gold;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
  align-items: center;
  justify-content: center;
  color: black;
  margin: 0 auto;

`;

const QuantityText = styled.span`
  margin: 0 auto;
  font-size: 20px;
`;

const CheckoutButton = styled.button`
  margin-top: 20px;
  padding: 10px 20px;
  background-color: gold;
  color: black;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
`;
const EventDescription = styled.h1`
  font-weight: bolder;
  text-align: left;
  margin-top: 30px;
  width: 70%;
  font-size: 20px;
  padding-bottom: 10px;
`;

const EventDate = styled.time`
  font-size: 1em;
  display: block;
  position: relative;
  width: 7em;
  height: 7em;
  background-color: #fff;
  border-radius: 0.6em;
  box-shadow: 0 1px 0 #bdbdbd, 0 2px 0 #fff, 0 3px 0 #bdbdbd, 0 4px 0 #fff,
    0 5px 0 #bdbdbd, 0 0 0 1px #bdbdbd;
  overflow: hidden;
  height: 138px;
  flex-shrink: 0;
`;

const EventYear = styled.em`
  position: absolute;
  bottom: 0.005em;
  left: 0;
  right: 0;
  margin: auto;
  font-family: serif;
  color: #fd9f1b;
  font-weight: bold;
  display: block;
  text-align: center; /* Center align the year */
`;

const EventMonth = styled.strong`
  position: absolute;
  font-family: serif;
  top: 0;
  padding: 0.4em 0;
  color: #fff;
  background-color: #fd9f1b;
  border-bottom: 1px dashed #f37302;
  box-shadow: 0 2px 0 #fd9f1b;
  width: 100%;
  text-align: center;
`;

const EventDay = styled.span`
  font-size: 2.8em;
  margin-bottom: 5px;
  font-family: fantasy;
  padding-top: 0.8em;
  color: #2f2f2f;
  display: block;
  text-align: center;
`;

const EventLocation = styled.p`
  color: black;
  font-size: 20px;
  float: right;
  width: 80%;
  display: flex;
  height: 24px;
  align-items: center;
  gap: 17.832px;
  flex-shrink: 0;
`;

const OrganizerBadge = styled.div`
  background-color: #ffffff;
  padding: 10px;
  border-radius: 10px;
  margin-top: 20px;
  border: 1px solid #fd9f1b;
  width: 70%;
  display: flow-root;
  fill: var(--Color, #fff);
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.25) inset;
  filter: blur(0.5px);
`;

const OrganizerLabel = styled.span`
  font-weight: bold;
`;

const OrganizerName = styled.span`
  color: gold;
`;

const OrganizerContact = styled.p`
  margin-top: 5px;
`;

const EventDetails = () => {
  const { eventId } = useParams();
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventDates, setEventDates] = useState([]); // Define eventDates state variable
  const [ticketQuantities, setTicketQuantities] = useState({});
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null); // State to hold the user ID

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const db = getFirestore();
        const eventDocRef = doc(db, "events", eventId);
        const eventDocSnapshot = await getDoc(eventDocRef);

        if (eventDocSnapshot.exists()) {
          const eventData = eventDocSnapshot.data();

          setEventDetails(eventData);

          // Fetch organizer details using userId
          const organizerDocRef = doc(db, "users", eventData.userId);
          const organizerDocSnapshot = await getDoc(organizerDocRef);
          if (organizerDocSnapshot.exists()) {
            const organizerData = organizerDocSnapshot.data();
            eventData.organizerCompanyName = organizerData.Company;
            eventData.organizerEmail = organizerData.email;
            eventData.organizerContact = organizerData.Contact;
          }
          const ticketDates = Object.values(
            eventData.ticketTypes || {}
          ).flatMap((ticket) => ticket.dates || []);

          

          const formattedDates = ticketDates.map((timestamp) => {
            // const formattedDates = eventData.eventDates.map((timestamp) => {
            const timestampSeconds = timestamp.seconds;
            const timestampMilliseconds = timestampSeconds * 1000;
            const eventDate = new Date(timestampMilliseconds);

            const date = eventDate.getDate();
            let month = eventDate.getMonth() + 1; // Using let instead of var
            const year = eventDate.getFullYear();

            // Extracting time
            const hours = eventDate.getHours();
            const minutes = eventDate.getMinutes();

            let eventDateFormatted = `${date}`;

            // Switch case for month formatting...
            switch (month) {
              case 1:
                month = "January";
                break;
              case 2:
                month = "February";
                break;
              case 3:
                month = "March";
                break;
              case 4:
                month = "April";
                break;
              case 5:
                month = "May";
                break;
              case 6:
                month = "June";
                break;
              case 7:
                month = "July";
                break;
              case 8:
                month = "August";
                break;
              case 9:
                month = "September";
                break;
              case 10:
                month = "October";
                break;
              case 11:
                month = "November";
                break;
              case 12:
                month = "December";
                break;
              default:
                console.log("Invalid Month");
                break;
            }

            const eventMonthFormatted = `${month}`;
            const eventYearFormatted = `${year}`;

            // Formatting time
            const eventTime = `${hours}:${minutes < 10 ? "0" : ""}${minutes}`; // Adding leading zero if minutes < 10

            // Returning an object containing formatted date, month, year, and time
            return {
              eventDateFormatted,
              eventMonthFormatted,
              eventYearFormatted,
              eventTime,
            };
          });

          console.log(eventData.ticketTypes[0]);
          setEventDates(formattedDates); // Set the formatted dates to state
          setEventDetails(eventData);
          console.log(eventData.ticketTypes);
          console.log(formattedDates);
          console.log(eventDetails);
        } else {
          console.error("Event document not found");
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, set the user ID state
        setUserId(user.uid);
      } else {
        // User is signed out, set user ID state to null
        setUserId(null);
      }
    });
  }, [eventId]);

  if (loading) {
    return <div style={{ textAlign: "center" }}>Loading...</div>;
  }

  if (!eventDetails) {
    return <div>Event not found</div>;
  }

  //Collection inside events

  const handleQuantityChange = (ticketTypeId, quantityChange) => {
    setTicketQuantities((prevState) => {
      const newQuantity = (prevState[ticketTypeId] || 0) + quantityChange;
      return {
        ...prevState,
        [ticketTypeId]: Math.max(newQuantity, 0), // Prevent quantity from going below 0
      };
    });
  };

  const handleProceedCheckout = async () => {
    const isAnyTicketSelected = Object.values(ticketQuantities).some(
      (quantity) => quantity > 0
    );

    if (!isAnyTicketSelected) {
      // Display an alert message if no ticket is selected
      toast.warn(
        "Please select at least one ticket before proceeding to checkout."
      );
      return; // Exit the function if no ticket is selected
    }

    try {
      const db = getFirestore();
      const eventDocRef = doc(db, "events", eventId);
      const pendingTicketsRef = collection(eventDocRef, "pendingTickets");

      const ticketsToCreate = [];

      for (const [ticketTypeId, quantity] of Object.entries(ticketQuantities)) {
        if (quantity > 0) {
          const ticketType = eventDetails.ticketTypes[ticketTypeId];
          const updatedNumberOfTickets =
            eventDetails.ticketTypes[ticketTypeId].numberOfTickets - quantity;

          await updateDoc(eventDocRef, {
            [`ticketTypes.${ticketTypeId}.numberOfTickets`]:
              updatedNumberOfTickets,
          });

          for (let i = 0; i < quantity; i++) {
            const ticket = {
              eventId: eventId, // Include eventId along with other ticket details
              type: ticketType.type,
              price: ticketType.earlyBird
                ? ((100 - parseInt(ticketType.earlyBirdPercentage)) *
                    parseInt(ticketType.price)) /
                  100
                : ticketType.price,
              validOn: ticketType.dates ? ticketType.dates : null,
              createdAt: serverTimestamp(), // Timestamp when the ticket is created
            };

            const ticketDocRef = await addDoc(pendingTicketsRef, ticket);
            const ticketId = `${ticketDocRef.id}`; // Include userId, ticketTypeId, and document ID as part of the ticket ID

            const updatedTicket = { ...ticket, ticketId }; // Include ticket ID in the ticket object

            await setDoc(ticketDocRef, updatedTicket, { merge: true }); // Update the ticket document with the ticket ID

            // Schedule deletion after 5 minutes
            // setTimeout(async () => {
            //   const ticketDocSnapshot = await getDoc(ticketDocRef);

            //   if (ticketDocSnapshot.exists()) {
            //     try {
            //       // Delete the ticket
            //       await deleteDoc(ticketDocRef);
            //       console.log("Ticket deleted successfully:", ticketId);

            //       // Update the number of available tickets for the event
            //       const eventDocRef = doc(db, "events", eventId);
            //       const ticketTypeKey = `ticketTypes.${ticketTypeId}.numberOfTickets`;
            //       const eventDoc = await getDoc(eventDocRef);
            //       const currentNumberOfTickets =
            //       eventDoc.data().ticketTypes[ticketTypeId].numberOfTickets;
            //       const updatedNumberOfTickets = currentNumberOfTickets + 1;

            //       await updateDoc(eventDocRef, {
            //         [ticketTypeKey]: updatedNumberOfTickets,
            //       });

            //       console.log(
            //         "Number of available tickets updated successfully"
            //       );
            //     } catch (error) {
            //       console.error(
            //         "Error deleting ticket or updating available tickets:",
            //         error
            //       );
            //     }
            //   } else {
            //     console.log(
            //       "Ticket does not exist or has already been deleted:",
            //       ticketId
            //     );
            //   }
            // }, 5 * 60 * 1000); // 1 minute in milliseconds

            // Add the ticket to the list of tickets to create
            ticketsToCreate.push(updatedTicket);
          }
        }
      }

      // Pass the pending tickets data to the Checkout component
      navigate("/Checkout", { state: { pendingTickets: ticketsToCreate } });
    } catch (error) {
      console.error("Error creating pending tickets:", error);
    }
  };
  const SoldOutOverlay = () => (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) rotate(-20deg)", // Rotate the text diagonally
        width: "100%", // Adjust width to ensure the text covers the TicketTypeBox diagonally
        height: "auto", // Auto height
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "red", // Adjust color as needed
        fontWeight: "bold", // Make the text bold
        fontSize: "55px", // Adjust font size as needed
        zIndex: 1, // Ensure it's above other content1
      }}
    >
      Sold out
    </div>
  );

  // Inside the EventDetails component
  
  return (
    <>
      <Header />
      {loading ? (
        <div style={{ textAlign: "center" }}>Loading...</div>
      ) : !eventDetails ? (
        <div>Event not found</div>
      ) : (
        <EventDetailsContainer>
          <EventPoster
            src={eventDetails.pictureLink || "/assets/images/carousel1.jpg"}
            alt="Event Poster"
          />

          <TicketTypeContainer>
            {/* Conditionally render the SoldOutOverlay */}
            {Object.keys(eventDetails.ticketTypes).map((ticketTypeId) => {
              const ticketType = eventDetails.ticketTypes[ticketTypeId];
              return (
                <TicketTypeBox
                  key={ticketTypeId}
                  style={{
                    backgroundImage: `url(${ticketbg})`, height : "180px",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "100% 100%",
                    position: "relative", // Ensure position relative for absolute positioning of "Sold out" message
                    opacity: ticketType.numberOfTickets <= 0 ? 0.5 : 1,
                    cursor:
                      ticketType.numberOfTickets <= 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {ticketType.numberOfTickets <= 0 && <SoldOutOverlay />}{" "}
                  {/* Conditionally render the SoldOutOverlay */}
                  <TicketTypeLeftColumn>
                    <TicketType>{ticketType.type}
                    {ticketType.earlyBird && (
                        <strong>- Early Bird</strong>
                    )}</TicketType>
                    <TicketTypePrice
                      style={
                        ticketType.earlyBird
                          ? { textDecoration: "line-through" }
                          : null
                      }
                    >
                      Price: Ksh {ticketType.price}
                    </TicketTypePrice>
                    {ticketType.earlyBird && (
                      <TicketTypePrice>
                        Early Bird Price: Ksh
                        {((100 - parseInt(ticketType.earlyBirdPercentage)) *
                          parseInt(ticketType.price)) /
                          100}
                      </TicketTypePrice>
                    )}
                  </TicketTypeLeftColumn>
                  <TicketTypeRightColumn>
                    <SellUntil>
                      <strong>Sell until:</strong>

                      {ticketType.dates && ticketType.dates.length > 0 ? (
                        <div>
                          {new Date(
                            ticketType.dates[0].seconds * 1000 - 86400000
                          ).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      ) : (
                        <div>No sell date available</div>
                      )}
                    </SellUntil>

                    {ticketType.dates && ticketType.dates.length > 0 && (
                      <ValidOn>
                        <strong>Valid on:</strong>
                        {ticketType.dates &&
                          ticketType.dates.map((date, index) => (
                            <div key={index}>
                              {new Date(date.seconds * 1000).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                }
                              )}
                            </div>
                          ))}
                      </ValidOn>
                    )}
                  </TicketTypeRightColumn>
                  <TicketQuantityContainer>
                  <QuantityButton
                      onClick={() => handleQuantityChange(ticketTypeId, 1)}
                      disabled={ticketType.numberOfTickets <= 0}
                      style={{
                        pointerEvents:
                          ticketType.numberOfTickets <= 0 ? "none" : "auto",
                      }}
                    >
                      +
                    </QuantityButton>
                    <QuantityText>
                      {ticketQuantities[ticketTypeId] || 0}
                    </QuantityText>
                    <QuantityButton
                      onClick={() => handleQuantityChange(ticketTypeId, -1)}
                      disabled={ticketType.numberOfTickets <= 0}
                      style={{
                        pointerEvents:
                          ticketType.numberOfTickets <= 0 ? "none" : "auto",
                      }}
                    >
                      -
                    </QuantityButton>
                  </TicketQuantityContainer>
                </TicketTypeBox>
              );
            })}
            <CheckoutButton onClick={handleProceedCheckout}>
              Proceed to Checkout
            </CheckoutButton>
          </TicketTypeContainer>

          <EventInfoContainer>
            <EventTitle>{eventDetails.eventName}</EventTitle>
            <EventLocation>
              <SlLocationPin
                style={{
                  color: "#fd9f1b",
                  display: "inline",
                  fontSize: "x-large",
                  verticalAlign: "sub",
                }}
              />
              {eventDetails.location &&
                typeof eventDetails.location === "string" &&
                eventDetails.location.split(",").slice(0, 2).join(",")}
            </EventLocation>

            {/* Display formatted event dates */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "10px",
              }}
            >
              {eventDates.length > 0 && (
                <EventDate
                  dateTime={`${eventDates[0].eventYearFormatted}-${eventDates[0].eventMonthFormatted}-${eventDates[0].eventDateFormatted}`}
                  className="icon"
                >
                  <EventYear>{eventDates[0].eventYearFormatted}</EventYear>
                  <EventMonth>{eventDates[0].eventMonthFormatted}</EventMonth>
                  <EventDay>{eventDates[0].eventDateFormatted}</EventDay>
                </EventDate>
              )}
            </div>

            <OrganizerBadge>
              <OrganizerLabel>Organizer: </OrganizerLabel>
              <OrganizerName>{eventDetails.organizerCompanyName}</OrganizerName>
              <OrganizerContact>
                <strong>Email: </strong>
                {eventDetails.organizerEmail}
                <br />
                <strong>Contact: </strong>
                {eventDetails.organizerContact}
              </OrganizerContact>
            </OrganizerBadge>
            <br />

            {/* Styled Event Description */}
            <EventDescription>About Event:</EventDescription>
            <p style={{ fontSize: "18px", color: "#333", marginTop: "10px" }}>
              {eventDetails.eventDesc}
            </p>
            <br />

            {/* Display Speakers if available */}
            {eventDetails.speakers && eventDetails.speakers.length > 0 && (
              <div>
                <EventDescription>Speakers</EventDescription>
                {eventDetails.speakers.map((speaker, index) => (
                  <>
                    <p style={{ fontWeight: "bold" }}>{speaker.name},</p>
                    <p>{speaker.description}</p>
                  </>
                ))}
              </div>
            )}

            {/* Display Users if available */}
            {eventDetails.users && eventDetails.users.length > 0 && (
              <div>
                <EventDescription>Users</EventDescription>
                {eventDetails.users.map((user, index) => (
                  <li key={index}>
                    {user.email} - {user.role}
                  </li>
                ))}
              </div>
            )}
          </EventInfoContainer>
        </EventDetailsContainer>
      )}
    </>
  );
};

export default EventDetails;
