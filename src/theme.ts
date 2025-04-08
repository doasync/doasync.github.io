"use client";
// import { Roboto } from 'next/font/google'; // Temporarily comment out for debugging
import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

// const roboto = Roboto({ // Temporarily comment out for debugging
//   weight: ['300', '400', '500', '700'],
//   subsets: ['latin'],
//   display: 'swap',
// });

// Create a theme instance.
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#556cd6",
    },
    secondary: {
      main: "#19857b",
    },
    error: {
      main: red.A400,
    },
    tonalOffset: 0.25,
  },
  // typography: { // Temporarily comment out for debugging
  //   fontFamily: roboto.style.fontFamily,
  // },
});

export default theme;
