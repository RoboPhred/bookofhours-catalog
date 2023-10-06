import * as React from "react";
import { Aspects } from "secrethistories-api";
import { isEqual } from "lodash";
import { Observable, distinctUntilChanged, map, shareReplay } from "rxjs";

import Box from "@mui/material/Box";

import { useDIDependency } from "@/container";
import { mapArrayItemsCached } from "@/observables";
import { powerAspects } from "@/aspects";
import { useQueryObjectState } from "@/hooks/use-queryobject";

import { decorateObjectInstance } from "@/object-decorator";

import { SituationModel, TokensSource } from "@/services/sh-game";

import PageContainer from "@/components/PageContainer";
import { RequireRunning } from "@/components/RequireLegacy";
import ObservableDataGrid, {
  ObservableDataGridColumnDef,
  aspectsObservableColumnDef,
  aspectsPresenceColumnDef,
  aspectsPresenceFilter,
  descriptionColumnDef,
  labelColumnDef,
  locationColumnDef,
} from "@/components/ObservableDataGrid";
import FocusIconButton from "@/components/FocusIconButton";

type WorkstationModel = SituationModel & WorkstationModelDecorators;

interface WorkstationModelDecorators {
  thresholdAspects$: Observable<Aspects>;
}

function situationToWorkstationModel(
  situation: SituationModel
): WorkstationModel {
  return decorateObjectInstance(situation, {
    thresholdAspects$: situation.thresholds$.pipe(
      map((thresholds) => {
        const slotTypes: Aspects = {};
        for (const t of thresholds) {
          for (const type in t.required) {
            if (slotTypes[type] === undefined) {
              slotTypes[type] = 0;
            }
            slotTypes[type] += t.required[type];
          }
        }

        return slotTypes;
      }),
      distinctUntilChanged(isEqual),
      shareReplay(1)
    ),
  });
}

const WorkstationCatalogPage = () => {
  const tokensSource = useDIDependency(TokensSource);

  const elements$ = React.useMemo(
    () =>
      tokensSource.unlockedWorkstations$.pipe(
        mapArrayItemsCached(situationToWorkstationModel)
      ),
    [tokensSource]
  );

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
      } as ObservableDataGridColumnDef<WorkstationModel>,
      labelColumnDef<WorkstationModel>(),
      locationColumnDef<WorkstationModel>(),
      aspectsPresenceColumnDef<WorkstationModel>(
        powerAspects,
        { display: "none", orientation: "horizontal" },
        {
          headerName: "Attunement",
          observable: "hints$",
          filter: aspectsPresenceFilter("attunement", powerAspects),
          width: 275,
        }
      ),
      aspectsPresenceColumnDef<WorkstationModel>(
        (aspect) => aspect.startsWith("e."),
        { display: "none" },
        // TODO: Dont use auto, find all possible evolutions
        {
          headerName: "Evolves",
          filter: aspectsPresenceFilter("evolves", "auto"),
        }
      ),
      aspectsObservableColumnDef<WorkstationModel>(
        "threshold",
        (situation) => situation.thresholdAspects$,
        (aspectId) => !powerAspects.includes(aspectId as any),
        {
          headerName: "Accepts",
        }
      ),
      descriptionColumnDef<WorkstationModel>(),
    ],
    []
  );

  const [filters, onFiltersChanged] = useQueryObjectState();

  return (
    <PageContainer title="Workstations" backTo="/">
      <RequireRunning />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        <ObservableDataGrid
          sx={{ height: "100%" }}
          columns={columns}
          items$={elements$}
          filters={filters}
          onFiltersChanged={onFiltersChanged}
        />
      </Box>
    </PageContainer>
  );
};

export default WorkstationCatalogPage;
