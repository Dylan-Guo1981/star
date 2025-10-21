import React, { useMemo, useState, useCallback } from "https://esm.sh/react@18.2.0";
import OrbitScene from "./components/OrbitScene.js";
import { orbitalBodies } from "./data/orbitalData.js";
import { useSimulationTime } from "./hooks/useSimulationTime.js";
import { computeEphemerides } from "./data/orbitMath.js";

const SCALE = 15;

function formatNumber(value) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export default function App() {
  const [timeScale, setTimeScale] = useState(50);
  const [paused, setPaused] = useState(false);
  const [viewTarget, setViewTarget] = useState("Sun");

  const timeDays = useSimulationTime({ speed: timeScale, paused });

  const staticBodies = useMemo(() => orbitalBodies, []);

  const { bodiesWithState, summary } = useMemo(() => {
    return computeEphemerides(staticBodies, timeDays);
  }, [staticBodies, timeDays]);

  const handleScaleChange = useCallback((event) => {
    setTimeScale(Number(event.target.value));
  }, []);

  return React.createElement(
    "div",
    { className: "app-shell" },
    React.createElement(OrbitScene, {
      bodies: bodiesWithState,
      scale: SCALE,
      viewTarget,
    }),
    React.createElement(
      "div",
      { className: "ui-panel" },
      React.createElement("h1", null, "Orbital Explorer"),
      React.createElement(
        "div",
        null,
        React.createElement(
          "label",
          { htmlFor: "time-scale" },
          `Time acceleration: ${formatNumber(timeScale)}x real time`
        ),
        React.createElement("input", {
          id: "time-scale",
          type: "range",
          min: 1,
          max: 2000,
          step: 1,
          value: timeScale,
          onChange: handleScaleChange,
        }),
        React.createElement(
          "button",
          {
            onClick: () => setPaused((value) => !value),
          },
          paused ? "Resume" : "Pause"
        ),
        React.createElement(
          "label",
          { htmlFor: "view-target" },
          "Camera target"
        ),
        React.createElement(
          "select",
          {
            id: "view-target",
            value: viewTarget,
            onChange: (event) => setViewTarget(event.target.value),
          },
          staticBodies
            .filter((body) => body.focusable !== false)
            .map((body) =>
              React.createElement(
                "option",
                { key: body.name, value: body.name },
                body.name
              )
            )
        )
      )
    ),
    React.createElement(
      "div",
      { className: "stats-bar" },
      React.createElement(
        "span",
        null,
        `Epoch + ${formatNumber(timeDays)} days`
      ),
      React.createElement(
        "span",
        null,
        `Fastest orbit: ${summary.fastestOrbiter}`
      ),
      React.createElement("span", null, `Farthest body: ${summary.farthestBody}`)
    )
  );
}
