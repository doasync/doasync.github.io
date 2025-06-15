import React from 'react';
import { useUnit } from 'effector-react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  testProviderUrl,
  $isTestingUrl,
  $urlTestResult,
} from '@/features/models-select';
import { $providerApiUrl, $apiKey, providerApiUrlChanged } from '../model';
import { CheckCircle, Error, Refresh } from '@mui/icons-material';

export function ProviderUrlTest() {
  const [providerApiUrl, apiKey, isTestingUrl, urlTestResult] = useUnit([
    $providerApiUrl,
    $apiKey,
    $isTestingUrl,
    $urlTestResult,
  ]);

  const handleTestUrl = () => {
    if (providerApiUrl.trim()) {
      testProviderUrl(providerApiUrl.trim());
    }
  };

  const getStatusIcon = () => {
    if (isTestingUrl) {
      return <CircularProgress size={16} />;
    }
    if (urlTestResult?.success) {
      return <CheckCircle color="success" fontSize="small" />;
    }
    if (urlTestResult && !urlTestResult.success) {
      return <Error color="error" fontSize="small" />;
    }
    return <Refresh fontSize="small" />;
  };

  const getButtonColor = (): 'primary' | 'success' | 'error' => {
    if (urlTestResult?.success) return 'success';
    if (urlTestResult && !urlTestResult.success) return 'error';
    return 'primary';
  };

  const getButtonText = () => {
    if (isTestingUrl) return 'Testing...';
    if (urlTestResult?.success)
      return `✓ ${urlTestResult.modelCount || 0} models`;
    if (urlTestResult && !urlTestResult.success) return 'Test Failed';
    return 'Test Connection';
  };

  // Common provider examples
  const commonProviders = [
    { name: 'OpenAI', url: 'https://api.openai.com/v1' },
    { name: 'VoidAI', url: 'https://api.voidai.app/v1' },
    { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip
          title={
            urlTestResult?.success
              ? `Connection successful! Found ${
                  urlTestResult.modelCount || 0
                } models`
              : apiKey.trim()
                ? 'Test if the provider URL is accessible and returns valid models (using current API key)'
                : 'Test if the provider URL is accessible and returns valid models (no API key set - some providers may require authentication)'
          }
        >
          <Button
            variant="outlined"
            size="small"
            onClick={handleTestUrl}
            disabled={isTestingUrl || !providerApiUrl.trim()}
            color={getButtonColor()}
            startIcon={getStatusIcon()}
            sx={{ minWidth: 130 }}
          >
            {getButtonText()}
          </Button>
        </Tooltip>
      </Box>

      {/* Quick provider examples */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>
          Examples:
        </Typography>
        {commonProviders.map((provider) => (
          <Chip
            key={provider.name}
            label={provider.name}
            size="small"
            variant="outlined"
            onClick={() => providerApiUrlChanged(provider.url)}
            sx={{
              fontSize: '0.75rem',
              height: 20,
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          />
        ))}
      </Box>

      {urlTestResult && (
        <Alert
          severity={urlTestResult.success ? 'success' : 'error'}
          sx={{ fontSize: '0.875rem' }}
        >
          <Typography variant="body2">{urlTestResult.message}</Typography>
        </Alert>
      )}
    </Box>
  );
}
