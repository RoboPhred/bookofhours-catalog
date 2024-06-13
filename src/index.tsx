import "@/style.css";

import React from "react";
import ReactDOM from "react-dom/client";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import CssBaseline from "@mui/material/CssBaseline";

import { ContainerProvider } from "./container";
import ThemeProvider from "./theme";

import AppRouter from "./services/history/AppRouter";

import UnlockTerrainDialog from "./components/UnlockTerrainDialog";
import SearchDialog from "./components/SearchDialog";
import Favicon from "./components/Favicon";
import Hotkeys from "./components/Hotkeys";

import AppRoutes from "./routes";

const rootEl = document.getElementById("root");
const root = ReactDOM.createRoot(rootEl!);
root.render(
  <React.StrictMode>
    <ContainerProvider>
      <DndProvider backend={HTML5Backend}>
        <Hotkeys>
          <AppRouter>
            <Favicon />
            <ThemeProvider>
              <CssBaseline />
              <AppRoutes />
              <UnlockTerrainDialog />
              <SearchDialog />
            </ThemeProvider>
          </AppRouter>
        </Hotkeys>
      </DndProvider>
    </ContainerProvider>
  </React.StrictMode>
);
