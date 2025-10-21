const DEG2RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const GAUSSIAN_GM = Math.pow(0.01720209895, 2); // AU^3 / day^2

function normalizeAngle(angle) {
  let value = angle % TWO_PI;
  if (value < 0) {
    value += TWO_PI;
  }
  return value;
}

function solveKepler(meanAnomaly, eccentricity) {
  const maxIterations = 12;
  const tolerance = 1e-8;
  let eccentricAnomaly = meanAnomaly;

  if (eccentricity > 0.8) {
    eccentricAnomaly = Math.PI;
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const f =
      eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
    const fPrime = 1 - eccentricity * Math.cos(eccentricAnomaly);
    const delta = f / fPrime;
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < tolerance) {
      break;
    }
  }

  return eccentricAnomaly;
}

function elementsToCartesian(elements, deltaDays) {
  const {
    semiMajorAxis: a,
    eccentricity: e,
    inclination,
    longitudeOfAscendingNode,
    argumentOfPeriapsis,
    meanAnomalyAtEpoch,
  } = elements;

  if (!a || a <= 0) {
    return {
      position: { x: 0, y: 0, z: 0 },
      radiusVector: 0,
      trueAnomaly: 0,
      orbitalPlanePosition: { x: 0, y: 0 },
      orbitalPeriod: Infinity,
    };
  }

  const i = inclination * DEG2RAD;
  const omega = longitudeOfAscendingNode * DEG2RAD;
  const w = argumentOfPeriapsis * DEG2RAD;
  const meanMotion = Math.sqrt(GAUSSIAN_GM / Math.pow(a, 3));
  const M0 = meanAnomalyAtEpoch * DEG2RAD;
  const M = normalizeAngle(M0 + meanMotion * deltaDays);
  const E = solveKepler(M, e);

  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const trueAnomaly = Math.atan2(
    Math.sqrt(1 - e * e) * sinE,
    cosE - e
  );
  const radiusVector = a * (1 - e * cosE);

  const xOrbital = radiusVector * Math.cos(trueAnomaly);
  const yOrbital = radiusVector * Math.sin(trueAnomaly);

  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  const ux = cosOmega * cosW - sinOmega * sinW * cosI;
  const uy = sinOmega * cosW + cosOmega * sinW * cosI;
  const uz = sinW * sinI;

  const vx = -cosOmega * sinW - sinOmega * cosW * cosI;
  const vy = -sinOmega * sinW + cosOmega * cosW * cosI;
  const vz = cosW * sinI;

  const x = ux * xOrbital + vx * yOrbital;
  const y = uy * xOrbital + vy * yOrbital;
  const z = uz * xOrbital + vz * yOrbital;

  const orbitalPeriod = TWO_PI / meanMotion;

  return {
    position: { x, y, z },
    radiusVector,
    trueAnomaly,
    orbitalPlanePosition: { x: xOrbital, y: yOrbital },
    orbitalPeriod,
  };
}

export function computeEphemerides(bodies, timeDays) {
  const absolutePositions = new Map();
  const bodiesWithState = [];

  let fastestOrbiter = null;
  let farthestBody = null;

  for (const body of bodies) {
    if (!body.orbit) {
      const entry = {
        ...body,
        position: { x: 0, y: 0, z: 0 },
        relativePosition: { x: 0, y: 0, z: 0 },
        orbitalPeriodDays: null,
        distanceFromOrigin: 0,
        distanceFromParent: 0,
      };
      absolutePositions.set(body.name, entry.position);
      bodiesWithState.push(entry);
      if (!farthestBody) {
        farthestBody = entry;
      }
      continue;
    }

    const parentPosition = absolutePositions.get(body.orbit.parent) || {
      x: 0,
      y: 0,
      z: 0,
    };
    const ephemeris = elementsToCartesian(body.orbit, timeDays);

    const absolutePosition = {
      x: parentPosition.x + ephemeris.position.x,
      y: parentPosition.y + ephemeris.position.y,
      z: parentPosition.z + ephemeris.position.z,
    };

    const distanceFromParent = Math.sqrt(
      ephemeris.position.x ** 2 +
        ephemeris.position.y ** 2 +
        ephemeris.position.z ** 2
    );
    const distanceFromOrigin = Math.sqrt(
      absolutePosition.x ** 2 +
        absolutePosition.y ** 2 +
        absolutePosition.z ** 2
    );

    const orbitalPeriodDays = Number.isFinite(ephemeris.orbitalPeriod)
      ? ephemeris.orbitalPeriod
      : null;

    const entry = {
      ...body,
      position: absolutePosition,
      relativePosition: ephemeris.position,
      orbitalPeriodDays,
      distanceFromOrigin,
      distanceFromParent,
      trueAnomaly: ephemeris.trueAnomaly,
    };

    absolutePositions.set(body.name, absolutePosition);
    bodiesWithState.push(entry);

    if (
      orbitalPeriodDays &&
      (!fastestOrbiter || orbitalPeriodDays < fastestOrbiter.orbitalPeriodDays)
    ) {
      fastestOrbiter = entry;
    }
    if (
      !farthestBody ||
      distanceFromOrigin > (farthestBody.distanceFromOrigin || -Infinity)
    ) {
      farthestBody = entry;
    }
  }

  return {
    bodiesWithState,
    summary: {
      fastestOrbiter: fastestOrbiter ? fastestOrbiter.name : "-",
      farthestBody: farthestBody ? farthestBody.name : "-",
    },
  };
}

export function generateOrbitVertices(elements, segments = 128) {
  if (!elements || !elements.semiMajorAxis) {
    return [];
  }

  const { semiMajorAxis: a, eccentricity: e } = elements;
  const i = (elements.inclination || 0) * DEG2RAD;
  const omega = (elements.longitudeOfAscendingNode || 0) * DEG2RAD;
  const w = (elements.argumentOfPeriapsis || 0) * DEG2RAD;

  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  const ux = cosOmega * cosW - sinOmega * sinW * cosI;
  const uy = sinOmega * cosW + cosOmega * sinW * cosI;
  const uz = sinW * sinI;

  const vx = -cosOmega * sinW - sinOmega * cosW * cosI;
  const vy = -sinOmega * sinW + cosOmega * cosW * cosI;
  const vz = cosW * sinI;

  const points = [];

  for (let index = 0; index <= segments; index += 1) {
    const fraction = index / segments;
    const meanAnomaly = TWO_PI * fraction;
    const eccentricAnomaly = solveKepler(meanAnomaly, e);
    const cosE = Math.cos(eccentricAnomaly);
    const sinE = Math.sin(eccentricAnomaly);
    const radiusVector = a * (1 - e * cosE);
    const trueAnomaly = Math.atan2(
      Math.sqrt(1 - e * e) * sinE,
      cosE - e
    );

    const xOrbital = radiusVector * Math.cos(trueAnomaly);
    const yOrbital = radiusVector * Math.sin(trueAnomaly);

    points.push({
      x: ux * xOrbital + vx * yOrbital,
      y: uy * xOrbital + vy * yOrbital,
      z: uz * xOrbital + vz * yOrbital,
    });
  }

  return points;
}
