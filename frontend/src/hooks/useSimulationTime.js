import React from "https://esm.sh/react@18.2.0";

export function useSimulationTime({ speed = 1, paused = false }) {
  const [time, setTime] = React.useState(0);
  const frameRef = React.useRef();
  const lastTickRef = React.useRef();

  React.useEffect(() => {
    lastTickRef.current = undefined;
    function update(now) {
      if (!lastTickRef.current) {
        lastTickRef.current = now;
      }
      const deltaSeconds = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (!paused) {
        setTime((previous) => previous + deltaSeconds * speed);
      }

      frameRef.current = requestAnimationFrame(update);
    }

    frameRef.current = requestAnimationFrame(update);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      lastTickRef.current = undefined;
    };
  }, [speed, paused]);

  return time;
}
