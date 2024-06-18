import React from "react";

import { Navigate, useLocation } from "react-router";

import { useIsLegacyRunning } from "@/services/sh-game";

export const RequireRunning = () => {
  const path = useLocation().pathname;

  const isRunning = useIsLegacyRunning();
  if (isRunning === false) {
    return <Navigate to={`/?redirect=${path}`} />;
  }

  return null;
};
