// EventCard.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { doc, getFirestore, collection, getDocs, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

const CardContainer = styled.div`
  margin: 20px;
`;

const EventCardContainer = styled.div`
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  position: relative; /* Add position relative */
  width : 800px;

`;


const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

const PaginationButton = styled.button`
  background-color: gold;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin: 0 5px;
`;


const ImageContainer = styled.div`
  width: 150px;
  height: 150px; 
  margin-right: 20px;
  overflow: hidden;
  object-fit: contain;

`;

const Image = styled.img`
  object-fit: cover; 
  max-width: 150px; /* Set a maximum width */
  max-height: 150px; /* Set a maximum height */
  object-fit: contain;

`;
const EventDetailsContainer = styled.div`
  flex: 1;
`;

const EventTitle = styled.h2`
  color: gold;
  margin-bottom: 10px;
`;

const EventDescription = styled.p`
  color: #333;
`;

const OrganizerInfo = styled.p`
  margin-top: 8px;
  display: flex;
  align-items: center;
`;

const GeoIcon = styled.svg`
  margin-right: 5px;
`;

const EventLocation = styled.small`
  margin-right: 10px;
`;

const EventTags = styled.small`
  color: #333;
`;

const ViewButton = styled.button`
  background-color: gold;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
`;



const AllEventsHeader = styled.h2`
  color: gold;
  margin-bottom: 10px;
  text-align: center;  /* Align text to center */

`;
const SoldOutOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: red;
  font-size: 4em;
  font-weight: bolder;
  font-family: cursive;
`;

const SoldOutText = styled.p`
  color: white;
  font-size: 18px;
`;

const EventCard = () => {
  const [events, setEvents] = useState([]);
  const [eventImages, setEventImages] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage] = useState(4); // Number of events to display per page
  const db = getFirestore();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsCollection);
        const eventsData = await Promise.all(eventsSnapshot.docs.map(async (eventDoc) => {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          let organizerCompanyName = ''; // Default value
        
          if (eventData.userId) { // Check if userId exists
            const userDocRef = doc(db, 'users', eventData.userId);
            const userDocSnapshot = await getDoc(userDocRef);
        
            if (userDocSnapshot.exists()) {
              organizerCompanyName = userDocSnapshot.data().Company;
            }
          }
        
          eventData.organizerCompanyName = organizerCompanyName;
        
          return eventData;
        }));
        
        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [db]);
  
  useEffect(() => {
    const fetchEventImages = async () => {
      try {
        const storage = getStorage();
        const imagesPromises = events.map(async (event) => {
          const pictureRef = ref(storage, `EventPosters/${event.id}/${event.id}`);
          const pictureUrl = await getDownloadURL(pictureRef);
          return { eventId: event.id, url: pictureUrl };
        });
    
        const images = await Promise.all(imagesPromises);
        const imagesObject = Object.assign({}, ...images);
        setEventImages(imagesObject);
      } catch (error) {
        console.error('Error fetching event images:', error);
      }
    };
    
    fetchEventImages();
  }, [events]);

  // Get current events
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <CardContainer>
      <AllEventsHeader>All Events</AllEventsHeader>
      {currentEvents.map((event) => (
        <EventCardContainer key={event.id}>
          {Object.values(event.ticketTypes).every((ticketType) => ticketType.numberOfTickets <= 0) && (
            <SoldOutOverlay>
              <SoldOutText>This event is sold out</SoldOutText>
            </SoldOutOverlay>
          )}
          <ImageContainer>
            <Image src={event.pictureLink || '/assets/images/carousel1.jpg'} alt={`Event ${event.id}`} />
          </ImageContainer>
          <EventDetailsContainer>
            <EventTitle as={Link} to={`/event/${event.id}`}>{event.eventName}</EventTitle>
            <EventDescription>{event.eventDesc}</EventDescription>
            <OrganizerInfo>
              <GeoIcon xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-geo-alt" viewBox="0 0 16 16">
                <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10" />
                <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
              </GeoIcon>
              <EventLocation><small>{event.location && typeof event.location === 'string' && event.location.split(',').slice(0, 2).join(',')}</small></EventLocation>
            </OrganizerInfo>
            <EventTags>#{event.tags}</EventTags>
            <br />
            <br />
            <ViewButton as={Link} to={`/event/${event.id}`}>View Event</ViewButton> {/* Use Link to navigate */}
          </EventDetailsContainer>
        </EventCardContainer>
      ))}
      <PaginationContainer>
        {eventsPerPage < events.length && (
          <>
            <PaginationButton onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </PaginationButton>
            {[...Array(Math.ceil(events.length / eventsPerPage))].map((_, index) => (
              <PaginationButton key={index} onClick={() => paginate(index + 1)} className={currentPage === index + 1 ? 'active' : ''}>
                {index + 1}
              </PaginationButton>
            ))}
            <PaginationButton onClick={() => paginate(currentPage + 1)} disabled={currentPage === Math.ceil(events.length / eventsPerPage)}>
              Next
            </PaginationButton>
          </>
        )}
      </PaginationContainer>
    </CardContainer>
  );
};

export default EventCard;