import React from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import type { ChatHistoryIndex } from "@/features/chat-history/types";

interface ChatHistoryPanelProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  isLoading: boolean;
  filteredHistory: ChatHistoryIndex[];
  editingId: string | null;
  editedTitle: string;
  currentChatId: string | null;
  setEditedTitle: (v: string) => void;
  handleStartEdit: (id: string, title: string, e: React.MouseEvent) => void;
  handleSaveEdit: (id: string) => void;
  handleCancelEdit: () => void;
  handleDeleteChat: (id: string, e: React.MouseEvent) => void;
  handleSelectChat: (id: string) => void;
  onClose?: () => void; // for optional close button in unified drawer
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  searchTerm,
  setSearchTerm,
  isLoading,
  filteredHistory,
  editingId,
  editedTitle,
  currentChatId,
  setEditedTitle,
  handleStartEdit,
  handleSaveEdit,
  handleCancelEdit,
  handleDeleteChat,
  handleSelectChat,
  onClose,
}) => (
  <Box
    sx={{
      width: { xs: "100%", sm: 360, md: 400 },
      maxWidth: "100%",
      flexGrow: 1,
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
      {onClose && (
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      )}
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
              {searchTerm ? "No matching chats found." : "No chat history yet."}
            </Typography>
          )}
          {filteredHistory.map((chat) => (
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
                        onClick={(e) => handleStartEdit(chat.id, chat.title, e)}
                      >
                        <EditIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete Chat">
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      size="small"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
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
                        maxWidth: 265,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
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
);

export default ChatHistoryPanel;
