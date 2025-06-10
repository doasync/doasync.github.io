import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import type { DocumentProcessingResult } from "../types";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`document-tabpanel-${index}`}
      aria-labelledby={`document-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface DocumentPreviewProps {
  result: DocumentProcessingResult;
  onCopyText?: (text: string) => void;
  onDownload?: (result: DocumentProcessingResult) => void;
  maxPreviewHeight?: number;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  result,
  onCopyText,
  onDownload,
  maxPreviewHeight = 400,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleCopyText = () => {
    onCopyText?.(result.extractedText);
    navigator.clipboard.writeText(result.extractedText);
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" noWrap>
              {result.metadata.fileName}
            </Typography>
            <Chip
              label={result.metadata.mimeType.split("/")[1].toUpperCase()}
              size="small"
              color="primary"
            />
          </Box>
        }
        subheader={
          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(result.metadata.fileSize)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {result.metadata.wordCount.toLocaleString()} words
            </Typography>
            {result.metadata.pageCount && (
              <Typography variant="body2" color="text.secondary">
                {result.metadata.pageCount} pages
              </Typography>
            )}
          </Box>
        }
        action={
          <Box>
            <IconButton onClick={handleCopyText} title="Copy text">
              <ContentCopyIcon />
            </IconButton>
            {onDownload && (
              <IconButton onClick={() => onDownload(result)} title="Download">
                <FileDownloadIcon />
              </IconButton>
            )}
            <IconButton onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        }
      />

      <Collapse in={expanded}>
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
          >
            <Tab label="Preview" />
            <Tab label="Extracted Text" />
            {result.chunks && (
              <Tab label={`Chunks (${result.chunks.length})`} />
            )}
            <Tab label="Metadata" />
          </Tabs>

          {/* Preview Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ maxHeight: maxPreviewHeight, overflow: "auto" }}>
              {result.previewHtml ? (
                <Box
                  dangerouslySetInnerHTML={{ __html: result.previewHtml }}
                  sx={{
                    "& pre": {
                      whiteSpace: "pre-wrap",
                      fontFamily: "inherit",
                      margin: 0,
                    },
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No preview available
                </Typography>
              )}
            </Box>
          </TabPanel>

          {/* Extracted Text Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box
              sx={{
                maxHeight: maxPreviewHeight,
                overflow: "auto",
                backgroundColor: "grey.50",
                p: 2,
                borderRadius: 1,
                fontFamily: "monospace",
                fontSize: "0.875rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {result.extractedText}
            </Box>
          </TabPanel>

          {/* Chunks Tab */}
          {result.chunks && (
            <TabPanel value={activeTab} index={2}>
              <List
                dense
                sx={{ maxHeight: maxPreviewHeight, overflow: "auto" }}
              >
                {result.chunks.map((chunk, index) => (
                  <ListItem key={chunk.id} divider>
                    <ListItemText
                      primary={`Chunk ${index + 1}`}
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {chunk.content}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
          )}

          {/* Metadata Tab */}
          <TabPanel value={activeTab} index={3}>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="File Name"
                  secondary={result.metadata.fileName}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="File Size"
                  secondary={formatFileSize(result.metadata.fileSize)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="MIME Type"
                  secondary={result.metadata.mimeType}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Word Count"
                  secondary={result.metadata.wordCount.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Character Count"
                  secondary={result.metadata.characterCount.toLocaleString()}
                />
              </ListItem>
              {result.metadata.pageCount && (
                <ListItem>
                  <ListItemText
                    primary="Page Count"
                    secondary={result.metadata.pageCount}
                  />
                </ListItem>
              )}
              {result.metadata.title && (
                <ListItem>
                  <ListItemText
                    primary="Title"
                    secondary={result.metadata.title}
                  />
                </ListItem>
              )}
              {result.metadata.author && (
                <ListItem>
                  <ListItemText
                    primary="Author"
                    secondary={result.metadata.author}
                  />
                </ListItem>
              )}
              {result.metadata.creationDate && (
                <ListItem>
                  <ListItemText
                    primary="Creation Date"
                    secondary={result.metadata.creationDate.toLocaleDateString()}
                  />
                </ListItem>
              )}
            </List>
          </TabPanel>
        </CardContent>
      </Collapse>
    </Card>
  );
};
