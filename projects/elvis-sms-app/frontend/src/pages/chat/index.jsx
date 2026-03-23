import { useState, useEffect, useRef, useCallback } from "react";

import axios from "axios";

import toast from "react-hot-toast";

import {

  MessageCircle,

  Send,

  Paperclip,

  X,

  Search,

  Plus,

  MoreHorizontal,

  Trash2,

  Users,

  Phone,

  Bell,

  Delete,

  ChevronLeft,

  ArrowLeft,

} from "lucide-react";


export const BASE_URL = import.meta.env.VITE_BASE_URL;

const Chat = ({ darkMode, toggleDarkMode, onOpenCampaigns }) => {

  const [authenticated, setAuthenticated] = useState(false);

  const [phone, setPhone] = useState(import.meta.env.VITE_PHONE_NUMBER || "");

  const [body, setBody] = useState("");

  const [messages, setMessages] = useState([]);

  const [conversations, setConversations] = useState([]);

  const [selectedContact, setSelectedContact] = useState(null);

  const [loadingMessages, setLoadingMessages] = useState(false);

  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const [loadingConversations, setLoadingConversations] = useState(false);

  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const [nextCursor, setNextCursor] = useState(null);

  const bottomRef = useRef(null);



  const [showAddContact, setShowAddContact] = useState(false);

  const [newContact, setNewContact] = useState("");

  const [newContactName, setNewContactName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [showDeleteMenu, setShowDeleteMenu] = useState(null);

  const [deletingConversation, setDeletingConversation] = useState(null);

  const [showNotifications, setShowNotifications] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [dialNumber, setDialNumber] = useState("");

  const [isDialerOpen, setIsDialerOpen] = useState(false);

  const [showAddContactName, setShowAddContactName] = useState(false);

  const [selectedContactForName, setSelectedContactForName] = useState(null);

  const [contactFirstName, setContactFirstName] = useState("");

  const [addingContactName, setAddingContactName] = useState(false);

  const [isMobile, setIsMobile] = useState(false);



  const searchDebounceRef = useRef(null);



  const wsRef = useRef(null);
  const wsPingIntervalRef = useRef(null);
  const selectedContactRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const messageInputRef = useRef(null);

  const isInitialLoad = useRef(true);



  const PASSWORD_KEY = "app_password_verified";

  const PASSWORD_TIMESTAMP_KEY = "app_password_verified_at";

  const DARK_MODE_KEY = "sms_chat_dark_mode";



  useEffect(() => {

    selectedContactRef.current = selectedContact;

  }, [selectedContact]);



  useEffect(() => {

    if (!bottomRef.current) return;



    bottomRef.current.scrollIntoView({

      behavior: "smooth",

      block: "end",

    });

  }, [messages]);



  useEffect(() => {

    const cached = localStorage.getItem(PASSWORD_KEY);

    const cachedTime = localStorage.getItem(PASSWORD_TIMESTAMP_KEY);

    const now = Date.now();



    if (cached && cachedTime && now - Number(cachedTime) < 24 * 60 * 60 * 1000) {

      setAuthenticated(true);

    } else {

      const input = prompt("Enter app password:");

      if (input === import.meta.env.VITE_APP_PASSWORD) {

        localStorage.setItem(PASSWORD_KEY, "true");

        localStorage.setItem(PASSWORD_TIMESTAMP_KEY, now.toString());

        setAuthenticated(true);

      } else {

        toast.error("Incorrect password!");

      }

    }

  }, []);



  useEffect(() => {

    const mql = window.matchMedia("(max-width: 767px)");

    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mql.matches);

    if (mql.addEventListener) {

      mql.addEventListener("change", onChange);

    } else {

      mql.addListener(onChange);

    }

    return () => {

      if (mql.removeEventListener) {

        mql.removeEventListener("change", onChange);

      } else {

        mql.removeListener(onChange);

      }

    };

  }, []);





  useEffect(() => {

    if (!phone) return;

    const q = (searchQuery || "").trim();

    if (!q) return;



    if (searchDebounceRef.current) {

      clearTimeout(searchDebounceRef.current);

    }



    searchDebounceRef.current = setTimeout(async () => {

      try {

        const formattedPhone = formatPhoneNumber(phone);

        const response = await axios.get(`${BASE_URL}/api/conversations/search`, {

          params: { phoneNumber: formattedPhone, q, limit: 20 },

        });



        if (response.data?.success && Array.isArray(response.data.conversations)) {

          setConversations((prev) => {

            const byContact = new Map(prev.map((c) => [c.contact, c]));

            for (const conv of response.data.conversations) {

              const existing = byContact.get(conv.contact);

              byContact.set(conv.contact, {

                ...(existing || {}),

                ...conv,

                unreadCount: existing?.unreadCount || conv.unreadCount || 0,

              });

            }

            return Array.from(byContact.values());

          });

        }

      } catch (err) {

        console.error("Error searching conversations:", err);

      }

    }, 350);



    return () => {

      if (searchDebounceRef.current) {

        clearTimeout(searchDebounceRef.current);

      }

    };

  }, [searchQuery, phone]);



  useEffect(() => {

    if (!authenticated || !phone) return;



    const getWebSocketUrl = () => {

      if (BASE_URL.startsWith("https://")) {

        return BASE_URL.replace("https://", "wss://") + "/ws";

      } else {

        return BASE_URL.replace("http://", "ws://") + "/ws";

      }

    };



    const ws = new WebSocket(getWebSocketUrl());

    wsRef.current = ws;



    ws.onopen = () => {

      console.log("WebSocket connected");

      const formattedPhone = formatPhoneNumber(phone);

      console.log(`Auto-registering phone: ${formattedPhone}`);

      ws.send(JSON.stringify({ type: "register", phone: formattedPhone }));


      if (wsPingIntervalRef.current) {
        clearInterval(wsPingIntervalRef.current);
      }

      wsPingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);

    };



    ws.onmessage = (e) => {

      try {

        const data = JSON.parse(e.data);

        console.log("WS message received:", data);



        switch (data.type) {

          case "status_update":

            console.log(`Message ${data.messageId} status updated to: ${data.status}`);

            setMessages((prev) =>

              prev.map((msg) =>

                msg.messageId === data.messageId || msg.sid === data.messageId

                  ? { ...msg, status: data.status }

                  : msg

              )

            );

            break;



          case "message_received":

            console.log(`New message from ${data.from}: ${data.body}`);

            {

              const fromContact = data.from;



              const newMessage = {

                sid: data.messageId,

                from: data.from,

                to: data.to,

                body: data.body,

                status: "received",

                timestamp: data.timestamp,

                direction: "inbound",

                isYou: false,

              };



              if (selectedContactRef.current === fromContact) {

                setMessages((prev) => [...prev, newMessage]);

              }



              setNotifications((prev) => [

                {

                  id: `${data.messageId || "msg"}-${Date.now()}`,

                  contact: fromContact,

                  body: data.body,

                  timestamp: data.timestamp || new Date().toISOString(),

                  seen: selectedContactRef.current === fromContact,

                },

                ...prev,

              ]);



              setConversations((prev) => {

                const updated = [...prev];

                const existingIndex = updated.findIndex((c) => c.contact === fromContact);

                const isCurrentlySelected = selectedContactRef.current === fromContact;

                const unreadInc = isCurrentlySelected ? 0 : 1;



                const nextConv = {

                  contact: fromContact,

                  lastMessage: data.body,

                  lastMessageTime: data.timestamp || new Date().toISOString(),

                  unreadCount: unreadInc,

                  messageCount: 1,

                  lastMessageDirection: "inbound",

                };



                if (existingIndex >= 0) {

                  const existing = updated[existingIndex];

                  updated[existingIndex] = {

                    ...existing,

                    lastMessage: data.body,

                    lastMessageTime: data.timestamp || new Date().toISOString(),

                    lastMessageDirection: "inbound",

                    unreadCount: isCurrentlySelected ? 0 : (existing.unreadCount || 0) + 1,

                  };

                  const [moved] = updated.splice(existingIndex, 1);

                  updated.unshift(moved);

                } else {

                  updated.unshift(nextConv);

                }



                return updated;

              });

            }

            break;



          case "sent":

            console.log(`Message sent with SID: ${data.twilioSid}`);

            setMessages((prev) =>

              prev.map((msg) =>

                msg.messageId === data.messageId

                  ? {

                    ...msg,

                    sid: data.twilioSid,

                    status: data.status,

                    type: "sent",

                  }

                  : msg

              )

            );

            break;



          case "registered":

            console.log(`Successfully registered phone: ${data.phone}`);

            fetchConversations();

            break;

        }

      } catch (err) {

        console.error("Error parsing WebSocket message:", err);

      }

    };



    ws.onclose = () => {
      if (wsPingIntervalRef.current) {
        clearInterval(wsPingIntervalRef.current);
        wsPingIntervalRef.current = null;
      }
    };



    ws.onerror = (error) => {

      console.error("WebSocket error:", error);

    };



    return () => {

      if (wsPingIntervalRef.current) {
        clearInterval(wsPingIntervalRef.current);
        wsPingIntervalRef.current = null;
      }

      if (wsRef.current) {

        wsRef.current.close();

      }

    };

  }, [authenticated, phone]);



  useEffect(() => {

    if (authenticated && phone) {

      fetchConversations();

    }

  }, [authenticated, phone]);



  useEffect(() => {

    if (selectedContact) {

      setMessages([]);

      setHasMoreMessages(false);

      setNextCursor(null);

      fetchMessages(selectedContact, null, true);
      messageInputRef.current.focus();
    }

  }, [selectedContact]);



  useEffect(() => {

    if (messagesContainerRef.current && isInitialLoad.current && messages.length > 0) {

      setTimeout(() => {

        scrollToBottom();

        isInitialLoad.current = false;

      }, 100);

    } else if (messagesContainerRef.current && messages.length > 0) {

      const container = messagesContainerRef.current;

      const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 100;

      if (isNearBottom) {

        scrollToBottom();

      }

    }

  }, [messages]);



  const scrollToBottom = () => {

    if (messagesContainerRef.current) {

      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;

    }

  };



  const fetchConversations = async () => {

    if (!phone) return;



    setLoadingConversations(true);

    try {

      const formattedPhone = formatPhoneNumber(phone);

      const response = await axios.get(`${BASE_URL}/api/conversations`, {

        params: { phoneNumber: formattedPhone },

      });



      if (response.data.success) {

        setConversations(response.data.conversations);

      }

    } catch (error) {

      console.error("Error fetching conversations:", error);

    } finally {

      setLoadingConversations(false);

    }

  };



  const fetchMessages = async (contact, beforeDate = null, isInitial = false) => {

    if (!phone) return;



    if (isInitial) {

      setLoadingMessages(true);

    } else {

      setLoadingOlderMessages(true);

    }



    try {

      const formattedPhone = formatPhoneNumber(phone);

      const params = {

        phoneNumber: formattedPhone,

        contact: formatPhoneNumber(contact),

        pageSize: 20,

      };



      if (beforeDate) {

        params.beforeDate = beforeDate;

      }



      const response = await axios.get(`${BASE_URL}/api/messages`, { params });



      if (response.data.success) {

        if (isInitial || !beforeDate) {

          setMessages(response.data.messages);

          isInitialLoad.current = true;

        } else {

          setMessages((prev) => [...response.data.messages, ...prev]);

        }



        setHasMoreMessages(response.data.hasMore);

        setNextCursor(response.data.nextCursor);

      }

    } catch (error) {

      console.error("Error fetching messages:", error);

      toast.error("Failed to load messages");

    } finally {

      setLoadingMessages(false);

      setLoadingOlderMessages(false);

    }

  };



  const loadOlderMessages = () => {

    if (hasMoreMessages && nextCursor && selectedContact) {

      fetchMessages(selectedContact, nextCursor, false);

    }

  };



  const handleScroll = useCallback(() => {

    if (!messagesContainerRef.current || loadingOlderMessages || !hasMoreMessages) return;



    const container = messagesContainerRef.current;

    const scrollTop = container.scrollTop;



    if (scrollTop < 50) {

      loadOlderMessages();

    }

  }, [hasMoreMessages, loadingOlderMessages, selectedContact, nextCursor]);



  useEffect(() => {

    const container = messagesContainerRef.current;

    if (container) {

      container.addEventListener("scroll", handleScroll);

      return () => container.removeEventListener("scroll", handleScroll);

    }

  }, [handleScroll]);



  const formatPhoneNumber = (phoneNum) => {

    let formatted = phoneNum.trim();

    if (!formatted.startsWith("+")) {

      formatted = "+" + formatted;

    }

    return formatted;

  };



  const sendMessage = () => {

    if (!selectedContact || !body.trim() || !wsRef.current) {

      toast("Please select a conversation and enter a message");

      return;

    }



    const formattedTo = formatPhoneNumber(selectedContact);

    const messageId = `msg-${Date.now()}`;

    console.log(`Sending message ${messageId} to ${formattedTo}`);



    const optimisticMessage = {

      messageId,

      from: formatPhoneNumber(phone),

      to: formattedTo,

      body,

      status: "sending",

      timestamp: new Date().toISOString(),

      direction: "outbound",

      isYou: true,

    };

    setMessages((prev) => [...prev, optimisticMessage]);



    wsRef.current.send(

      JSON.stringify({

        type: "send",

        to: formattedTo,

        body,

        messageId,

      })

    );



    setConversations((prev) => {

      const updated = [...prev];

      const existingIndex = updated.findIndex((c) => c.contact === formattedTo);

      const isCurrentlySelected = selectedContact === formattedTo;

      const unreadInc = isCurrentlySelected ? 0 : 1;



      const nextConv = {

        contact: formattedTo,

        lastMessage: body,

        lastMessageTime: new Date().toISOString(),

        unreadCount: unreadInc,

        messageCount: 1,

        lastMessageDirection: "outbound",

      };



      if (existingIndex >= 0) {

        updated[existingIndex] = {

          ...updated[existingIndex],

          lastMessage: body,

          lastMessageTime: new Date().toISOString(),

          lastMessageDirection: "outbound",

          unreadCount: isCurrentlySelected ? 0 : (updated[existingIndex].unreadCount || 0) + 1,

        };

        const [movedConv] = updated.splice(existingIndex, 1);

        updated.unshift(movedConv);

      } else {

        updated.unshift(nextConv);

      }



      return updated;

    });

    setBody("");

    setTimeout(() => {

      messageInputRef.current?.focus();

      scrollToBottom();

    }, 0);

  };



  const selectConversation = async (contact) => {

    setSelectedContact(contact);

    setConversations((prev) =>

      prev.map((c) => (c.contact === contact ? { ...c, unreadCount: 0 } : c))

    );

    setNotifications((prev) =>

      prev.map((n) => (n.contact === contact ? { ...n, seen: true } : n))

    );



    // Mark notifications as seen in backend

    try {

      const formattedPhone = formatPhoneNumber(phone);

      const formattedContact = formatPhoneNumber(contact);



      await axios.post(`${BASE_URL}/api/notifications/mark-seen`, {

        phoneNumber: formattedPhone,

        contactPhone: formattedContact,

      });

    } catch (error) {

      console.error('Error marking notifications as seen:', error);

      // Don't show error to user as this is a background operation

    }

  };



  const handleKeyPress = (e) => {

    if (e.key === "Enter" && !e.shiftKey) {

      e.preventDefault();

      sendMessage();

    }

  };



  const handleAddContact = () => {

    if (!newContact.trim()) return;



    const formatted = formatPhoneNumber(newContact);



    setConversations((prev) => {

      const exists = prev.find((c) => c.contact === formatted);

      if (exists) return prev;



      return [

        {

          contact: formatted,

          lastMessage: "",

          lastMessageTime: new Date().toISOString(),

          unreadCount: 0,

          messageCount: 0,

          lastMessageDirection: "outbound",

        },

        ...prev,

      ];

    });

    setSelectedContact(formatted);

    setNewContact("");

    setShowAddContact(false);

  };



  const handleDialPad = (digit) => {

    setDialNumber((prev) => prev + digit);

  };



  const handleDeleteDigit = () => {

    setDialNumber((prev) => prev.slice(0, -1));

  };



  const handleCall = (numberOverride) => {

    const target = (numberOverride ?? dialNumber).trim();

    if (target) {

      setIsDialerOpen(true);

      setDialNumber(target);

    }

  };



  const handleDeleteConversation = async (contact) => {

    setShowDeleteMenu(null);

    const result = await Swal.fire({
      title: 'Delete Chat?',
      text: `Delete chat with ${contact}? This will permanently delete messages from the server and cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;

    setDeletingConversation(contact);

    try {

      const formattedPhone = formatPhoneNumber(phone);

      const formattedContact = formatPhoneNumber(contact);

      const response = await axios.delete(`${BASE_URL}/api/conversations/delete`, {

        data: {

          phoneNumber: formattedPhone,

          contact: formattedContact,

        },

      });

      if (!response.data?.success) {

        toast.error(response.data?.error || "Delete failed");

      }

      setConversations((prev) => prev.filter((c) => c.contact !== contact));

      if (selectedContact === contact) {

        setSelectedContact(null);

        setMessages([]);

        setHasMoreMessages(false);

        setNextCursor(null);

      }

      toast.success("Chat deleted");

    } catch (error) {

      console.error("Error deleting conversation:", error);

      toast.error(error.response?.data?.error || error.message || "Failed to delete chat");

    } finally {

      setDeletingConversation(null);

    }

  };



  const handleAddContactName = async () => {

    if (!selectedContactForName || !contactFirstName.trim()) {

      toast.error("Please enter a contact name");

      return;

    }

    setAddingContactName(true);

    try {

      const response = await axios.post(`${BASE_URL}/api/campaigns/custom-contacts/`, {

        phone: selectedContactForName,

        first_name: contactFirstName.trim(),

      });

      if (response.data.success) {

        toast.success("Contact name added successfully!");

        setConversations((prev) =>

          prev.map((conv) =>

            conv.contact === selectedContactForName

              ? { ...conv, contactName: contactFirstName.trim() }

              : conv

          )

        );

        setShowAddContactName(false);

        setSelectedContactForName(null);

        setContactFirstName("");

      }

    } catch (error) {

      console.error("Error adding contact name:", error);

      toast.error("Failed to add contact name");

    } finally {

      setAddingContactName(false);

    }

  };



  const filteredConversations = conversations.filter((conv) => {

    const q = (searchQuery || "").trim().toLowerCase();

    if (!q) return true;

    return (

      (conv.name || "").toLowerCase().includes(q) ||

      (conv.contact || "").toLowerCase().includes(q) ||

      (conv.lastMessage || "").toLowerCase().includes(q)

    );

  });

  const fetchNotifications = useCallback(async () => {

    if (!authenticated || !phone) return;

    setNotificationsLoading(true);

    try {

      const formattedPhone = formatPhoneNumber(phone);

      const response = await axios.get(`${BASE_URL}/api/notifications`, {

        params: { phoneNumber: formattedPhone, limit: 50 }

      });

      if (response.data?.success && Array.isArray(response.data.notifications)) {

        setNotifications(response.data.notifications);

      }

    } catch (error) {

      console.error('Error fetching notifications:', error);

      toast.error('Failed to load notifications');

    } finally {

      setNotificationsLoading(false);

    }

  }, [authenticated, phone]);

  useEffect(() => {

    if (showNotifications) {

      fetchNotifications();

    }

  }, [showNotifications, fetchNotifications]);

  useEffect(() => {

    (async () => {

      try {

        const formattedPhone = formatPhoneNumber(phone);

        const response = await axios.get(`${BASE_URL}/api/notifications`, {

          params: { phoneNumber: formattedPhone, limit: 50 }

        });

        if (response.data?.success && Array.isArray(response.data.notifications)) {

          setNotifications(response.data.notifications);

        }

      } catch (error) {

        console.error('Error fetching notifications:', error);

        toast.error('Failed to load notifications');

      } finally {

        setNotificationsLoading(false);

      }

    })()

  }, []);

  const unreadNotificationsCount = notifications.filter((n) => !n.seen).length;

  if (!authenticated) {

    return (

      <div className={`flex items-center justify-center min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>

        <div className="text-center">

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>

          <p className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Verifying password...</p>

        </div>

      </div>

    );

  }

  const bgColor = darkMode ? "bg-gray-900" : "bg-gray-50";

  const textColor = darkMode ? "text-gray-100" : "text-gray-900";

  const textColorMuted = darkMode ? "text-gray-400" : "text-gray-600";

  const textColorLight = darkMode ? "text-gray-300" : "text-gray-700";

  const bgSidebar = darkMode ? "bg-gray-800" : "bg-white";

  const bgMessageIn = darkMode ? "bg-gray-700" : "bg-white";

  const bgMessageOut = darkMode ? "bg-blue-600" : "bg-blue-500";

  const borderColor = darkMode ? "border-gray-700" : "border-gray-200";

  const hoverBg = darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50";

  const selectedBg = darkMode ? "bg-blue-900" : "bg-blue-50";

  const inputBg = darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900";

  const placeholderColor = darkMode ? "placeholder-gray-500" : "placeholder-gray-400";

  return (
    <div className={`flex h-screen w-full overflow-hidden ${bgColor} transition-colors duration-200 ${isMobile ? 'flex-col' : ''}`}>

      {/* New Message Modal */}

      {showAddContact && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50">

          <div className={`rounded-2xl shadow-2xl w-full max-w-md mx-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}>

            <div className={`p-6 border-b ${borderColor}`}>

              <div className="flex items-center justify-between">

                <h3 className={`text-xl font-semibold ${textColor}`}>New Message</h3>

                <button

                  onClick={() => {

                    setShowAddContact(false);

                    setNewContact("");

                    setNewContactName("");

                  }}

                  className="p-[5px] hover:bg-gray-100 rounded-lg transition-colors"

                >

                  <X size={20} className="text-gray-500" />

                </button>

              </div>

            </div>

            <div className="p-6 space-y-4">

              <div>

                <label className={`block text-sm font-medium ${textColorLight} mb-2`}>

                  Contact Name (Optional)

                </label>

                <input

                  type="text"

                  placeholder="John Doe"

                  value={newContactName || ""}

                  onChange={(e) => setNewContactName(e.target.value)}

                  className={`w-full px-4 py-3 ${inputBg} border ${borderColor} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}

                />

              </div>

              <div>

                <label className={`block text-sm font-medium ${textColorLight} mb-2`}>

                  Phone Number

                </label>

                <input

                  type="tel"

                  placeholder="+1 234 567 8900"

                  value={newContact}

                  onChange={(e) => setNewContact(e.target.value)}

                  className={`w-full px-4 py-3 ${inputBg} border ${borderColor} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}

                />

              </div>

              <div>

                <label className={`block text-sm font-medium ${textColorLight} mb-2`}>

                  Message

                </label>

                <textarea

                  placeholder="Type your message here..."

                  ref={messageInputRef}

                  value={body}

                  onChange={(e) => setBody(e.target.value)}

                  onKeyPress={handleKeyPress}

                  rows={4}

                  className={`w-full px-4 py-3 ${inputBg} border ${borderColor} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}

                />

              </div>

            </div>

            <div className={`p-6 border-t ${borderColor} flex items-center justify-end gap-3`}>

              <button

                onClick={() => {

                  setShowAddContact(false);

                  setNewContact("");

                  setNewContactName("");

                  setBody("");

                }}

                className={`px-6 py-2.5 ${textColorLight} hover:bg-gray-100 rounded-xl transition-colors font-medium`}

              >

                Cancel

              </button>

              <button

                onClick={handleAddContact}

                disabled={!newContact.trim()}

                className="px-6 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"

              >

                <Send size={16} />

                Send Message

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Phone Dialer - Left Side */}

      {isDialerOpen && (

        <div className={`fixed inset-0 z-50 w-full h-full ${bgSidebar} flex flex-col md:static md:z-auto md:w-80 md:h-screen border-r-0 md:border-r ${borderColor}`}>
          <div className={`p-4 border-b ${borderColor}`}>

            <h1 className={`text-2xl font-semibold ${textColor}`}>Keypad</h1>

          </div>

          <div className={`p-4 border-b ${borderColor} h-20 flex items-center justify-center flex-shrink-0`}>

            <div className="text-center w-full">

              <input

                type="text"

                value={dialNumber}

                readOnly

                placeholder="Enter number"

                className={`w-full text-2xl font-light text-center bg-transparent border-none focus:outline-none mb-1 ${textColor}`}

              />

              {dialNumber && <p className={`text-xs ${textColorMuted}`}>Add contact info</p>}

            </div>

          </div>

          <div className="flex-1 flex flex-col justify-center px-4 py-4 min-h-0 overflow-hidden">

            <div className="grid grid-cols-3 gap-2.5">

              {[

                { num: "1", letters: "" },

                { num: "2", letters: "ABC" },

                { num: "3", letters: "DEF" },

                { num: "4", letters: "GHI" },

                { num: "5", letters: "JKL" },

                { num: "6", letters: "MNO" },

                { num: "7", letters: "PQRS" },

                { num: "8", letters: "TUV" },

                { num: "9", letters: "WXYZ" },

                { num: "*", letters: "" },

                { num: "0", letters: "+" },

                { num: "#", letters: "" },

              ].map((key) => (

                <button

                  key={key.num}

                  onClick={() => handleDialPad(key.num)}

                  className={`aspect-square rounded-full ${darkMode ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500" : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300"} transition-colors flex flex-col items-center justify-center h-16 w-16 mx-auto`}

                >

                  <span className={`text-2xl font-light ${textColor}`}>{key.num}</span>

                  {key.letters && (

                    <span className={`text-[0.6rem] leading-none ${textColorMuted}`}>{key.letters}</span>

                  )}

                </button>

              ))}

            </div>

            <div className="flex items-center justify-center gap-8 mt-4 flex-shrink-0">

              {dialNumber && (

                <button

                  onClick={handleDeleteDigit}

                  className={`p-3 rounded-full ${darkMode ? "hover:bg-gray-700 active:bg-gray-600" : "hover:bg-gray-100 active:bg-gray-200"} transition-colors`}

                >

                  <Delete size={22} className={darkMode ? "text-gray-200" : "text-gray-700"} />

                </button>

              )}

              <button

                onClick={() => handleCall()}

                disabled={!dialNumber}

                className="p-4 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"

              >

                <Phone size={24} className="text-white" />

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Chat Sidebar */}

      <div id="chatsidebar" className={`${selectedContact ? 'hidden md:flex' : 'flex'} fixed inset-0 z-40 w-full h-full ${bgSidebar} flex-col transition-colors duration-200 md:static md:z-auto md:w-80 md:h-screen md:border-r ${borderColor}`}>
        {/* Header */}

        <div className={`p-4 border-b ${borderColor}`}>


          <div className="flex items-center justify-between mb-4">

            <h2 className={`text-2xl font-semibold ${textColor}`}>Messages</h2>

            <div className="flex items-center gap-1">

              <button

                onClick={() => setShowNotifications(true)}

                className="p-[5px] hover:bg-gray-100 rounded-lg transition-colors relative"

                title="Notifications"

                disabled={notificationsLoading}

              >

                {notificationsLoading ? (

                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>

                ) : (

                  <Bell size={20} className="text-gray-500" />

                )}

                {unreadNotificationsCount > 0 && (

                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] leading-[18px] text-center">

                    {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}

                  </span>

                )}

              </button>

              <button

                onClick={() => setShowAddContact(true)}

                className="p-[5px] hover:bg-gray-100 rounded-lg transition-colors"

                title="New Message"

              >

                <Plus size={20} className="text-blue-500" />

              </button>

              <button

                onClick={() => setIsDialerOpen((v) => !v)}

                className="p-[5px] hover:bg-gray-100 rounded-lg transition-colors"

                title={isDialerOpen ? "Hide Keypad" : "Show Keypad"}

              >

                <Phone size={20} className={isDialerOpen ? "text-green-500" : "text-blue-500"} />

              </button>

              <button

                onClick={() => onOpenCampaigns?.()}

                className="p-[5px] hover:bg-gray-100 rounded-lg transition-colors"

                title="View Campaigns"

              >

                <Users size={20} className="text-blue-500" />

              </button>

              <button

                onClick={() => toggleDarkMode()}

                className={`p-2 rounded-lg ${darkMode ? "bg-gray-700 text-yellow-300" : "bg-gray-100 text-gray-700"} hover:opacity-80 transition-all`}

                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}

              >

                {darkMode ? (

                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">

                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />

                  </svg>

                ) : (

                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">

                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />

                  </svg>

                )}

              </button>

            </div>

          </div>

          {/* Search */}

          <div className="relative">

            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

            <input

              type="text"

              placeholder="Search conversations"

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}

            />

          </div>

          {/* Twilio Number */}

          <div className={`flex items-center gap-1 mt-2`}>

            <p className={`text-xs ${textColorMuted} `}>Your Twilio Number</p>

            <p className={`text-xs font-medium ${textColorMuted}`}>{phone || "+19198041653"}</p>

          </div>

        </div>

        {/* Conversations List */}

        <div className="flex-1 overflow-y-auto">

          {filteredConversations.length > 0 ? (

            filteredConversations.map((conv, idx) => (

              <div

                key={conv.contact || idx}

                onClick={() => selectConversation(conv.contact)}

                className={`group relative px-4 py-3 border-b ${borderColor} cursor-pointer transition-colors ${selectedContact === conv.contact ? (darkMode ? "bg-blue-900/30" : "bg-blue-50") : hoverBg}`}

              >

                <div className="flex items-start justify-between mb-1">

                  <div className="flex-1">

                    <p className={`font-semibold ${textColor} text-sm`}>

                      {conv.contactName || conv.contact}

                    </p>

                    {conv.contactName && <p className={`text-xs ${textColorMuted}`}>{conv.contact}</p>}

                  </div>

                  <div className="flex items-center gap-2">

                    {!isMobile && (

                      <>

                        <button

                          onClick={(e) => {

                            e.stopPropagation();

                            handleCall(conv.contact);

                          }}

                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-green-100 rounded transition-opacity"

                          title="Call"

                        >

                          <Phone size={16} className="text-green-600" />

                        </button>

                        <button

                          onClick={(e) => {

                            e.stopPropagation();

                            setShowDeleteMenu(showDeleteMenu === conv.contact ? null : conv.contact);

                          }}

                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"

                          title="Menu"

                        >

                          <MoreHorizontal size={16} className="text-gray-600" />

                        </button>

                      </>

                    )}

                    <span className={`text-xs ${textColorMuted}`}>

                      {conv.lastMessageTime

                        ? new Date(conv.lastMessageTime).toLocaleTimeString([], {

                          hour: "2-digit",

                          minute: "2-digit",

                        })

                        : ""}

                    </span>

                  </div>

                </div>

                <div className="flex items-center justify-between">

                  <p className={`text-sm ${textColorMuted} truncate flex-1`}>

                    {conv.lastMessageDirection === "outbound" && "You: "}

                    {conv.lastMessage}

                  </p>

                  {conv.unreadCount > 0 && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full" />}

                </div>

                {showDeleteMenu === conv.contact && (

                  <div className={`absolute right-4 top-12 rounded-lg shadow-lg border py-1 z-10 min-w-[140px] ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>

                    <button

                      onClick={(e) => {

                        e.stopPropagation();

                        setSelectedContactForName(conv.contact);

                        const currentName = conv.contactName || "";

                        setContactFirstName(currentName);

                        setShowAddContactName(true);

                        setShowDeleteMenu(null);

                      }}

                      className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"

                    >

                      <Users size={14} />

                      Add Contact Name

                    </button>

                    <button

                      onClick={(e) => {

                        e.stopPropagation();

                        handleDeleteConversation(conv.contact);

                      }}

                      disabled={deletingConversation === conv.contact}

                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"

                    >

                      {deletingConversation === conv.contact ? (

                        <>

                          <div className="animate-spin rounded-full h-3 w-3 border border-red-600 border-t-transparent"></div>

                          Deleting...

                        </>

                      ) : (

                        <>

                          <Trash2 size={14} />

                          Delete Chat

                        </>

                      )}

                    </button>

                  </div>

                )}

              </div>

            ))

          ) : (

            <div className="flex flex-col items-center justify-center h-64 text-gray-500">

              <MessageCircle size={40} className="mb-4 text-gray-400" />

              <p className={textColorMuted}>No conversations yet</p>

            </div>

          )}

        </div>

        {/* New Campaign Button */}

        <div className={`p-4 border-t ${borderColor}`}>

          <button

            onClick={() => onOpenCampaigns?.()}

            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"

          >

            New Campaign

          </button>

        </div>

      </div>

      {/* Chat Main Content */}

      <div id="chatMainContent" className={`${selectedContact ? 'fixed inset-0 z-40 w-full h-full flex' : 'hidden'} flex-col md:static md:z-auto md:flex md:flex-1`}>

        {selectedContact ? (

          <>

            {/* Chat Header */}

            <div className={`border-b ${borderColor} ${darkMode ? "bg-gray-800" : "bg-white"} px-6 py-4 transition-colors duration-200`}>

              <div className="flex items-center justify-between">

                <button

                  onClick={() => setSelectedContact(null)}

                  className={`mr-3 p-2 rounded-lg transition-colors md:hidden ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}

                  title="Back to conversations"

                >

                  <ArrowLeft size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />

                </button>

                <div className="flex-1">

                  <h2 className={`text-lg font-semibold ${textColor}`}>

                    {conversations.find(c => c.contact === selectedContact)?.contactName || selectedContact}

                  </h2>

                  <p className={`text-sm ${textColorMuted}`}>

                    SMS Conversation

                  </p>

                </div>

                <div className="flex items-center gap-2">

                  <button

                    onClick={() => {

                      setSelectedContactForName(selectedContact);

                      const currentName = conversations.find(c => c.contact === selectedContact)?.contactName || "";

                      setContactFirstName(currentName);

                      setShowAddContactName(true);

                    }}

                    className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}

                    title="Edit Contact Name"

                  >

                    <Users size={16} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />

                  </button>

                  <button

                    onClick={() => handleCall(selectedContact)}

                    className="p-3 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 transition-colors"

                    title="Call"

                  >

                    <Phone size={20} className="text-white" />

                  </button>

                </div>

              </div>

            </div>



            {/* Messages */}

            <div

              ref={messagesContainerRef}

              className={`flex-1 overflow-y-auto p-6 space-y-4 transition-colors duration-200 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}

              style={{ scrollBehavior: "smooth" }}

            >

              {/* Loading indicator for older messages */}

              {loadingOlderMessages && (

                <div className="text-center py-4">

                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>

                </div>

              )}



              {/* Load more button */}

              {hasMoreMessages && !loadingOlderMessages && (

                <div className="text-center mb-4">

                  <button

                    onClick={loadOlderMessages}

                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${darkMode

                      ? "text-blue-300 bg-blue-900 hover:bg-blue-800"

                      : "text-blue-600 bg-blue-50 hover:bg-blue-100"

                      }`}

                  >

                    Load older messages

                  </button>

                </div>

              )}



              {/* Loading initial messages */}

              {loadingMessages && messages.length === 0 && (

                <div className="text-center py-8">

                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>

                </div>

              )}



              {/* Messages */}

              {messages.map((msg, idx) => (

                <div

                  key={msg.sid || msg.messageId || idx}

                  className={`flex ${msg.direction === "outbound" || msg.isYou ? "justify-end" : "justify-start"}`}

                >

                  <div className={`max-w-md ${msg.direction === "outbound" || msg.isYou ? "order-2" : "order-1"}`}>

                    <div

                      className={`px-4 py-2.5 rounded-2xl ${msg.direction === "outbound" || msg.isYou

                        ? "bg-blue-500 text-white rounded-br-md"

                        : `${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"} rounded-bl-md shadow-sm border ${borderColor}`

                        }`}

                    >

                      <div className="whitespace-pre-wrap break-words text-sm">{msg.body}</div>

                    </div>

                    <div className={`flex items-center justify-end space-x-2 text-xs ${textColorMuted} mt-1 ${msg.direction === "outbound" || msg.isYou ? "text-right" : "text-left"}`}>

                      <span>

                        {new Date(msg.timestamp || msg.dateSent).toLocaleTimeString([], {

                          hour: "2-digit",

                          minute: "2-digit",

                        })}

                      </span>

                      {(msg.status === "sending" || msg.status === "queued") && (
                        <span className="inline-flex items-center" title="Sending...">
                          <svg
                            className="animate-spin h-3 w-3 text-current"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        </span>
                      )}

                      {msg.status === "sent" && (
                        <span className="text-blue-400" title="Sent">
                          ✓
                        </span>
                      )}

                      {msg.status === "delivered" && (
                        <span className="text-green-400" title="Delivered">
                          ✓✓
                        </span>
                      )}

                      {(msg.status === "failed" || msg.status === "undelivered") && (
                        <span className="text-red-400" title="Failed">
                          ✗
                        </span>
                      )}

                      {msg.status === "canceled" && (
                        <span className="text-orange-400" title="Canceled">
                          ⚠
                        </span>
                      )}

                      {/* Fallback for unknown status */}
                      {!msg.status && (msg.direction === "outbound" || msg.isYou) && (
                        <span className="text-gray-400" title="Status unknown">
                          ?
                        </span>
                      )}

                    </div>

                  </div>

                </div>

              ))}

              <div ref={bottomRef} />



              {/* Empty State */}

              {!loadingMessages && messages.length === 0 && (

                <div className="flex flex-col items-center justify-center h-64">

                  <div className={`w-16 h-16 mb-4 ${darkMode ? "bg-gray-800" : "bg-gray-200"} rounded-full flex items-center justify-center`}>

                    <MessageCircle size={40} className={darkMode ? "text-gray-600" : "text-gray-400"} />

                  </div>

                  <p className={`text-lg font-medium ${textColorMuted}`}>No messages yet</p>

                  <p className={`text-sm ${textColorMuted}`}>Start the conversation by sending a message</p>

                </div>

              )}

            </div>



            {/* Message Input */}

            <div className={`border-t ${borderColor} ${darkMode ? "bg-gray-800" : "bg-white"} p-4 transition-colors duration-200`}>

              <div className="flex items-center gap-3">

                <button

                  type="button"

                  className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}

                  title="Attach"

                >

                  <Paperclip size={20} className={darkMode ? "text-gray-300" : "text-gray-500"} />

                </button>

                <input

                  type="text"

                  ref={messageInputRef}

                  value={body}

                  onChange={(e) => setBody(e.target.value)}

                  onKeyPress={handleKeyPress}
                  autoFocus
                  focused
                  placeholder="iMessage"

                  className={`flex-1 px-4 py-2.5 ${darkMode ? "bg-gray-700" : "bg-gray-100"} rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${textColor}`}

                />

                <button

                  onClick={sendMessage}

                  disabled={!body.trim()}

                  className={`p-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors ${!body.trim() ? "opacity-50 cursor-not-allowed" : ""}`}

                >

                  <Send size={18} />

                </button>

              </div>

            </div>

          </>

        ) : (

          /* Empty State */

          <div className={`flex-1 flex items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>

            <div className="text-center">

              <div className={`w-24 h-24 mx-auto mb-4 ${darkMode ? "bg-gray-800" : "bg-gray-200"} rounded-full flex items-center justify-center`}>

                <MessageCircle size={40} className={darkMode ? "text-gray-600" : "text-gray-400"} />

              </div>

              <h3 className={`text-xl font-semibold ${textColor} mb-2`}>Welcome to SMS Chat</h3>

              <p className={textColorMuted}>Select a conversation or start a new one</p>

            </div>

          </div>

        )}

      </div>



      {/* Notification Dialog */}

      {showNotifications && (

        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">

          <div className={`w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl max-h-[70vh] flex flex-col`}>

            {/* Header */}

            <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>

              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h2>

              <button

                onClick={() => setShowNotifications(false)}

                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}

              >

                <X size={20} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />

              </button>

            </div>



            {/* Notifications List */}

            <div className="flex-1 overflow-y-auto">

              {notificationsLoading ? (

                <div className="flex items-center justify-center py-8">

                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>

                </div>

              ) : notifications.length === 0 ? (

                <div className="flex flex-col items-center justify-center py-8">

                  <Bell size={40} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />

                  <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No notifications yet</p>

                </div>

              ) : (

                notifications.map((notification) => (

                  <div

                    key={notification.id}

                    onClick={() => {

                      selectConversation(notification.contact);

                      setShowNotifications(false);

                    }}

                    className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} cursor-pointer transition-colors ${!notification.seen ? (darkMode ? 'bg-blue-900/20' : 'bg-blue-50') : ''

                      } ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}

                  >

                    <div className="flex items-start justify-between mb-2">

                      <div className="flex-1">

                        <div className="flex items-center gap-2 mb-1">

                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>

                            {conversations.find(c => c.contact === notification.contact)?.contactName || notification.contact}

                          </span>

                          {!notification.seen && (

                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>

                          )}

                        </div>

                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-2`}>

                          {notification.body}

                        </p>

                      </div>

                    </div>

                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>

                      {new Date(notification.timestamp).toLocaleString()}

                    </p>

                  </div>

                ))

              )}

            </div>



            {/* Footer */}

            <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>

              <button

                onClick={() => {

                  setNotifications([]);

                  setShowNotifications(false);

                }}

                className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${darkMode

                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'

                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

                  }`}

              >

                Clear All Notifications

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Add Contact Name Modal */}

      {showAddContactName && (

        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">

          <div className={`w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl`}>

            <div className={`p-6 border-b ${borderColor}`}>

              <div className="flex items-center justify-between">

                <h3 className={`text-xl font-semibold ${textColor}`}>Edit Contact Name</h3>

                <button

                  onClick={() => {

                    setShowAddContactName(false);

                    setSelectedContactForName(null);

                    setContactFirstName("");

                  }}

                  className="p-[5px] hover:bg-gray-100 rounded-lg transition-colors"

                >

                  <X size={20} className="text-gray-500" />

                </button>

              </div>

            </div>

            <div className="p-6 space-y-4">

              <div>

                <label className={`block text-sm font-medium ${textColorLight} mb-2`}>

                  Phone Number

                </label>

                <input

                  type="text"

                  value={selectedContactForName || ""}

                  readOnly

                  className={`w-full px-4 py-3 ${inputBg} border ${borderColor} rounded-xl ${textColor}`}

                />

              </div>

              <div>

                <label className={`block text-sm font-medium ${textColorLight} mb-2`}>

                  Contact Name

                </label>

                <input

                  type="text"

                  placeholder="Enter contact name"

                  value={contactFirstName}

                  onChange={(e) => setContactFirstName(e.target.value)}

                  className={`w-full px-4 py-3 ${inputBg} border ${borderColor} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}

                />

              </div>

              <div className="flex gap-3">

                <button

                  onClick={() => {

                    setShowAddContactName(false);

                    setSelectedContactForName(null);

                    setContactFirstName("");

                  }}

                  className={`flex-1 px-4 py-2.5 border ${borderColor} rounded-xl transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}

                >

                  Cancel

                </button>

                <button

                  onClick={handleAddContactName}

                  disabled={addingContactName || !contactFirstName.trim()}

                  className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

                >

                  {addingContactName ? (

                    <>

                      <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2"></div>

                      Saving...

                    </>

                  ) : (

                    "Save Name"

                  )}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



export default Chat;