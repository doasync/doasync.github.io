import React from "react";
import { Typography, LinearProgress, Box, Stack, Divider } from "@mui/material";
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
      <Divider>Context</Divider>
      <Typography variant="body2">
        <strong>Used:</strong> {usage.contextTokensUsed.toLocaleString()}
        {" / "}
        {usage.contextTokensMax.toLocaleString()}
      </Typography>
      <Box>
        <LinearProgress
          variant="determinate"
          color="success"
          value={Math.min(contextPercent, 100)}
          sx={{ height: 8, borderRadius: 4, mt: 1 }}
        />
      </Box>
      <Divider>API Cost</Divider>
      <Typography color="textDisabled" variant="body2">
        <strong>Estimated Cost:</strong> ${usage.apiCost.toFixed(6)}
      </Typography>
      <Divider>Chat Session</Divider>
      <Typography variant="body2">
        <strong>Chat ID:</strong> {usage.chatId ?? "N/A"}
      </Typography>
      <Divider>Storage</Divider>
      <Typography color="textDisabled" variant="body2">
        <strong>Chat Size:</strong> {usage.chatSizeMB.toFixed(2)} MB
      </Typography>
      <Typography variant="body2">
        <strong>Total DB:</strong> {usage.dbSizeMB.toFixed(2)} MB
      </Typography>
      <Typography variant="body2">
        <strong>Quota:</strong> {usage.quotaMB.toFixed(2)} MB
      </Typography>
      <Divider>Tokens</Divider>
      <Typography color="textDisabled" variant="body2">
        <strong>Sent:</strong> {usage.tokensSent.toLocaleString()}
      </Typography>
      <Typography color="textDisabled" variant="body2">
        <strong>Received:</strong> {usage.tokensReceived.toLocaleString()}
      </Typography>
      <Typography color="textDisabled" variant="body2">
        <strong>Total:</strong>{" "}
        {(usage.tokensSent + usage.tokensReceived).toLocaleString()}
      </Typography>
    </Stack>
  );
};

export default UsageInfoContent;
