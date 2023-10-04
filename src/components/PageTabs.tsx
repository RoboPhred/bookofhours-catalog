import * as React from "react";
import { useLocation } from "react-router";
import { Link } from "react-router-dom";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import sitemap from "@/sitemap";

import { useAspect } from "@/services/sh-compendium";
import { useLayoutObservation, useObservation } from "@/observables";

const PageTabs = () => {
  return (
    <Box
      sx={{
        // This is stupid, but its what the titlebar does. and probably what tabs do too.
        backgroundImage:
          "linear-gradient(rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.04))",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: 2,
        gap: 1,
      }}
    >
      {sitemap.map(({ label, aspectIcon, path }) => (
        <PageTab key={path} label={label} aspectId={aspectIcon} path={path} />
      ))}
    </Box>
  );
};

interface PageTab {
  label: string;
  aspectId: string;
  path: string;
}
const PageTab = ({ label, aspectId, path }: PageTab) => {
  const aspect = useAspect(aspectId);
  const iconUrl = useLayoutObservation(aspect.iconUrl$);
  const { pathname } = useLocation();
  const value = firstPathPart(pathname);
  return (
    <Tooltip
      title={<Typography variant="body1">{label}</Typography>}
      PopperProps={{ sx: { pointerEvents: "none" }, placement: "right" }}
    >
      <Link key={path} to={path}>
        <Box
          sx={{
            cursor: "pointer",
            filter:
              path !== value ? "brightness(75%) grayscale(0.9)" : undefined,
          }}
        >
          <img
            loading="lazy"
            style={{ display: "block" }}
            src={iconUrl}
            alt={label}
            width={40}
            height={40}
          />
        </Box>
      </Link>
    </Tooltip>
  );
};

function firstPathPart(pathname: string) {
  const [_, firstPart] = pathname.split("/", 2);
  return "/" + firstPart;
}

export default PageTabs;
