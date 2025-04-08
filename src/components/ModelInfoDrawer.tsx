import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Stack,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import { ModelInfo } from "../features/models-select";

interface ModelInfoDrawerProps {
  model: ModelInfo;
}

const ModelInfoDrawer: React.FC<ModelInfoDrawerProps> = ({ model }) => {
  const isFree =
    model.pricing?.prompt === "0" && model.pricing?.completion === "0";

  const formattedDate = model.created
    ? new Date(model.created * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(model.id);
  };

  const promptPrice = model.pricing?.prompt
    ? (parseFloat(model.pricing.prompt) * 1_000_000).toFixed(2)
    : "0";

  const completionPrice = model.pricing?.completion
    ? (parseFloat(model.pricing.completion) * 1_000_000).toFixed(2)
    : "0";

  return (
    <Box p={2} maxWidth={400}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h6" fontWeight="bold">
          {model.name}
        </Typography>
        {isFree && (
          <Tooltip title="Free model">
            <CardGiftcardIcon fontSize="small" />
          </Tooltip>
        )}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} mt={1}>
        <Typography variant="body2" fontFamily="monospace">
          {model.id}
        </Typography>
        <Tooltip title="Copy model ID">
          <IconButton size="small" onClick={handleCopy}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={1} flexWrap="wrap">
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Typography variant="body2" color="text.secondary">
            Created {formattedDate}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {model.context_length.toLocaleString()} context
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Typography variant="body2" color="text.secondary">
            ${promptPrice}/M input tokens
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ${completionPrice}/M output tokens
          </Typography>
        </Stack>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.primary" whiteSpace="pre-line">
        {model.description}
      </Typography>
    </Box>
  );
};

export default ModelInfoDrawer;
