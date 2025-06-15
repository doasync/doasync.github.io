import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SubjectIcon from '@mui/icons-material/Subject';
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useUnit } from 'effector-react';
import React, { useState } from 'react';

import {
  duplicateChatClicked,
  newChatCreated,
  regenerateTitleForChat,
} from '@/features/chat-history';
import type { ChatHistoryIndex } from '@/features/chat-history/types';
import { $isMobileDrawerOpen, closeHistoryDrawer } from '@/features/ui-state';

interface ChatHistoryPanelProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  isLoading: boolean;
  filteredHistory: ChatHistoryIndex[];
  editingId: string | null;
  editedTitle: string;
  currentChatId: string | null;
  setEditedTitle: (v: string) => void;
  handleStartEdit: (id: string, title: string, event: React.MouseEvent) => void;
  handleSaveEdit: (id: string) => void;
  handleCancelEdit: () => void;
  handleDeleteChat: (id: string, event: React.MouseEvent) => void;
  handleSelectChat: (id: string) => void;
  // onClose?: () => void; // Remove optional onClose prop
}

function ChatHistoryContent({
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
}: ChatHistoryPanelProps) {
  const [menuAnchorElement, setMenuAnchorElement] =
    useState<null | HTMLElement>(null);
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [menuChatTitle, setMenuChatTitle] = useState<string>('');

  const openMenu = Boolean(menuAnchorElement);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobileDrawerOpen = useUnit($isMobileDrawerOpen);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    chatId: string,
    chatTitle: string,
  ) => {
    event.stopPropagation();
    setMenuAnchorElement(event.currentTarget);
    setMenuChatId(chatId);
    setMenuChatTitle(chatTitle);
  };

  const handleMenuClose = () => {
    setMenuAnchorElement(null);
    setMenuChatId(null);
    setMenuChatTitle('');
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

  const handleRename = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    if (menuChatId) {
      setTimeout(() => {
        handleStartEdit(menuChatId, menuChatTitle, event);
      }, 0);
    }
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (menuChatId) {
      handleDeleteChat(menuChatId, event);
    }
    handleMenuClose();
  };

  return (
    <>
      <Box
        sx={{
          width: { xs: '100%', sm: 360, md: 400 },
          maxWidth: '100%',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
        role="presentation"
      >
        {!isMobileDrawerOpen && (
          <Toolbar
            disableGutters
            variant="dense"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'start',
              pl: 2,
              pr: 1,
              borderBottom: 1,
              borderColor: 'divider',
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
            onChange={(event) => setSearchTerm(event.target.value)}
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
            overflowY: 'auto',
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <List disablePadding>
              {filteredHistory.length === 0 && !isLoading && (
                <Typography
                  sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}
                >
                  {searchTerm
                    ? 'No matching chats found.'
                    : 'No chat history yet.'}
                </Typography>
              )}
              {filteredHistory.map((chat) => (
                <ListItem
                  key={chat.id}
                  disablePadding
                  secondaryAction={
                    editingId === chat.id ? (
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label="save"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSaveEdit(chat.id);
                        }}
                      >
                        <CheckIcon fontSize="medium" />
                      </IconButton>
                    ) : (
                      <IconButton
                        edge="end"
                        aria-label="more"
                        onClick={(event) =>
                          handleMenuOpen(event, chat.id, chat.title)
                        }
                      >
                        <MoreVertIcon fontSize="medium" />
                      </IconButton>
                    )
                  }
                >
                  <ListItemButton
                    onClick={() => handleSelectChat(chat.id)}
                    selected={chat.id === currentChatId}
                  >
                    {editingId === chat.id ? (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                        }}
                      >
                        <TextField
                          size="small"
                          value={editedTitle}
                          onChange={(event) =>
                            setEditedTitle(event.target.value)
                          }
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleSaveEdit(chat.id);
                            } else if (event.key === 'Escape') {
                              event.preventDefault();
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
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight:
                              chat.id === currentChatId ? 'bold' : 'normal',
                          },
                        }}
                        secondaryTypographyProps={{
                          noWrap: true,
                          fontSize: '0.75rem',
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
        anchorEl={menuAnchorElement}
        open={openMenu}
        onClose={handleMenuClose}
        onClick={(event) => event.stopPropagation()}
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
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>
    </>
  );
}

export { ChatHistoryContent };
