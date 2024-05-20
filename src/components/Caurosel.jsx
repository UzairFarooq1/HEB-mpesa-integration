import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { doc, getFirestore, collection, query, where, orderBy, getDocs, limit, getDoc } from 'firebase/firestore';
import * as Icon from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';




// Styled components
const CarouselContainer = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
  
`;

const CarouselContent = styled.div`
  display: flex;
  transition: transform 0.5s ease;
  align-items: center;
  justify-content: space-between;
  height: 470px; /* You can set the height according to your need */
`;

const CarouselItem = styled.div`
  flex: 0 0 100%;
  box-sizing: border-box;
  padding: 10px;
  display: flex;
  justify-content: space-between;
`;

const ImageContainer = styled.div`
  width: 350px;
  height: 250px; 
  margin-left:20px;
  padding:10px;
  overflow: hidden;
  margin-right: 20px; 
  object-fit: contain;

`;

const Image = styled.img`
  object-fit: cover; 
  max-width: 350px; /* Set a maximum width */
  max-height: 250px; /* Set a maximum height */
`;


const TextContainer = styled.div`
  background-color: white;
  padding: 0px;
  text-align: center;

`;

const EventTitle = styled.h3`
  color: gold;
  margin-bottom: 10px;
  font-size: 20px;
`;
const EventDescription = styled.h3`
  color: black;
  font-size : 15px;
  margin-bottom: 5px;
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

const ArrowIcon = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: gold;
  font-size: 24px;
  cursor: pointer;
`;

const LeftArrow = styled(ArrowIcon)`
  left: 10px;
`;

const RightArrow = styled(ArrowIcon)`
  right: 10px;
`;

// Carousel component
const Carousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [events, setEvents] = useState([]);
  const db = getFirestore();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsCollection);
    
        const eventsData = await Promise.all(eventsSnapshot.docs.map(async (eventDoc) => {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
    
          // Check if number of tickets for all ticket types is 0 or less
          const allTicketsSoldOut = Object.values(eventData.ticketTypes).every(ticketType => ticketType.numberOfTickets <= 0);
    
          // If all tickets are sold out, exclude this event from the list
          if (allTicketsSoldOut) {
            return null;
          }
    
          // Query the "users" collection to get the organizer's company name
          if (eventData.userId) {
          const userDocRef = doc(db, 'users', eventData.userId);
          const userDocSnapshot = await getDoc(userDocRef);
    
          if (userDocSnapshot.exists()) {
            eventData.organizerCompanyName = userDocSnapshot.data().Company;
          }
        }
    
          return eventData;
        }));
    
        // Filter out null values (events with all tickets sold out)
        const validEvents = eventsData.filter(event => event !== null);
    
        // Limit the number of events to 3
        const limitedEvents = validEvents.slice(0, 3);
    
        console.log('Fetched events:', limitedEvents);
        setEvents(limitedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };
    

    fetchEvents();
  }, [db]);

  const handlePrev = () => {
    setCurrentSlide((prevSlide) => (prevSlide > 0 ? prevSlide - 1 : 0));
  };

  const handleNext = () => {
    setCurrentSlide((prevSlide) => (prevSlide < events.length - 1 ? prevSlide + 1 : events.length - 1));
  };

  return (
    <CarouselContainer>
      <CarouselContent style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
        {events.map((event) => (
          <CarouselItem key={event.id}>
            <ImageContainer>
              <Image src={event.pictureLink || '/assets/images/carousel1.jpg'} alt="Event2" />
            </ImageContainer>
            <TextContainer>
              <EventTitle as={Link} to={`/event/${event.id}`}>{event.eventName}</EventTitle>
              <EventDescription>{event.eventDesc}</EventDescription>
              <p>Organizer: {event.organizerCompanyName}
              <br />
              <small>{event.location && typeof event.location === 'string' && event.location.split(',').slice(0, 2).join(',')}</small>

              <br />
              <small>#{event.tags}</small>
              <br />
              <br />

              </p>
              <ViewButton as={Link} to={`/event/${event.id}`}>View Event</ViewButton> {/* Use Link to navigate */}
            </TextContainer>
          </CarouselItem>
        ))}
      </CarouselContent>

      <LeftArrow onClick={handlePrev}>
        <FaChevronLeft />
      </LeftArrow>
      <RightArrow onClick={handleNext}>
        <FaChevronRight />
      </RightArrow>
    </CarouselContainer>
  );
};

export default Carousel;