import React from "react";
import { Aspects } from "secrethistories-api";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import UpgradeIcon from "@mui/icons-material/Upgrade";

import { useDIDependency } from "@/container";

import { powerAspects, wisdomAspects } from "@/aspects";

import {
  ElementStackModel,
  Orchestrator,
  TokensSource,
  filterHasAnyAspect,
} from "@/services/sh-game";

import { useObservation } from "@/hooks/use-observation";

import PageContainer from "@/components/PageContainer";
import {
  IdentifierItemDataGrid,
  createElementStackColumnHelper,
  useQuerySettings,
} from "@/components/ObservableDataGrid";

const columnHelper = createElementStackColumnHelper();

const SkillUpgradeButton = ({ model }: { model: ElementStackModel }) => {
  const orchestrator = useDIDependency(Orchestrator);
  const aspects = useObservation<Aspects>(model.aspects$) ?? {};
  const skillLevel = aspects["skill"] ?? 0;
  if (skillLevel <= 0 || skillLevel >= 9) {
    return null;
  }

  const recipeId = `u.skill.to${skillLevel + 1}`;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <IconButton
        onClick={() =>
          orchestrator.openOrchestration({
            recipeId,
            desiredElementIds: [model.elementId],
          })
        }
      >
        <UpgradeIcon />
      </IconButton>
    </Box>
  );
};

const SkillsCatalogPage = () => {
  const tokensSource = useDIDependency(TokensSource);

  const columns = React.useMemo(
    () => [
      columnHelper.display({
        id: "upgrade-button",
        header: "",
        size: 30,
        cell: (context) => <SkillUpgradeButton model={context.row.original} />,
      }),
      columnHelper.elementStackIcon(),
      columnHelper.label({
        header: "Skill",
        size: 200,
      }),
      columnHelper.aspectsList("skill", ["skill"], {
        header: "Level",
        size: 120,
        enableColumnFilter: false,
      }),
      columnHelper.aspectsList("aspects", powerAspects, {
        header: "Aspects",
        size: 200,
      }),
      columnHelper.aspectsList("wisdoms", wisdomAspects, {
        header: "Wisdoms",
        showLevel: false,
        size: 190,
      }),
      columnHelper.aspectsList("committed", ["wisdom.committed"], {
        header: "Committed",
        showLevel: false,
        size: 190,
      }),
      columnHelper.aspectsList("attuned", ["a.xhausted"], {
        header: "Attuned",
        showLevel: false,
        size: 160,
      }),
      columnHelper.description(),
    ],
    []
  );

  const skills$ = React.useMemo(
    () =>
      tokensSource.visibleElementStacks$.pipe(filterHasAnyAspect(["skill"])),
    [tokensSource]
  );

  const settings = useQuerySettings();

  return (
    <PageContainer title="Esoteric Wisdoms">
      <IdentifierItemDataGrid
        sx={{ height: "100%" }}
        items$={skills$}
        columns={columns}
        defaultSortColumn="label"
        {...settings}
      />
    </PageContainer>
  );
};

export default SkillsCatalogPage;
