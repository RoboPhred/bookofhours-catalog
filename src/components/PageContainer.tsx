import * as React from "react";
import { delay, of } from "rxjs";

import Box from "@mui/material/Box";

import PageHeader from "./PageHeader";
import PageTabs from "./PageTabs";
import GameNotPausedWarning from "./GameNotPausedWarning";

export interface PageContainerProps {
  title: string;
  backTo?: string;
  children: React.ReactNode;
}

const PageContainer = ({ title, backTo, children }: PageContainerProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      <GameNotPausedWarning />
      <PageHeader title={title} backTo={backTo} />
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          flexGrow: 1,
          width: "100%",
          height: "100%",
          minHeight: 0,
        }}
      >
        <PageTabs />
        <Box sx={{ flexGrow: 1, width: "100%", height: "100%" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default PageContainer;
