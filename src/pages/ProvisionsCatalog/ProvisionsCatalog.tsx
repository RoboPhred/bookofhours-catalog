import * as React from "react";
import { map } from "rxjs";

import Box from "@mui/material/Box";

import { useDIDependency } from "@/container";

import { powerAspects, provisionsAspects } from "@/aspects";

import { observeAll, useObservation } from "@/observables";

import {
  ElementStackModel,
  TokensSource,
  filterHasAnyAspect,
} from "@/services/sh-game";

import { RequireRunning } from "@/components/RequireLegacy";
import ObservableDataGrid, {
  descriptionColumnDef,
  iconColumnDef,
  labelColumnDef,
  locationColumnDef,
  multiselectOptionsFilter,
  aspectsColumnDef,
  aspectsPresenceColumnDef,
  ObservableDataGridColumnDef,
} from "@/components/ObservableDataGrid";
import PageContainer from "@/components/PageContainer";
import { aspectsFilter } from "@/components/ObservableDataGrid/filters/aspects";
import FocusIconButton from "@/components/FocusIconButton";

const ProvisionsCatalog = () => {
  const tokensSource = useDIDependency(TokensSource);

  const elements$ = React.useMemo(
    () =>
      tokensSource.visibleElementStacks$.pipe(
        filterHasAnyAspect(provisionsAspects)
      ),
    [tokensSource]
  );

  const locations =
    useObservation(
      () =>
        tokensSource.unlockedTerrains$.pipe(
          map((terrains) => terrains.map((terrain) => terrain.label$)),
          observeAll()
        ),
      [tokensSource]
    ) ?? [];

  const columns = React.useMemo(
    () => [
      {
        headerName: "",
        width: 50,
        field: "$item",
        renderCell: ({ value }) => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <FocusIconButton token={value} />
          </Box>
        ),
      } as ObservableDataGridColumnDef<ElementStackModel>,
      iconColumnDef<ElementStackModel>(),
      labelColumnDef<ElementStackModel>(),
      locationColumnDef<ElementStackModel>({
        filter: multiselectOptionsFilter("location", locations),
      }),
      aspectsPresenceColumnDef<ElementStackModel>(
        provisionsAspects,
        { display: "none", orientation: "horizontal" },
        { headerName: "Type", filter: aspectsFilter("type", provisionsAspects) }
      ),
      aspectsColumnDef<ElementStackModel>(powerAspects),
      descriptionColumnDef<ElementStackModel>(),
    ],
    [locations]
  );

  return (
    <PageContainer title="Stores and Provisions" backTo="/">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        <RequireRunning />
        <ObservableDataGrid
          sx={{ height: "100%" }}
          columns={columns}
          items$={elements$}
        />
      </Box>
    </PageContainer>
  );
};

export default ProvisionsCatalog;
