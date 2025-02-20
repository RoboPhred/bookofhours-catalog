import React from "react";

import { IconButton, IconButtonProps } from "@mui/material";
import { PlayCircle } from "@mui/icons-material";

import { SettingData } from "@/services/settings";

import RequireInteractivity from "./RequireInteractivity";

interface OrchestrationIconButtonProps extends IconButtonProps {
  interactivity: SettingData["interactivity"];
}

const OrchestrationIconButton = ({
  interactivity,
  ...props
}: OrchestrationIconButtonProps) => (
  <RequireInteractivity interactivity={interactivity} compare="greater">
    <IconButton
      title="Craft Item"
      aria-controls="orchestration-drawer"
      {...props}
    >
      <PlayCircle />
    </IconButton>
  </RequireInteractivity>
);

export default OrchestrationIconButton;
