"use client";
import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

const theme = createTheme({
  palette: {
    mode: "dark", // Start with dark mode, can be made dynamic later
    primary: {
      main: "#556cd6",
    },
    secondary: {
      main: "#19857b",
    },
    error: {
      main: red.A400,
    },
  },
  typography: {
    // Temporarily comment out for debugging
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
  },
});

export default theme;
