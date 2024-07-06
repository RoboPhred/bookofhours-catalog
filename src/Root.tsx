import React from "react";
import {
  Box,
  CircularProgress,
  Stack,
  styled,
  Typography,
} from "@mui/material";

import { useDIDependency } from "./container";

import AppRoutes from "./routes";

import { SaveManager } from "./services/sh-game/SaveManager/SaveManager";
import { useIsGameRunning, useIsLegacyRunning } from "./services/sh-game";

import { useObservation } from "./hooks/use-observation";

import Hotkeys from "./components/Hotkeys";
import UnlockTerrainDialog from "./components/UnlockTerrainDialog";
import SearchDialog from "./components/SearchDialog";
import OrchestratorDrawer from "./components/OrchestratorDrawer";
import GameNotPausedWarning from "./components/GameNotPausedWarning";
import PageHeader from "./components/PageHeader";
import PageTabs from "./components/PageTabs";

import GameNotRunningView from "./views/GameNotRunningView";
import ChooseGameView from "./views/ChooseGameView";

const Main = styled("main")({
  flexGrow: 1,
  position: "relative",
  width: "100%",
  height: "100%",
  minWidth: 0,
  isolation: "isolate",
});

const Root = () => {
  const saveManager = useDIDependency(SaveManager);
  const loadingState = useObservation(saveManager.loadingState$);

  const isRunning = useIsGameRunning();
  const isLegacyRunning = useIsLegacyRunning();

  if (!isRunning) {
    return <GameNotRunningView />;
  }

  if (loadingState !== "idle") {
    let message: string;
    switch (loadingState) {
      case "game-loading":
        message = "Loading game...";
        break;
      case "tokens-loading":
        message = "Loading Catalogue...";
        break;
      case "game-saving":
        message = "Saving game...";
        break;
      default:
        message = "Busy...";
        break;
    }
    return (
      <Main
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        <Typography variant="h4">{message}</Typography>
        <CircularProgress sx={{ mt: 1 }} color="inherit" />
      </Main>
    );
  }

  if (!isLegacyRunning) {
    return <ChooseGameView />;
  }

  return (
    <Hotkeys>
      <Stack direction="row" sx={{ width: "100%", height: "100%" }}>
        <Stack
          direction="column"
          sx={{
            width: "100%",
            height: "100%",
            minWidth: 0,
          }}
        >
          <PageHeader />
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
            <Main>
              <AppRoutes />
            </Main>
          </Box>
        </Stack>
        <OrchestratorDrawer />
      </Stack>
      <UnlockTerrainDialog />
      <SearchDialog />
      <GameNotPausedWarning />
    </Hotkeys>
  );
};

export default Root;
