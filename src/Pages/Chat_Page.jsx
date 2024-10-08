import React, { useEffect, useState } from "react";
import axios from "axios";
import { Client as TwilioChatClient } from "twilio-chat";
import { useNavigate, useParams } from "react-router-dom";
import Modal from "@mui/material/Modal";
import Chat from "../Pages/Chat";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import Navigation_Bar from "../Components/Navigation_Bar";
import Navigation_Bar_Seller from "../Components/Navigation_Bar_Seller";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  // border: "2px solid #000",
  borderRadius: 3,
  boxShadow: 24,
  p: 4,
};

const ChatPage = () => {
  const [chatClient, setChatClient] = useState(null);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState({});
  const navigate = useNavigate();

  const [open, setOpen] = React.useState(false);
  const [chats, setChats] = useState([]); // Store the chat participants
  const [selectedChat, setSelectedChat] = useState({
    id: " ",
    friendlyName: "Other",
    lastMessage: "",
    author: "",
  }); // Store the selected user for modal
  const [user, setUser] = useState(null);

  const { userId } = useParams();

  useEffect(() => {
    axios
      .get(`http://localhost:5001/users/${userId}`)
      .then((res) => {
        setUser(res.data);
        // setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching user:", err);
        setError("Error fetching user");
        // setLoading(false);
      });
  }, []);

  const handleOpen = (chat) => {
    setSelectedChat(chat);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  useEffect(() => {
    const fetchChatTokenAndInitialize = async () => {
      try {
        const { data } = await axios.post("http://localhost:5001/token", {
          identity: userId,
          friendlyName: user.first_name,
        });

        // Initialize Twilio Chat Client
        const client = await TwilioChatClient.create(data.token);
        setChatClient(client);

        // Fetch user's channels
        const userChannels = await client.getSubscribedChannels();
        setChannels(userChannels.items);

        // Set to store unique usernames
        const uniqueUserDetails = new Map();

        // Fetch members (participants) from each channel
        for (const channel of userChannels.items) {
          const members = await channel.getMembers();
          const messages = await channel.getMessages(); // Get messages for the channel

          const lastMessage =
            messages.items.length > 0
              ? messages.items[messages.items.length - 1]
              : null; // Default to null if no messages exist

          for (const member of members) {
            if (member.identity !== userId) {
              const userDetails = await member.getUser(); // Get user's details
              const lastMessageBody = lastMessage
                ? lastMessage.body
                : "No messages yet"; // Handle cases with no messages

              // If there's a last message, also get the author
              const lastMessageAuthor = lastMessage ? lastMessage.author : null;

              uniqueUserDetails.set(member.identity, {
                friendlyName: userDetails.friendlyName,
                lastMessage: lastMessageBody, // Last message body
                lastMessageAuthor: lastMessageAuthor, // Last message author
              });
            }
          }
        }

        // Convert Set to array and update the state
        const chatsArray = Array.from(
          uniqueUserDetails,
          ([id, { friendlyName, lastMessage, lastMessageAuthor }]) => ({
            id,
            friendlyName,
            lastMessage,
            lastMessageAuthor, // This should now correctly contain the author
          })
        );

        setChats(chatsArray);
        console.log(chatsArray);
      } catch (error) {
        console.error("Error setting up chat client:", error);
      }
    };

    fetchChatTokenAndInitialize();
  }, [user, userId]);

  const stringToColor = (string) => {
    let hash = 0;
    let i;

    for (i = 0; i < string.length; i += 1) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = "#";

    for (i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }

    return color;
  };

  const stringAvatar = (name) => {
    const initials = name
      .split(" ")
      .map((word) => word[0])
      .join("");
    return {
      sx: {
        bgcolor: stringToColor(name),
        width: 45,
        height: 45,
      },
      children: initials,
    };
  };

  return (
    <Box
      sx={{
        backgroundColor: "#e6ffe6",
        height: "100%",
        paddingBottom: "1px",
        minHeight: "100vh",
        display: "flex", // Add flex display
        flexDirection: "column", // Ensure content is stacked vertically
        alignItems: "center",
        filter: open ? "blur(4px)" : "none", // Apply blur effect conditionally
        transition: "filter 0.3s ease", // Smooth transition for blur effect
      }}
    >
      {user?.user_type === "seller" ? (
        <Navigation_Bar_Seller />
      ) : (
        <Navigation_Bar />
      )}
      <Box
        sx={{
          width: "50%",
          backgroundColor: "white",
          marginTop: "20px",
          padding: "10px",
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Typography variant="h5" color="primary" gutterBottom>
          Your Chats
        </Typography>
        <Box
          sx={{
            width: "100%",
            marginTop: "10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {chats.map((chat, index) => (
            <Paper
              key={index}
              sx={{
                minWidth: "70%",
                padding: "10px",
                margin: "5px 0",
                cursor: "pointer",
                transition: "background-color 0.3s",
                display: "flex",
                flexDirection: "column", // Stack items vertically
                alignItems: "flex-start", // Align items to the start
              }}
              elevation={6}
              onClick={() => handleOpen(chat)}
            >
              <Box display="flex" alignItems="center">
                <Avatar {...stringAvatar(chat.friendlyName)} />
                <Typography variant="body1" sx={{ marginLeft: "10px" }}>
                  {chat.friendlyName}
                </Typography>
              </Box>
              {/* Conditional rendering for the author's name */}
              <Typography
                variant="body2"
                sx={{ color: "gray", marginLeft: "55px" }}
              >
                {chat.lastMessage
                  ? `${chat.lastMessageAuthor === userId ? "You" : chat.friendlyName}: ${chat.lastMessage}`
                  : "No messages yet"}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Modal to display the Chat component */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Chat
            userId={userId}
            chatPartnerId={selectedChat.id}
            partnerName={selectedChat.friendlyName}
          />
        </Box>
      </Modal>
    </Box>
  );
};

export default ChatPage;
