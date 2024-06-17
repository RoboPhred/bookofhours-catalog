import React from "react";
import { Navigate } from "react-router-dom";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

import { useDIDependency } from "@/container";

import { portageSpherePaths } from "@/spheres";

import { useObservation } from "@/hooks/use-observation";
import { useQueryString } from "@/hooks/use-querystring";

import {
  TokensSource,
  filterTokenInPath,
  filterDoesNotOccupySpace,
  filterElementId,
  filterHasAnyAspect,
  filterHasNoneOfAspect,
} from "@/services/sh-game";

import PageContainer from "@/components/PageContainer";
import ElementStackTray from "@/components/Elements/ElementStackTray";

const GameplayView = () => {
  const redirect = useQueryString("redirect");
  return (
    <PageContainer title="Welcome, Librarian">
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {redirect != null && <Navigate to={redirect} />}
        <Overview />
      </Box>
    </PageContainer>
  );
};

const Overview = () => {
  const tokensSource = useDIDependency(TokensSource);
  const tokens = useObservation(tokensSource.visibleTokens$);

  const portage$ = React.useMemo(
    () =>
      tokensSource.visibleElementStacks$.pipe(
        filterTokenInPath(portageSpherePaths)
      ),
    [tokensSource.visibleElementStacks$]
  );

  const memories$ = React.useMemo(
    () => tokensSource.visibleElementStacks$.pipe(filterHasAnyAspect("memory")),
    [tokensSource.visibleElementStacks$]
  );

  const abilities$ = React.useMemo(
    () =>
      tokensSource.visibleElementStacks$.pipe(filterHasAnyAspect("ability")),
    [tokensSource.visibleElementStacks$]
  );

  const skills$ = React.useMemo(
    () => tokensSource.visibleElementStacks$.pipe(filterHasAnyAspect("skill")),
    [tokensSource.visibleElementStacks$]
  );

  const misc$ = React.useMemo(
    () =>
      tokensSource.visibleElementStacks$.pipe(
        filterDoesNotOccupySpace(["PhysicalObject"]),
        // We pick up tons of notes, which are text tokens that show up in situations.
        filterElementId((x) => x !== "tlg.note"),
        filterHasNoneOfAspect(["memory", "ability", "skill"])
      ),
    [tokensSource.visibleElementStacks$]
  );

  return (
    <Box sx={{ width: "100%", height: "100%", overflow: "auto" }}>
      <Box
        sx={{
          p: 2,
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateRows: `[start] max-content [dividier] 1fr [end]`,
          gridTemplateColumns: `[start] 2fr [memories-soul] 3fr [soul-skill] 4fr [skill-misc] 2fr [end]`,
          gap: 2,
        }}
      >
        {tokens == null && (
          <Box
            sx={{
              gridRow: "start / end",
              gridColumn: "start / end",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <ElementStackTray
          aria-label="portage"
          role="region"
          sx={{
            gridRow: "start / dividier",
            gridColumn: "start / end",
          }}
          elementStacks$={portage$}
          requireExterior
        />
        <ElementStackTray
          aria-label="memories"
          role="region"
          sx={{
            gridRow: "dividier / end",
            gridColumn: "start / memories-soul",
          }}
          elementStacks$={memories$}
          requireExterior
        />
        <ElementStackTray
          aria-label="abilities"
          role="region"
          sx={{
            gridRow: "dividier / end",
            gridColumn: "memories-soul / soul-skill",
          }}
          elementStacks$={abilities$}
          requireExterior
        />
        <ElementStackTray
          aria-label="skills"
          role="region"
          sx={{
            gridRow: "dividier / end",
            gridColumn: "soul-skill / skill-misc",
          }}
          elementStacks$={skills$}
          requireExterior
        />
        <ElementStackTray
          aria-label="miscelanious"
          role="region"
          sx={{
            gridRow: "dividier / end",
            gridColumn: "skill-misc / end",
          }}
          elementStacks$={misc$}
          requireExterior
        />
      </Box>
    </Box>
  );
};

export default GameplayView;
