"use client";

import { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import {
  UserIcon,
  ChatBubbleLeftEllipsisIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { WEB_SOCKET_URL } from "@/utils/constants";


interface Message {
  id: string;
  content: string;
  username: string;
  chatId: string;
  timestamp: string;
}

interface User {
  username: string;
  lastSeen: Date;
  online: boolean;
}

let socket: Socket;

const HomeComponent = () => {
  const [username, setUsername] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string>("");
  const [typing, setTyping] = useState<string | null>(null);
  const [userList, setUserList] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username1");
    if (!storedUsername) {
      const inputUsername = prompt("Enter your username:");
      localStorage.setItem(
        "username1",
        inputUsername || `User${Math.floor(Math.random() * 1000)}`
      );
    }
    const randomUsername =
      localStorage.getItem("username1") ||
      `User${Math.floor(Math.random() * 1000)}`;
    setUsername(randomUsername);

    socket = io(WEB_SOCKET_URL);

    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      socket.emit("register", randomUsername);
    });

    socket.on("userList", (users: User[]) => {
      setUserList(users.filter((user) => user.username !== randomUsername));
    });

    socket.on("typing", (data) => {
      if (data.username !== username) {
        setTyping(data.username);
        setTimeout(() => setTyping(null), 3000);
      }
    });

    socket.on("message", (message: Message) => {
      setMessages((prevMessages) => {
        if (!prevMessages.find((msg) => msg.id === message.id)) {
          return [...prevMessages, message];
        }
        return prevMessages;
      });
    });

    socket.on("chatHistory", (chatHistory: Message[]) => {
      setMessages(chatHistory);
    });

    socket.on("userJoined", (data) => {
      console.log("User joined:", data);
    });

    socket.on("userLeft", (data) => {
      console.log("User left:", data);
    });

    socket.on("botResponse", (messageId: string, chunk: string) => {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        const index = updatedMessages.findIndex((msg) => msg.id === messageId);
        if (index !== -1) {
          updatedMessages[index].content += chunk;
        } else {
          updatedMessages.push({
            id: messageId,
            content: chunk,
            username: "Bot",
            chatId,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
        return updatedMessages;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    const messageId = uuidv4();
    const newMessage: Message = {
      chatId,
      content: message,
      id: messageId,
      username,
      timestamp: "",
    };
    socket.emit("sendMessage", newMessage);
    setMessage("");
  };

  const handleJoinRoom = (user: string) => {
    const roomId = [username, user].sort().join("-"); // Generate unique room ID
    setChatId(roomId);
    socket.emit("joinRoom", { userId1: username, userId2: user });
  };

  const handleBotMessage = () => {
    const messageId = uuidv4();
    const newMessage: Message = {
      chatId,
      content: message,
      id: messageId,
      username,
      timestamp: "",
    };
    socket.emit("bot", newMessage);
    setMessages((prevMessages) => [
      ...prevMessages,
      { ...newMessage, username: "You" },
    ]);
    setMessage("");
  };

  const handleTyping = () => {
    socket.emit("typing", { username, chatId });
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-1/4 bg-white dark:bg-gray-800 p-4 border-r border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl mb-4">Messages</h2>
        <ul>
          {userList.map((user) => (
            <li key={user.username} className="mb-2">
              <button
                onClick={() => handleJoinRoom(user.username)}
                className="w-full text-left p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center"
              >
                <span
                  className={`h-3 w-3 mr-2 rounded-full ${
                    user.online ? "bg-green-500" : "bg-gray-500"
                  }`}
                  title={user.online ? "Online" : "Offline"}
                ></span>
                <UserIcon className="h-6 w-6 mr-2" />
                {user.username}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Image
              src="/path-to-your-image.png"
              alt="Room Icon"
              width={40}
              height={40}
              className="rounded-full"
            />
            <div className="ml-4">
              <h3 className="text-lg font-bold">Chat Room {chatId}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Active now
              </p>
            </div>
          </div>
        </div>
        <div
          className="flex-1 p-4 overflow-y-auto"
          style={{ paddingBottom: "60px" }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.username === username ? "justify-end" : "justify-start"
              } mb-4`}
            >
              <div
                className={`px-4 py-2 rounded-lg ${
                  msg.username === username
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                <div>
                  {msg.content}
                  <span className="block text-xs text-right">
                    {msg.username} at {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {typing && (
            <p className="italic text-gray-600 dark:text-gray-400">
              {typing} is typing...
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 left-1/4 right-0">
          <div className="flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyUp={(e) => {
                handleTyping();
                if (e.key === "Enter" && message.trim() !== "") {
                  handleSendMessage();
                }
              }}
              className="flex-1 p-2 border rounded-lg"
              placeholder="Type your message..."
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg ml-2"
            >
              <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
            </button>
            <button
              onClick={handleBotMessage}
              className="bg-green-500 text-white px-4 py-2 rounded-lg ml-2"
            >
              <PlusCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeComponent;
