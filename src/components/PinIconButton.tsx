import * as React from "react";

import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import PushPin from "@mui/icons-material/PushPin";

import { False$, useObservation } from "@/observables";
import { useDIDependency } from "@/container";

import { Pinboard } from "@/services/sh-pins/Pinboard";

export interface PinIconButtonProps {
  title?: string;
  elementId: string;
}
const PinIconButton = ({ title, elementId }: PinIconButtonProps) => {
  const pinboard = useDIDependency(Pinboard);

  const isElementPinned = useObservation(
    () => (elementId ? pinboard.isElementPinned$(elementId) : False$),
    [elementId, pinboard]
  );

  const onClick = React.useCallback(() => {
    if (elementId) {
      if (isElementPinned) {
        pinboard.removeElementId(elementId);
      } else {
        pinboard.pin({ elementId });
      }
    }
  }, [isElementPinned, elementId, pinboard]);

  return (
    <IconButton title={title ?? "Pin Item"} onClick={onClick}>
      <PushPin
        sx={{ transform: isElementPinned ? "rotate(-90deg)" : "rotate(0deg)" }}
      />
    </IconButton>
  );
};

export default PinIconButton;
