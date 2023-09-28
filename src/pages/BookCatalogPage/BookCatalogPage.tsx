import * as React from "react";
import { Observable, combineLatest, map, mergeMap } from "rxjs";

import { Aspects } from "secrethistories-api";
import { pick, first } from "lodash";

import Box from "@mui/material/Box";

import { powerAspects } from "@/aspects";

import { useDIDependency } from "@/container";

import {
  Null$,
  mapArrayItemsCached,
  mergeMapIfNotNull,
  observableObjectOrEmpty,
  observeAll,
  useObservation,
} from "@/observables";

import { Compendium } from "@/services/sh-compendium";
import { Orchestrator } from "@/services/sh-game/orchestration";
import {
  ElementStackModel,
  filterHasAspect,
  ModelWithAspects,
  ModelWithDescription,
  ModelWithIconUrl,
  ModelWithLabel,
  ModelWithParentTerrain,
  TokensSource,
} from "@/services/sh-game";

import { useQueryObjectState } from "@/hooks/use-queryobject";

import { RequireRunning } from "@/components/RequireLegacy";
import FocusIconButton from "@/components/FocusIconButton";
import PageContainer from "@/components/PageContainer";
import ObservableDataGrid, {
  ObservableDataGridColumnDef,
  aspectsPresenceColumnDef,
  aspectsObservableColumnDef,
  aspectsPresenceFilter,
  descriptionColumnDef,
  iconColumnDef,
  labelColumnDef,
  locationColumnDef,
  multiselectOptionsFilter,
  aspectsColumnDef,
  aspectsFilter,
  textColumnDef,
} from "@/components/ObservableDataGrid";
import CraftIconButton from "@/components/CraftIconButton";
import PinElementIconButton from "@/components/PinElementIconButton";
import ElementIcon from "@/components/ElementIcon";

interface BookModel
  extends ModelWithAspects,
    ModelWithDescription,
    ModelWithIconUrl,
    ModelWithLabel,
    ModelWithParentTerrain {
  id: string;
  memoryElementId$: Observable<string | null>;
  memoryLabel$: Observable<string | null>;
  memoryAspects$: Observable<Aspects>;
  focus(): void;
  read(): void;
}

interface MemoryButtonsProps {
  model: BookModel;
}

const MemoryButtons = ({ model }: MemoryButtonsProps) => {
  const memoryElementId = useObservation(model.memoryElementId$);
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {memoryElementId && <PinElementIconButton elementId={memoryElementId} />}
    </Box>
  );
};

function elementStackToBook(
  elementStack: ElementStackModel,
  compendium: Compendium,
  orchestrator: Orchestrator
): BookModel {
  const memory$ = combineLatest([
    elementStack.aspects$,
    elementStack.element$,
  ]).pipe(
    mergeMap(([aspects, element]) => {
      const mastery = Object.keys(aspects).find((aspectId) =>
        aspectId.startsWith("mastery.")
      );
      if (!mastery || aspects[mastery] < 1) {
        return Null$;
      }

      return element.xtriggers$.pipe(
        map((xtriggers) => {
          for (var key of Object.keys(xtriggers).filter((x) =>
            x.startsWith("reading.")
          )) {
            return first(xtriggers[key])?.id ?? null;
          }

          return null;
        })
      );
    }),
    map((memoryId) => (memoryId ? compendium.getElementById(memoryId) : null))
  );

  const memoryElementId$ = memory$.pipe(
    map((memory) => memory?.elementId ?? null)
  );
  const memoryLabel$ = memory$.pipe(
    mergeMapIfNotNull((memory) => memory.label$)
    // map((label) => (label?.startsWith("Memory: ") ? label.substring(8) : label))
  );

  const memoryAspects$ = memory$.pipe(
    mergeMap((memory) =>
      observableObjectOrEmpty(memory?.aspects$).pipe(
        map((aspects) => pick(aspects, powerAspects))
      )
    )
  );

  return {
    get id() {
      return elementStack.id;
    },
    get label$() {
      return elementStack.label$;
    },
    get description$() {
      return elementStack.description$;
    },
    get iconUrl() {
      return elementStack.iconUrl;
    },
    get aspects$() {
      return elementStack.aspects$;
    },
    get parentTerrain$() {
      return elementStack.parentTerrain$;
    },
    memoryElementId$,
    memoryLabel$,
    memoryAspects$,
    focus: () => elementStack.focus(),
    read: () => {
      const mystery = extractMysteryAspect(elementStack.aspects);
      const isMastered = Object.keys(elementStack.aspects).some((aspectId) =>
        aspectId.startsWith("mastery.")
      );
      orchestrator.requestOrchestration({
        recipeId: isMastered
          ? `study.mystery.${mystery}.mastered`
          : `study.mystery.${mystery}.mastering.begin`,
        desiredElementIds: [elementStack.elementId],
      });
    },
  };
}

function extractMysteryAspect(aspects: Aspects): string | null {
  let mystery = Object.keys(aspects).find((aspectId) =>
    aspectId.startsWith("mystery.")
  );
  if (!mystery) {
    return null;
  }

  return mystery.substring(8);
}

const BookCatalogPage = () => {
  const tokensSource = useDIDependency(TokensSource);
  const compendium = useDIDependency(Compendium);
  const orchestrator = useDIDependency(Orchestrator);

  const items$ = React.useMemo(
    () =>
      tokensSource.visibleElementStacks$.pipe(
        filterHasAspect("readable"),
        mapArrayItemsCached((item) =>
          elementStackToBook(item, compendium, orchestrator)
        )
      ),
    [tokensSource]
  );

  // We do have "auto" now, but its probably best to show
  // the locations the user has unlocked, so they can confirm there is nothing in it.
  const locations =
    useObservation(
      () =>
        tokensSource.unlockedTerrains$.pipe(
          map((terrains) => terrains.map((terrain) => terrain.label$)),
          observeAll()
        ),
      [tokensSource]
    ) ?? [];

  const columns = React.useMemo<ObservableDataGridColumnDef<BookModel>[]>(
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
            <FocusIconButton onClick={() => value.focus()} />
            <CraftIconButton onClick={() => value.read()} />
          </Box>
        ),
      } as ObservableDataGridColumnDef<BookModel>,
      iconColumnDef<BookModel>(),
      labelColumnDef<BookModel>(),
      locationColumnDef<BookModel>({
        filter: multiselectOptionsFilter("location", locations),
      }),
      aspectsColumnDef<BookModel>(
        (aspectId) => aspectId.startsWith("mystery."),
        {
          headerName: "Mystery",
          filter: aspectsFilter("mystery", "auto"),
          width: 150,
          aspectIconSize: 50,
        }
      ),
      aspectsPresenceColumnDef<BookModel>(
        (aspectId) => aspectId.startsWith("mastery."),
        { display: "none" },
        {
          headerName: "Mastered",
          sortable: false,
          width: 125,
          filter: aspectsPresenceFilter("mastered", "auto"),
        }
      ),
      {
        headerName: "",
        width: 40,
        field: "$item",
        renderCell: ({ value }) => <MemoryButtons model={value} />,
      } as ObservableDataGridColumnDef<BookModel>,
      {
        headerName: "",
        observable: "memoryElementId$",
        width: 90,
        renderCell: ({ value }) => (
          <ElementIcon elementId={value} width={75} title="Memory" />
        ),
      } as ObservableDataGridColumnDef<BookModel>,
      textColumnDef<BookModel>("Memory", "memory", "memoryLabel$", {
        width: 150,
      }),
      aspectsObservableColumnDef<BookModel>(
        "memoryAspects",
        (element) => element.memoryAspects$,
        powerAspects,
        {
          headerName: "Memory Aspects",
          width: 210,
        }
      ),
      aspectsPresenceColumnDef<BookModel>(
        (aspectId) => aspectId.startsWith("w."),
        { display: "none" },
        {
          headerName: "Language",
          width: 150,
          filter: aspectsFilter("language", "auto"),
        }
      ),
      aspectsPresenceColumnDef<BookModel>(
        ["film", "record.phonograph"],
        { display: "none" },
        {
          headerName: "Type",
          width: 125,
          filter: aspectsFilter("type", ["film", "record.phonograph"]),
        }
      ),
      aspectsPresenceColumnDef<BookModel>(
        (aspectId) => aspectId.startsWith("contamination."),
        { display: "none" },
        {
          headerName: "Contamination",
          width: 200,
          filter: aspectsFilter("contamination", "auto"),
        }
      ),
      descriptionColumnDef<BookModel>(),
    ],
    [locations]
  );

  const [filter, onFiltersChanged] = useQueryObjectState();

  return (
    <PageContainer title="Bibliographical Collection" backTo="/">
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
          items$={items$}
          filters={filter}
          onFiltersChanged={onFiltersChanged}
        />
      </Box>
    </PageContainer>
  );
};

export default BookCatalogPage;
