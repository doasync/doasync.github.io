import React from "react";
import { Typography, LinearProgress, Box, Stack } from "@mui/material";
import { useUnit } from "effector-react";
import {
  $usageStats,
  $contextWindowPercent,
} from "@/features/usage-info/model";

const UsageInfoContent: React.FC = () => {
  const usage = useUnit($usageStats);
  const contextPercent = useUnit($contextWindowPercent);

  return (
    <Stack spacing={2}>
      <Typography variant="body2">
        <strong>Chat ID:</strong> {usage.chatId ?? "N/A"}
      </Typography>

      <Typography variant="body2">
        <strong>Tokens:</strong> Sent {usage.tokensSent.toLocaleString()} /
        Received {usage.tokensReceived.toLocaleString()}
      </Typography>

      <Box>
        <Typography variant="body2">
          <strong>Context Window:</strong>{" "}
          {usage.contextTokensUsed.toLocaleString()} /{" "}
          {usage.contextTokensMax.toLocaleString()}
        </Typography>
        <LinearProgress
          variant="determinate"
          color="success"
          value={Math.min(contextPercent, 100)}
          sx={{ height: 8, borderRadius: 4, mt: 1 }}
        />
      </Box>

      <Typography variant="body2">
        <strong>API Cost:</strong> ${usage.apiCost.toFixed(6)}
      </Typography>

      <Typography variant="body2">
        <strong>Storage:</strong> {usage.chatSizeMB.toFixed(2)} MB (chat) /{" "}
        {usage.dbSizeMB.toFixed(2)} MB (DB) / Quota {usage.quotaMB.toFixed(2)}{" "}
        MB
      </Typography>
    </Stack>
  );
};

export default UsageInfoContent;
