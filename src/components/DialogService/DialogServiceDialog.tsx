import React from "react";

import { useDIDependency } from "@/container";

import {
  DialogActionModel,
  DialogService,
  ActionPromptDialogModel,
  ComponentDialogModel,
} from "@/services/dialog";

import { useObservation } from "@/hooks/use-observation";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from "@mui/material";

const DialogServiceDialog = () => {
  const dialogService = useDIDependency(DialogService);
  const currentDialog = useObservation(dialogService.currentDialog$);

  if (!currentDialog) {
    return null;
  }

  if (currentDialog instanceof ActionPromptDialogModel) {
    return <TextDialog model={currentDialog} />;
  } else if (currentDialog instanceof ComponentDialogModel) {
    return <ComponentDialog model={currentDialog} />;
  }

  console.warn("Unknown dialog model type", currentDialog);

  return null;
};

export default DialogServiceDialog;

interface TextDialogProps {
  model: ActionPromptDialogModel;
}

const TextDialog = ({ model }: TextDialogProps) => {
  return (
    <Dialog open>
      <DialogContent>
        <DialogContentText variant="body1">{model.text}</DialogContentText>
      </DialogContent>
      <DialogActionsBar actions={model.actions} />
    </Dialog>
  );
};

interface ComponentDialogProps {
  model: ComponentDialogModel;
}

const ComponentDialog = ({ model }: ComponentDialogProps) => {
  const Component = model.component;
  return (
    <Dialog open maxWidth="xl">
      <Component model={model} />
    </Dialog>
  );
};

interface DialogActionsBarProps {
  actions: DialogActionModel[];
}

const DialogActionsBar = ({ actions }: DialogActionsBarProps) => {
  return (
    <DialogActions>
      {actions.map((action, index) => (
        <Button
          key={index}
          onClick={() => action.onClick()}
          variant={action.default ? "contained" : "text"}
        >
          {action.label}
        </Button>
      ))}
    </DialogActions>
  );
};
