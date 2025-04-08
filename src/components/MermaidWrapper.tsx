"use client";

import React from "react";
// import { MermaidDiagram } from "@lightenna/react-mermaid-diagram";

interface Props {
  chart: string;
}

const MermaidWrapper: React.FC<Props> = ({ chart }) => {
  //return <MermaidDiagram>{chart}</MermaidDiagram>;
  return <>{chart}</>;
};

export default MermaidWrapper;
