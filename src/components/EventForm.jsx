import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDoc, doc, Timestamp } from "firebase/firestore";
import { useForm } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import { collection, addDoc, getFirestore, setDoc } from "@firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import LeafletControlGeocoder from "./elements/LeafletGeocoder.jsx";
import { db } from "../main.jsx";
import { useNavigate } from "react-router-dom";
import Header from "./Header.jsx";

const Form = styled.form`
  max-width: 400px;
  margin: auto;
  margin-top: 1%;
  padding: 1% 3%;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-top: 3px solid #fed700;
  background: white;
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
  margin-bottom: 6px;

  &::placeholder {
    color: rgba(200, 200, 200, 1);
  }

  &:focus {
    outline: none;
    border-bottom: 1px solid rgba(241, 196, 15, 1);
  }
`;

const TextArea = styled.textarea`
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

const Select = styled.select`
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
  padding: 8px 8px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 240ms ease-in-out;
  background: linear-gradient(
    58deg,
    rgba(243, 172, 18, 1) 20%,
    rgba(241, 196, 15, 1) 100%
  );

  &:hover {
    filter: brightness(1.03);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  max-width: 150px;
  padding: 10px;
  color: #fff;
  margin-left: 5px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  transition: all 240ms ease-in-out;
  background: linear-gradient(
    58deg,
    rgba(243, 172, 18, 1) 20%,
    rgba(241, 196, 15, 1) 100%
  );

  &:hover {
    filter: brightness(1.03);
  }
`;

const NextButton = styled(SubmitButton)`
  margin-right: 0;
`;

const StyledDatePicker = styled(DatePicker)`
  width: 100%;
  height: 42px;
  outline: none;
  border: 1px solid rgba(200, 200, 200, 0.3); /* Border color */
  border-radius: 5px;
  padding: 0px 10px;
  transition: all 200ms ease-in-out;
  margin-bottom: 10px; /* Increased margin */
  font-size: 16px; /* Font size */
  line-height: 1.5; /* Line height */
  color: #495057; /* Text color */
  background-color: #fff; /* Background color */
  cursor: pointer;

  &::placeholder {
    color: rgba(200, 200, 200, 1);
  }

  &:hover {
    border-color: rgba(241, 196, 15, 1); /* Border color on hover */
  }

  &:focus {
    outline: none;
    border-color: rgba(241, 196, 15, 1); /* Border color on focus */
  }
`;
const ProgressBar = styled.div`
  width: 50%;
  height: 20px;
  display: flex;
  align-items: center;
  position: relative;
  margin: auto;
  background-color: #f0f0f0;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const Progress = styled.div`
  height: 100%;
  width: ${({ step }) =>
    `${(step - 1) * 14.285714}%`}; /* Calculate width based on step */
  background-color: #fed700; /* Yellow color for progress */
  border-radius: 10px;
  transition: width 0.3s ease-in-out; /* Add transition effect */
`;

const initializeTicketTypes = (numTypes, eventData) => {
  if (eventData && Array.isArray(eventData)) {
    return eventData.map((ticket) => ({
      id: uuidv4(),
      type: ticket.type || "",
      price: ticket.price || 0,
      numberOfTickets: ticket.numberOfTickets || 0,
      earlyBird: ticket.earlyBird || false,
      earlyBirdPercentage: ticket.earlyBirdPercentage || 0,
      earlyBirdEndDate: ticket.earlyBirdEndDate || null,
      dates: [null],
    }));
  }
  return Array.from({ length: numTypes }, () => ({
    id: uuidv4(),
    type: "",
    price: 0,
    numberOfTickets: 0,
    earlyBird: false,
    earlyBirdPercentage: 0,
    earlyBirdEndDate: null,
    dates: [null],
  }));
};

const MultiStepEventForm = ({ isLoading }) => {
  const [eventPictures, setEventPictures] = useState([]);
  const { handleSubmit, register, setValue } = useForm();
  const { eventId } = useParams();
  const [eventDates, setEventDates] = useState([]);
  const [location, setLocation] = useState([null]);
  const [coordinates, setCoordinates] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [userId, setUserId] = useState(null); // Initialize userId state with null
  const [pictureLink, setPictureLink] = useState("");
  const [numTicketTypes, setNumTicketTypes] = useState(1);
  const [ticketTypes, setTicketTypes] = useState(
    initializeTicketTypes(numTicketTypes)
  );
  const [speakers, setSpeakers] = useState([]);
  const [users, setUsers] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [initialLocation, setInitialLocation] = useState("");

  const [manualLocation, setManualLocation] = useState("");
  const [step, setStep] = useState(1);

  const navigate = useNavigate();

  // Function to handle cancel button click
  const handleCancel = () => {
    navigate(-1); 
  };

  // Function to handle manual location input change
  const handleManualLocationChange = (e) => {
    setManualLocation(e.target.value);
  };

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        setMapLoaded(true);
      }, 500);
    }
  }, [isLoading]);

  const isEditing = !!eventId;

  const handleLocationSelect = (coords, locationName) => {
    setCoordinates([coords.lat, coords.lng]); // Update pointer coordinates
    // Update location name only if it's not already set
    setLocation(locationName || manualLocation); // Use manual location if available, otherwise use location from map
  };

  const onSubmit = async (data) => {
    try {
      console.log("Coordinates:", coordinates); // Log coordinates
      console.log("Location:", location); // Log location name

      const db = getFirestore();
      const auth = getAuth();

      const eventDataWithPicture = {
        ...data,
        pictureLink: pictureLink,
      };

      const ticketTypesObject = {};
      ticketTypes.forEach((ticket) => {
        ticketTypesObject[ticket.id] = {
          type: ticket.type,
          price: ticket.price,
          numberOfTickets: ticket.numberOfTickets,
          earlyBird: ticket.earlyBird || false,
          earlyBirdPercentage: ticket.earlyBirdPercentage || false,
          earlyBirdEndDate: ticket.earlyBirdEndDate || false,
          dates: ticket.dates || null, 
        };
      });

      const eventDatesObject = [];
      eventDates.forEach((date) => {
        eventDatesObject.push(date);
      });

      const user = auth.currentUser;
      const userId = user ? user.uid : null;
      const finalLocation = coordinates ? location : manualLocation;

      const eventData = {
        ...data,
        userId: userId,
        ticketTypes: ticketTypesObject,
        eventDates: eventDatesObject,
        pictureLink: pictureLink,
        location: finalLocation,
        speakers: speakers,
        users: users,
      };

      // Ensure coordinates are defined and valid before storing
      if (
        coordinates &&
        coordinates.length === 2 &&
        !isNaN(coordinates[0]) &&
        !isNaN(coordinates[1])
      ) {
        eventData.coordinates = [
          parseFloat(coordinates[0]),
          parseFloat(coordinates[1]),
        ]; // Convert coordinates to floats
      }

      if (eventId) {
        // Editing an existing event
        const eventDocRef = doc(db, "events", eventId);
        await setDoc(eventDocRef, eventData);
        console.log("Event updated successfully");
      } else {
        const docRef = await addDoc(collection(db, "events"), eventData);
        console.log("Document written with ID: ", docRef.id);
        alert("Event Registration Success");
        console.log(
          "Event data with picture submitted successfully:",
          eventDataWithPicture
        );
      }

      navigate("/My Profile");
    } catch (e) {
      console.error("Error adding/updating document: ", e);
    }
  };

  const handleEarlyBirdChange = (index, isChecked) => {
    setTicketTypes((prevTicketTypes) => {
      const newTicketTypes = [...prevTicketTypes];
      newTicketTypes[index].earlyBird = isChecked;
      return newTicketTypes;
    });
  };
  const handleEarlyBirdPercentageChange = (index, percentage) => {
    setTicketTypes((prevTicketTypes) => {
      const newTicketTypes = [...prevTicketTypes];
      newTicketTypes[index].earlyBirdPercentage = percentage;
      return newTicketTypes;
    });
  };
  const handleEarlyBirdEndDateChange = (index, date) => {
    setTicketTypes((prevTicketTypes) => {
      const newTicketTypes = [...prevTicketTypes];
      newTicketTypes[index].earlyBirdEndDate = date;
      return newTicketTypes;
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setEventPictures(files);
  };

  const uploadPictures = async () => {
    try {
      const storage = getStorage();
      const picturesUrls = [];

      for (const picture of eventPictures) {
        const pictureRef = ref(storage, `EventPosters/${eventId}/${eventId}`);
        await uploadBytes(pictureRef, picture);
        const downloadUrl = await getDownloadURL(pictureRef);
        picturesUrls.push(downloadUrl);
      }

      console.log("Pictures uploaded successfully:", picturesUrls);
      // Once the picture URLs are saved to Firestore, set the pictureLink state
      // Set it to the first picture URL or any logic you want to use to choose the main picture
      setPictureLink(picturesUrls[0] || "");
    } catch (error) {
      console.error("Error uploading pictures:", error);
    }
  };

  const handleAddTicketType = () => {
    setNumTicketTypes((prevNum) => prevNum + 1);
    setTicketTypes((prevTypes) => [
      ...prevTypes,
      {
        id: uuidv4(),
        type: "",
        price: 0,
        numberOfTickets: 0,
        earlyBird: false,
        earlyBirdPercentage: 0,
        earlyBirdEndDate: null,
        dates: [], 
      },
    ]);
  };


const handleRemoveTicketType = (index) => {
  // Update the ticketTypes state by removing the ticket type at the specified index
  setTicketTypes((prevTypes) => {
    const updatedTicketTypes = [...prevTypes];
    updatedTicketTypes.splice(index, 1);
    return updatedTicketTypes;
  });
};

  

  const handleAddEventDate = (index) => {
    setTicketTypes((prevTypes) => {
      const updatedTypes = [...prevTypes];
      updatedTypes[index].dates.push(null); // Add a new date to the dates array of the selected ticket type
      return updatedTypes;
    });
  };
  

  const handleRemoveEventDate = (typeIndex, dateIndex) => {
    setTicketTypes((prevTypes) => {
      const updatedTypes = [...prevTypes];
      updatedTypes[typeIndex].dates.splice(dateIndex, 1); // Remove the date at the specified index
      return updatedTypes;
    });
  };

  const handleTicketTypeChange = (index, field, value) => {
    const updatedTicketTypes = [...ticketTypes];
    updatedTicketTypes[index][field] = value;
    setTicketTypes(updatedTicketTypes);
  };

  const handleTicketTypeDateChange = (typeIndex, dateIndex, newDate) => {
    // Check if newDate is a valid Date object
    if (newDate instanceof Date && !isNaN(newDate.getTime())) {
      setTicketTypes((prevTypes) => {
        const updatedTypes = [...prevTypes];
        updatedTypes[typeIndex].dates[dateIndex] = newDate; // Update the date at the specified index
        return updatedTypes;
      });
    } else {
      console.error("Invalid date:", newDate);
    }
  };
  

  // const handleAddEventDate = () => {
  //   setEventDates([...ticketTypes.dates, null]);
  // };

  useEffect(() => {
    // Fetch event data only if eventId is available
    const fetchEventData = async () => {
      try {
        const db = getFirestore();
        const eventDocRef = doc(db, "events", eventId);
        const eventDoc = await getDoc(eventDocRef);

        if (eventDoc.exists()) {
          const event = eventDoc.data();
          setEventData(event);

          // Set form fields with event data
          setValue("eventName", event.eventName);
          setValue("eventDesc", event.eventDesc);
          setValue("tags", event.tags);

          // Set initial location
          setInitialLocation(event.location);
          setManualLocation(event.location);

          // const dateValues = event.eventDates.map(
          //   (date) => new Date(date.seconds * 1000) // Convert Firestore timestamp to JavaScript Date object
          // );
          // setEventDates(dateValues);

          setTicketTypes(
            event.ticketTypes
              ? Object.keys(event.ticketTypes).map((key) => ({
                  id: uuidv4(),
                  ...event.ticketTypes[key],
                  // Convert early bird end date to JavaScript Date object
                  earlyBirdEndDate: event.ticketTypes[key].earlyBirdEndDate
                    ? event.ticketTypes[key].earlyBirdEndDate.toDate()
                    : null,
                  // Convert array of dates to JavaScript Date objects
                  dates: event.ticketTypes[key].dates.map((timestamp) => timestamp.toDate())
                }))
              : []
          );
          

          // Extract coordinates if available
          const storedCoordinates = event.coordinates;
          if (
            storedCoordinates &&
            Array.isArray(storedCoordinates) &&
            storedCoordinates.length === 2
          ) {
            setCoordinates(storedCoordinates); // Set coordinates directly
          }

          // Set speakers
          setSpeakers(event.speakers || []);

          // Set users
          setUsers(event.users || []);

          // Set picture link
          setPictureLink(event.pictureLink || "");
        } else {
          console.error("Event document not found.");
        }
      } catch (error) {
        console.error("Error fetching event data:", error);
      }
    };

    // Fetch event data only if eventId is available
    if (eventId) {
      fetchEventData();
    }
  }, [eventId, setValue]);

  // Set the location state with the initial location when the form loads for editing
  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  // ...

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });

    return () => unsubscribe(); // Cleanup the subscription when the component unmounts
  }, []);

  const handleAddSpeaker = () => {
    setSpeakers((prevSpeakers) => [
      ...prevSpeakers,
      { name: "", description: "" },
    ]);
  };
  const handleRemoveSpeaker = (index) => {
    setSpeakers((prevSpeakers) => prevSpeakers.filter((_, i) => i !== index));
  };

  // Function to handle speaker field change
  const handleSpeakerChange = (index, field, value) => {
    const updatedSpeakers = [...speakers];
    updatedSpeakers[index][field] = value;
    setSpeakers(updatedSpeakers);
  };

  // Function to handle user addition
  const handleAddUser = () => {
    setUsers((prevUsers) => [...prevUsers, { email: "", role: "" }]);
  };

  // Function to handle user removal
  const handleRemoveUser = (index) => {
    setUsers((prevUsers) => prevUsers.filter((_, i) => i !== index));
  };

  // Function to handle user field change
  const handleUserChange = (index, field, value) => {
    const updatedUsers = [...users];
    updatedUsers[index][field] = value;
    setUsers(updatedUsers);
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  return (
    <>
      <Header />
      <br />
      <ProgressBar>
        <Progress step={step} />
      </ProgressBar>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <SignUpHeader>Event Creation Form</SignUpHeader>

        {step === 1 && (
          <>
            <SignUpHeader>Step 1: Basic Event Information</SignUpHeader>
            <Input {...register("uid", { value: uuidv4() })} hidden />

            <Label>Event Name:</Label>
            <Input {...register("eventName")} required />

            <Label>Event Description:</Label>
            <TextArea {...register("eventDesc")} required />

            <Label>Event Tags:</Label>
            <Select {...register("tags")} required>
              <option value="conference">Conference</option>
              <option value="workshop">Workshop</option>
              <option value="daawa">Da'awa</option>
            </Select>
            <br />
            <br />
          </>
        )}

        {step === 2 && (
          <>
            <SignUpHeader>Step 2: Location</SignUpHeader>
            <div style={{ position: "relative" }}>
              {isLoading && <div>Loading...</div>}
              {!isLoading && mapLoaded && (
                <>
                  {coordinates && (
                    <MapContainer
                      center={coordinates}
                      zoom={20}
                      style={{ height: "400px" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">'
                      />
                      <Marker position={coordinates} />
                      <LeafletControlGeocoder
                        onLocationSelect={handleLocationSelect}
                      />{" "}
                      {/* Add LeafletControlGeocoder component */}
                    </MapContainer>
                  )}

                  {!coordinates && (
                    <div>
                      <MapContainer
                        center={[0, 0]}
                        zoom={2}
                        style={{ height: "200px" }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">'
                        />
                        <LeafletControlGeocoder
                          onLocationSelect={handleLocationSelect}
                        />
                      </MapContainer>
                      <label htmlFor="">
                        Location:(If location is not available in map)
                      </label>
                      <br />
                      <Input
                        type="text"
                        value={manualLocation}
                        onChange={handleManualLocationChange}
                        placeholder="Enter Location Manually"
                        required
                      />
                    </div>
                  )}
                </>
              )}
              <br />
            </div>
          </>
        )}

        {/* {step === 3 && (

          <>
            <SignUpHeader>Step 3: Event Dates</SignUpHeader>
            <Label>Event Dates:</Label>
            <div />
            {eventDates.map((date, index) => (
              <StyledDatePicker
                placeholderText="Select a date"
                key={index}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="MMMM d, yyyy h:mm aa"
                selected={date}
                onChange={(newDate) =>
                  setEventDates((prevDates) => [
                    ...prevDates.slice(0, index),
                    newDate,
                    ...prevDates.slice(index + 1),
                  ])
                }
                minDate={new Date()}
                required
              />
            ))}
            <Button
              style={{ marginBottom: "10px" }}
              type="button"
              onClick={handleAddEventDate}
            >
              Add Event Date
            </Button>
            <br />

            <br />
            <br />
          </>
        )} */}
        {step === 3 && (
          <>
            <SignUpHeader>Step 4: Event Tickets</SignUpHeader>
            <Label>Event Ticket Type:</Label>
            {ticketTypes.map((ticket, index) => (
              <div key={ticket.id}>
                <label>{`Ticket Type ${index + 1}`}</label>
                <Input
                  placeholder={`Ticket Type ${index + 1}`}
                  value={ticket.type}
                  onChange={(e) =>
                    handleTicketTypeChange(index, "type", e.target.value)
                  }
                  required
                />

                <Label>{`Event Date for Type ${index + 1}`}</Label>
                {ticket.dates.map((date, dateIndex) => (
                  <div key={dateIndex}>
                    <StyledDatePicker
                      placeholderText={`Event Date ${dateIndex + 1}`}
                      selected={date}
                      onChange={(newDate) =>
                        handleTicketTypeDateChange(index, dateIndex, newDate)
                      }
                      minDate={new Date()}
                      required
                    />
                    <Button
                      style={{ marginBottom: "10px" }}
                      type="button"
                      onClick={() => handleRemoveEventDate(index, dateIndex)}
                    >
                      Remove Event Date
                    </Button>
                  </div>
                ))}
                <Button
                  style={{ marginBottom: "10px" }}
                  type="button"
                  onClick={() => handleAddEventDate(index)}
                >
                  Add Event Date
                </Button>

                <br />

                <label>{`Price for Type ${index + 1}`}</label>
                <Input
                  placeholder={`Price for Type ${index + 1}`}
                  value={ticket.price}
                  onChange={(e) =>
                    handleTicketTypeChange(index, "price", e.target.value)
                  }
                  required
                />

                <label>{`Number of Tickets for Type ${index + 1}`}</label>
                <Input
                  placeholder={`Number of Tickets for Type ${index + 1}`}
                  value={ticket.numberOfTickets}
                  onChange={(e) =>
                    handleTicketTypeChange(
                      index,
                      "numberOfTickets",
                      e.target.value
                    )
                  }
                  required
                />
                <br />
                <label>
                  Early Bird Ticket?
                  <input
                    type="checkbox"
                    checked={ticket.earlyBird}
                    onChange={(e) =>
                      handleEarlyBirdChange(index, e.target.checked)
                    }
                  />
                </label>
                {ticket.earlyBird && (
                  <>
                    <br />

                    <label>Early Bird Percentage:</label>
                    <input
                      type="text"
                      value={ticket.earlyBirdPercentage}
                      onChange={(e) =>
                        handleEarlyBirdPercentageChange(index, e.target.value)
                      }
                      required
                    />
                    <br />
                    <label>Early Bird End Date:</label>
                    <StyledDatePicker
                      placeholderText="End Date"
                      selected={ticket.earlyBirdEndDate}
                      onChange={(date) =>
                        handleEarlyBirdEndDateChange(index, date)
                      }
                      minDate={new Date()}
                      required
                    />
                  </>
                )}
                <br />
                <Button
                  style={{ marginBottom: "10px" }}
                  type="button"
                  onClick={() => handleRemoveTicketType(index)}
                >
                  Delete Ticket Type
                </Button>
              </div>
            ))}
            <Button type="button" onClick={handleAddTicketType}>
              Add Ticket Type
            </Button>
            <br />
            <br />
          </>
        )}
        {step === 4 && (
          <>
            <SignUpHeader>Step 5: Speakers</SignUpHeader>
            <Label>Speakers:</Label>
            {speakers.map((speaker, index) => (
              <div key={index}>
                <Input
                  type="text"
                  value={speaker.name}
                  onChange={(e) =>
                    handleSpeakerChange(index, "name", e.target.value)
                  }
                  placeholder="Speaker Name"
                  required
                />
                <Input
                  type="text"
                  value={speaker.description}
                  onChange={(e) =>
                    handleSpeakerChange(index, "description", e.target.value)
                  }
                  placeholder="Speaker Description"
                  required
                />
                <Button
                  style={{ marginBottom: "10px" }}
                  type="button"
                  onClick={() => handleRemoveSpeaker(index)}
                >
                  Remove Speaker
                </Button>
              </div>
            ))}
            <Button type="button" onClick={handleAddSpeaker}>
              Add Speaker
            </Button>
            <br />
            <br />
          </>
        )}
        {step === 5 && (
          <>
            <SignUpHeader>Step 6: Organization</SignUpHeader>
            <Label>Users:</Label>
            {users.map((user, index) => (
              <div key={index}>
                <Input
                  type="email"
                  value={user.email}
                  onChange={(e) =>
                    handleUserChange(index, "email", e.target.value)
                  }
                  placeholder="User Email"
                  required
                />
                <Select
                  value={user.role}
                  onChange={(e) =>
                    handleUserChange(index, "role", e.target.value)
                  }
                  required
                >
                  <option value="">Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="TicketHandler">Ticket Handler</option>
                </Select>
                <Button
                  style={{ marginBottom: "10px" }}
                  type="button"
                  onClick={() => handleRemoveUser(index)}
                >
                  Remove User
                </Button>
              </div>
            ))}
            <Button type="button" onClick={handleAddUser}>
              Add User
            </Button>
            <br />
            <br />
          </>
        )}
        {step === 6 && (
          <>
            <SignUpHeader>Step 7: Event Poster</SignUpHeader>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              multiple
            />

            <Button type="button" onClick={uploadPictures}>
              Upload Poster
            </Button>
            {pictureLink && (
              <Button style={{ marginLeft: "10px" }}>
                <a href={pictureLink} target="_blank" rel="noopener noreferrer">
                  View Poster
                </a>
              </Button>
            )}
            <br />
            <br />
          </>
        )}
        <div>
          {step === 1 && (
            <SubmitButton type="button" onClick={handleCancel}>
              Cancel
            </SubmitButton>
          )}
          {step !== 1 && (
            <SubmitButton type="button" onClick={handlePrev}>
              Previous
            </SubmitButton>
          )}
          {step !== 6 ? (
            <NextButton type="button" onClick={handleNext}>
              Next
            </NextButton>
          ) : (
            <SubmitButton type="submit">
              {isEditing ? "Update Event" : "Create Event"}
            </SubmitButton>
          )}
        </div>
      </Form>
    </>
  );
};
const EventForm = () => {
  // Your EventForm logic goes here, if any
  return <MultiStepEventForm />;
};

export default EventForm;
