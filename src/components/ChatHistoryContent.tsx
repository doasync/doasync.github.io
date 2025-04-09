import React, { useState } from "react";
import { useUnit } from "effector-react";
import { useTheme, useMediaQuery } from "@mui/material";

import { duplicateChatClicked, newChatCreated } from "@/features/chat-history";
import { closeHistoryDrawer } from "@/features/ui-state"; // Import close event
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
  Menu,
  MenuItem,
  ListItemIcon,
  Toolbar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close"; // Keep for mobile? Or remove if not needed
import SubjectIcon from "@mui/icons-material/Subject"; // Import icon for desktop close
import AddCircleIcon from "@mui/icons-material/AddCircle"; // Import icon for desktop close
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import type { ChatHistoryIndex } from "@/features/chat-history";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import { regenerateTitleForChat } from "@/features/chat-history";
import { $isMobileDrawerOpen } from "@/features/ui-state";

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
  // onClose?: () => void; // Remove optional onClose prop
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
  // onClose, // Remove from destructuring
}) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [menuChatTitle, setMenuChatTitle] = useState<string>("");

  const openMenu = Boolean(menuAnchorEl);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isMobileDrawerOpen = useUnit($isMobileDrawerOpen);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    chatId: string,
    chatTitle: string
  ) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuChatId(chatId);
    setMenuChatTitle(chatTitle);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuChatId(null);
    setMenuChatTitle("");
  };

  const handleDuplicate = () => {
    if (menuChatId) {
      duplicateChatClicked(menuChatId);
    }
    handleMenuClose();
  };

  const handleRegenerateTitle = () => {
    if (menuChatId) {
      regenerateTitleForChat(menuChatId);
    }
    handleMenuClose();
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleMenuClose();
    if (menuChatId) {
      setTimeout(() => {
        handleStartEdit(menuChatId, menuChatTitle, e);
      }, 0);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuChatId) {
      handleDeleteChat(menuChatId, e);
    }
    handleMenuClose();
  };

  return (
    <>
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
        {!isMobileDrawerOpen && (
          <Toolbar
            disableGutters
            variant="dense"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "start",
              pl: 2,
              pr: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Chat History
            </Typography>
            {!isMobile && (
              <IconButton
                aria-label="New chat"
                onClick={() => newChatCreated()}
              >
                <AddCircleIcon />
              </IconButton>
            )}
            {!isMobile && (
              <IconButton
                onClick={() => closeHistoryDrawer()}
                aria-label="close history drawer"
              >
                <SubjectIcon />
              </IconButton>
            )}
          </Toolbar>
        )}

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

        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
          }}
        >
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
              {filteredHistory.map((chat) => (
                <ListItem
                  key={chat.id}
                  disablePadding
                  secondaryAction={
                    <>
                      {editingId === chat.id ? (
                        <IconButton
                          edge="end"
                          size="small"
                          aria-label="save"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(chat.id);
                          }}
                        >
                          <CheckIcon fontSize="medium" />
                        </IconButton>
                      ) : (
                        <IconButton
                          edge="end"
                          aria-label="more"
                          onClick={(e) =>
                            handleMenuOpen(e, chat.id, chat.title)
                          }
                        >
                          <MoreVertIcon fontSize="medium" />
                        </IconButton>
                      )}
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
      <Menu
        anchorEl={menuAnchorEl}
        open={openMenu}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleRename}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Rename" />
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Duplicate" />
        </MenuItem>
        <MenuItem onClick={handleRegenerateTitle}>
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Regenerate Title" />
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <ListItemIcon sx={{ color: "error.main" }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ChatHistoryPanel;
