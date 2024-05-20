import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../main.jsx";
import { v4 as uuidv4 } from "uuid";
import { useNavigate, useParams } from "react-router-dom";

// Styled components
const TabsContainer = styled.div`
  margin: 2%;
  margin-top: 3%;
  width: 96%;
  height: 1000px;
  border: none;
  border-radius: 10px;
`;

const TabMenu = styled.div`
  width: 100%;
  border: none;
`;
const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
`;
const Tab = styled.div`
  border: none;
  width: 30.6%;
  font-size: 1em;
  padding: 0.7em 1em;
  background: #efefef;
  transition: 0.3s;
  cursor: pointer;
  border-radius: 5px;
  border-top-left-radius: 5px;
  border-to-right-radius: 5px;

  &:not(.active):hover {
    background: #dfdede;
  }
  &.active {
    background: #fff;
  }
`;

const Content = styled.div`
  background: #fff;
  box-shadow: 5px 5px 25px rgba(0, 0, 0, 0.1);
  position: relative;
  width: 100%;
  border-radius: 0 8px 8px 8px;
  overflow: hidden;
  height: 950px;
`;

const ContentContainer = styled.div`
  height: 25em;
  overflow-y: scroll;
  height: 950px;

  /* Scrollbar styles */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #ccc;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #c4c4c4;
  }
`;

const Panel = styled.div`
  padding: 1.5em;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
`;
const TableHeader = styled.th`
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
`;
const TableCell = styled.td`
  border: 1px solid #ddd;
  padding: 8px;
`;
const Loader = styled.div`
  border: 8px solid #f3f3f3;
  border-top: 8px solid gold;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: auto;
  margin-top: 100px;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const Button = styled.button`
  padding: 8px 16px;
  margin: 0 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const EditButton = styled(Button)`
  color: white;
  background-color: gold;
  margin-bottom: 10px;
`;

const createTableData = async (userId) => {
  const data = [];

  try {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const eventData = doc.data();
      const ticketsArray = Object.values(eventData.ticketTypes || {});

      // Check if the event already exists in the data array
      const existingEventIndex = data.findIndex(existing => existing.id === doc.id);

      if (existingEventIndex === -1) {
        // If the event doesn't exist, create a new entry
        let datesArray = [];
        if (ticketsArray.length > 0 && ticketsArray[0].dates instanceof Array) {
          datesArray = ticketsArray[0].dates.map((date) => date.toDate());
        } else if (ticketsArray.length > 0 && ticketsArray[0].dates instanceof Object && ticketsArray[0].dates.toDate) {
          datesArray = [ticketsArray[0].dates.toDate()];
        }

        data.push({
          id: doc.id,
          name: eventData.eventName,
          description: eventData.eventDesc,
          dates: datesArray,
          tickets: ticketsArray, // Add all ticket types to the tickets array
          location:
            eventData.location &&
            typeof eventData.location === "string" &&
            eventData.location.split(",").slice(0, 2).join(","),
        });
      } else {
        // If the event already exists, just add the new ticket types to its existing entry
        data[existingEventIndex].tickets.push(...ticketsArray);
      }
    });
  } catch (error) {
    console.error("Error fetching events:", error);
  }

  return data;
};

const EventsTabsProfile = () => {
  const [activeTab, setActiveTab] = useState(1);
  const [tableData, setTableData] = useState([]);
  const { userId: paramUserId } = useParams();
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        let targetUserId = userId;

        // Use the authenticated user's ID if available, otherwise use the parameter userId
        if (!userId && paramUserId) {
          targetUserId = paramUserId;
        }

        const data = await createTableData(targetUserId);
        setTableData(data);
      } catch (error) {
        console.error("Error fetching table data.", error);
      } finally {
        setIsLoading(false); // Set loading to false when data fetch completes
      }
    };

    fetchData();
  }, [userId, paramUserId, activeTab]); // Fetch data when userId, paramUserId, or activeTab changes

  if (isLoading) {
    return <Loader />;
  }

  const handleTabClick = (tabNumber) => {
    setActiveTab(tabNumber);
  };

  const handleEditClick = (eventId) => {
    // Implement your edit logic here, for example, navigate to an edit page
    navigate(`/Event Registration/${eventId}`);
    console.log(`Edit clicked for event with ID ${eventId}`);
  };

  return (
    <TabsContainer>
      <TabMenu>
        <Tabs>
          <Tab
            className={activeTab === 1 ? "active" : ""}
            onClick={() => handleTabClick(1)}
          >
            Current Events
          </Tab>
          <Tab
            className={activeTab === 2 ? "active" : ""}
            onClick={() => handleTabClick(2)}
          >
            Previous Events
          </Tab>
          <Tab
            className={activeTab === 3 ? "active" : ""}
            onClick={() => handleTabClick(3)}
          >
            Upcoming Events
          </Tab>
        </Tabs>
      </TabMenu>

      <Content>
        <ContentContainer>
          <Panel>
            {activeTab === 1 && (
              <Table>
                <thead>
                  <tr>
                    <TableHeader>Name</TableHeader>
                    <TableHeader style={{ width: "500px" }}>
                      Description
                    </TableHeader>
                    <TableHeader style={{ width: "300px" }}>
                      Tickets
                    </TableHeader>
                    <TableHeader>Location</TableHeader>
                    <TableHeader>Edit</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, index) => (
                    <tr key={index}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      {/* <TableCell>
        {row.dates && row.dates.length > 0 ? (
          <ul>
            {row.dates.map((date, dateIndex) => (
              <li key={dateIndex}>{date.toLocaleString()}</li>
            ))}
          </ul>
        ) : (
          'No dates available'
        )}
      </TableCell> */}
<TableCell>
  {row.tickets.map((ticket, ticketIndex) => (
    <div key={ticketIndex}>
      <p>{`Type : ${ticket.type}`}</p>
      <p>{`Price: ${ticket.price}`}</p>
      <p>{`Tickets: ${ticket.numberOfTickets}`}</p>

      {ticket.dates && Array.isArray(ticket.dates) ? (
        <div>
          {ticket.dates.map((date, index) => (
            <span key={index}>
              {new Date(
                date.seconds * 1000
              ).toLocaleString()}
              {index !== ticket.dates.length - 1 && (
                <br />
              )}{" "}
              {/* Add <br> if it's not the last date */}
            </span>
          ))}
        </div>
      ) : (
        "No dates available"
      )}
      {ticketIndex !== row.tickets.length - 1 && <br />} {/* Add <br> between ticket types */}
    </div>
  ))}
</TableCell>

                      <TableCell>{row.location}</TableCell>
                      <TableCell>
                        <EditButton onClick={() => handleEditClick(row.id)}>
                          Edit
                        </EditButton>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {/* Add similar blocks for Tab 2 and Tab 3 content */}
            {activeTab === 2 && (
              <Table>
                <thead>
                  <tr>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Tickets</TableHeader>
                    <TableHeader>Prices</TableHeader>
                    <TableHeader>Venue</TableHeader>
                  </tr>
                </thead>
                <tbody></tbody>
              </Table>
            )}
            {activeTab === 3 && (
              <Table>
                <thead>
                  <tr>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Tickets</TableHeader>
                    <TableHeader>Prices</TableHeader>
                    <TableHeader>Venue</TableHeader>
                  </tr>
                </thead>
                <tbody></tbody>
              </Table>
            )}
          </Panel>
        </ContentContainer>
      </Content>
    </TabsContainer>
  );
};
export default EventsTabsProfile;