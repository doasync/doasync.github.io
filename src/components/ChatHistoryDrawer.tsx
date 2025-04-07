import React, { useState, useMemo } from "react";
import { useUnit } from "effector-react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Typography,
  Box,
  TextField,
  CircularProgress,
  Divider,
  ListItemIcon,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import {
  $chatHistoryIndex,
  $isLoadingHistory,
  chatSelected,
  ChatHistoryIndex,
  deleteChat,
  // chatTitleEdited, // We'll add title editing UI later
  $currentChatId,
} from "@/features/chat-history";
import { $isHistoryDrawerOpen, toggleHistoryDrawer } from "@/features/ui-state";

const ChatHistoryDrawer: React.FC = () => {
  const [
    isOpen,
    toggleDrawer,
    historyIndex,
    isLoading,
    selectChat,
    removeChat,
    currentChatId,
  ] = useUnit([
    $isHistoryDrawerOpen,
    toggleHistoryDrawer,
    $chatHistoryIndex,
    $isLoadingHistory,
    chatSelected,
    deleteChat,
    $currentChatId,
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");

  const filteredHistory = useMemo(() => {
    if (!searchTerm) {
      return historyIndex;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    return historyIndex.filter((chat: ChatHistoryIndex) =>
      chat.title.toLowerCase().includes(lowerCaseSearch)
    );
  }, [historyIndex, searchTerm]);

  const handleSelectChat = (id: string) => {
    selectChat(id);
    toggleDrawer(); // Close drawer on selection
  };

  const handleDeleteChat = (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent ListItemButton click
    // Optional: Add confirmation dialog here
    removeChat(id);
  };

  const handleStartEdit = (
    id: string,
    currentTitle: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setEditingId(id);
    setEditedTitle(currentTitle);
  };

  const handleSaveEdit = (id: string) => {
    if (editedTitle.trim() !== "") {
      import("@/features/chat-history").then(({ chatTitleEdited }) => {
        chatTitleEdited({ id, newTitle: editedTitle.trim() });
      });
    }
    setEditingId(null);
    setEditedTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedTitle("");
  };

  // TODO: Implement title editing functionality

  return (
    <Drawer anchor="left" open={isOpen} onClose={toggleDrawer}>
      <Box
        sx={{
          width: 300, // Adjust width as needed
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
        role="presentation"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" sx={{ ml: 1 }}>
            Chat History
          </Typography>
          <IconButton onClick={toggleDrawer} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />

        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <List disablePadding>
              {filteredHistory.length === 0 && !isLoading && (
                <Typography
                  sx={{ p: 2, textAlign: "center", color: "text.secondary" }}
                >
                  {searchTerm
                    ? "No matching chats found."
                    : "No chat history yet."}
                </Typography>
              )}
              {filteredHistory.map((chat: ChatHistoryIndex) => (
                <ListItem
                  key={chat.id}
                  disablePadding
                  secondaryAction={
                    <>
                      {editingId === chat.id ? null : (
                        <Tooltip title="Edit Title">
                          <IconButton
                            edge="end"
                            aria-label="edit"
                            size="small"
                            sx={{ mr: 0.5 }}
                            onClick={(e) =>
                              handleStartEdit(chat.id, chat.title, e)
                            }
                          >
                            <EditIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete Chat">
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          size="small"
                        >
                          <DeleteIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </>
                  }
                >
                  <ListItemButton
                    onClick={() => handleSelectChat(chat.id)}
                    selected={chat.id === currentChatId}
                  >
                    {editingId === chat.id ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          width: "100%",
                        }}
                      >
                        <TextField
                          size="small"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveEdit(chat.id);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              handleCancelEdit();
                            }
                          }}
                          onBlur={() => handleSaveEdit(chat.id)}
                          autoFocus
                          fullWidth
                          variant="standard"
                        />
                      </Box>
                    ) : (
                      <ListItemText
                        primary={chat.title}
                        secondary={new Date(chat.lastModified).toLocaleString()}
                        primaryTypographyProps={{
                          noWrap: true,
                          sx: {
                            fontWeight:
                              chat.id === currentChatId ? "bold" : "normal",
                          },
                        }}
                        secondaryTypographyProps={{
                          noWrap: true,
                          fontSize: "0.75rem",
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default ChatHistoryDrawer;
