'use client';

import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Avatar,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useUnit } from 'effector-react';
import {
  $availableVoices,
  $selectedVoice,
  $selectedVoiceModel,
  $voicePreferences,
  voiceSelected,
  favoriteVoiceToggled,
  previewVoiceFx,
} from '../../voice-models';

interface VoiceSelectorProps {
  label?: string;
  size?: 'small' | 'medium';
  showPreview?: boolean;
  showFavorites?: boolean;
  filterByProvider?: string;
}

export function VoiceSelector({
  label = 'Voice',
  size = 'medium',
  showPreview = true,
  showFavorites = true,
  filterByProvider,
}: VoiceSelectorProps) {
  const availableVoices = useUnit($availableVoices);
  const selectedVoice = useUnit($selectedVoice);
  const selectedVoiceModel = useUnit($selectedVoiceModel);
  const preferences = useUnit($voicePreferences);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchField, setShowSearchField] = useState(false);

  const filteredVoices = React.useMemo(() => {
    let voices = availableVoices;

    // Filter by search term
    if (searchTerm) {
      voices = voices.filter(voice =>
        voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.style?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort: favorites first, then alphabetically
    return voices.sort((a, b) => {
      const aIsFavorite = preferences.favoriteVoices.includes(a.id);
      const bIsFavorite = preferences.favoriteVoices.includes(b.id);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      
      return a.name.localeCompare(b.name);
    });
  }, [availableVoices, searchTerm, preferences.favoriteVoices]);

  const handleVoiceChange = (event: any) => {
    voiceSelected(event.target.value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handlePreview = (voiceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (selectedVoiceModel) {
      previewVoiceFx({ modelId: selectedVoiceModel.id, voiceId });
    }
  };

  const handleToggleFavorite = (voiceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    favoriteVoiceToggled(voiceId);
  };

  const getVoiceIcon = (voice: any) => {
    const gender = voice.gender;
    const colors = {
      male: '#1976d2',
      female: '#d32f2f',
      neutral: '#757575',
    };
    
    return (
      <Avatar
        sx={{
          width: 24,
          height: 24,
          fontSize: '0.7rem',
          backgroundColor: colors[gender as keyof typeof colors] || colors.neutral,
        }}
      >
        {voice.name.charAt(0).toUpperCase()}
      </Avatar>
    );
  };

  const clearSearch = () => {
    setSearchTerm('');
    setShowSearchField(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Search Field */}
      {showSearchField && (
        <TextField
          size="small"
          placeholder="Search voices..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      )}

      {/* Voice Selector */}
      <FormControl size={size} fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select
          value={selectedVoice?.id || ''}
          onChange={handleVoiceChange}
          label={label}
          MenuProps={{
            PaperProps: {
              sx: { maxHeight: 400 }
            }
          }}
        >
          {/* Search option */}
          {!showSearchField && (
            <MenuItem onClick={() => setShowSearchField(true)}>
              <ListItemIcon>
                <SearchIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Search voices..." />
            </MenuItem>
          )}

          {filteredVoices.map((voice) => {
            const isFavorite = preferences.favoriteVoices.includes(voice.id);
            
            return (
              <MenuItem key={voice.id} value={voice.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  {getVoiceIcon(voice)}
                  
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ fontWeight: voice.id === selectedVoice?.id ? 'bold' : 'normal' }}>
                        {voice.name}
                      </Box>
                      {isFavorite && (
                        <FavoriteIcon sx={{ fontSize: '1rem', color: 'error.main' }} />
                      )}
                    </Box>
                    
                    {voice.description && (
                      <Box sx={{ 
                        fontSize: '0.75rem', 
                        color: 'text.secondary', 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {voice.description}
                      </Box>
                    )}
                    
                    {voice.style && voice.style.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        {voice.style.slice(0, 3).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ height: 16, fontSize: '0.6rem' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {showFavorites && (
                      <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleToggleFavorite(voice.id, e)}
                        >
                          {isFavorite ? (
                            <FavoriteIcon sx={{ fontSize: '1rem', color: 'error.main' }} />
                          ) : (
                            <FavoriteBorderIcon sx={{ fontSize: '1rem' }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {showPreview && voice.previewUrl && (
                      <Tooltip title="Preview voice">
                        <IconButton
                          size="small"
                          onClick={(e) => handlePreview(voice.id, e)}
                        >
                          <PlayIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </MenuItem>
            );
          })}
          
          {filteredVoices.length === 0 && (
            <MenuItem disabled>
              <ListItemText primary="No voices found" />
            </MenuItem>
          )}
        </Select>
      </FormControl>

      {/* Additional info */}
      {selectedVoice && selectedVoiceModel && (
        <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          {selectedVoiceModel.provider} • {selectedVoice.gender || 'Unknown gender'}
          {selectedVoice.languages && selectedVoice.languages.length > 0 && (
            <> • {selectedVoice.languages.join(', ')}</>
          )}
        </Box>
      )}
    </Box>
  );
}