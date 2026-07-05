import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 409));

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const MODE = __ENV.MODE || 'shared';
const VUS = Number(__ENV.VUS || 100);
const ITERATIONS = Number(__ENV.ITERATIONS || 100);
const ITERATIONS_PER_VU = Number(__ENV.ITERATIONS_PER_VU || 1);
const TOUR_ID = Number(__ENV.TOUR_ID || 0);
const PACKAGE_ID = Number(__ENV.PACKAGE_ID || 0);
const DEPARTURE_ID = __ENV.DEPARTURE_ID ? Number(__ENV.DEPARTURE_ID) : undefined;
const PEOPLE = Number(__ENV.PEOPLE || 1);
const SEAT_COUNT = Number(__ENV.SEAT_COUNT || PEOPLE);
const PAYMENT_METHOD = __ENV.PAYMENT_METHOD || 'IN_STORE';

const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || 'minh.nguyen.traveler@gmail.com';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || 'Seed@Review2026';
const AUTH_COOKIE = __ENV.AUTH_COOKIE || '';

export const bookingCreated = new Counter('booking_created');
export const bookingConflict = new Counter('booking_conflict');
export const bookingFailed = new Counter('booking_failed');
export const bookingDuration = new Trend('booking_duration_ms');

function buildScenario() {
  if (MODE === 'burst') {
    return {
      booking_burst: {
        executor: 'per-vu-iterations',
        vus: VUS,
        iterations: ITERATIONS_PER_VU,
        maxDuration: __ENV.MAX_DURATION || '2m',
      },
    };
  }

  return {
    booking_shared: {
      executor: 'shared-iterations',
      vus: VUS,
      iterations: ITERATIONS,
      maxDuration: __ENV.MAX_DURATION || '2m',
    },
  };
}

export const options = {
  scenarios: buildScenario(),
  thresholds: {
    booking_failed: ['count==0'],
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
  },
};

function requirePositiveInt(name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer. Pass it with -e ${name}=...`);
  }
}

function getCookieHeader(res) {
  const parts = [];
  const accessToken = res.cookies.accessToken && res.cookies.accessToken[0];
  const refreshToken = res.cookies.refreshToken && res.cookies.refreshToken[0];

  if (accessToken && accessToken.value) {
    parts.push(`accessToken=${accessToken.value}`);
  }

  if (refreshToken && refreshToken.value) {
    parts.push(`refreshToken=${refreshToken.value}`);
  }

  return parts.join('; ');
}

export function setup() {
  requirePositiveInt('TOUR_ID', TOUR_ID);
  requirePositiveInt('PACKAGE_ID', PACKAGE_ID);
  requirePositiveInt('PEOPLE', PEOPLE);
  requirePositiveInt('SEAT_COUNT', SEAT_COUNT);

  if (DEPARTURE_ID !== undefined) {
    requirePositiveInt('DEPARTURE_ID', DEPARTURE_ID);
  }

  if (AUTH_COOKIE) {
    return { cookieHeader: AUTH_COOKIE };
  }

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /auth/login' },
    },
  );

  const loggedIn = check(loginRes, {
    'login succeeded': (res) => res.status >= 200 && res.status < 300,
  });

  if (!loggedIn) {
    throw new Error(`Login failed with status ${loginRes.status}: ${loginRes.body}`);
  }

  const cookieHeader = getCookieHeader(loginRes);
  if (!cookieHeader) {
    throw new Error('Login response did not include accessToken/refreshToken cookies.');
  }

  return { cookieHeader };
}

export default function (data) {
  const requestId = `${__VU}-${__ITER}-${Date.now()}`;
  const payload = {
    tourId: TOUR_ID,
    packageId: PACKAGE_ID,
    departureId: DEPARTURE_ID,
    numberOfPeople: PEOPLE,
    seatCount: SEAT_COUNT,
    paymentMethod: PAYMENT_METHOD,
    contactInfo: {
      fullName: `Load Test ${requestId}`,
      email: `loadtest-${requestId}@example.test`,
      phone: '0900000000',
    },
  };

  const res = http.post(`${BASE_URL}/booking`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      Cookie: data.cookieHeader,
    },
    tags: { name: 'POST /booking' },
  });

  bookingDuration.add(res.timings.duration);

  const ok = check(res, {
    'status 200/201 created or 409 slot conflict': (r) =>
      r.status === 200 || r.status === 201 || r.status === 409,
  });

  if (res.status === 200 || res.status === 201) {
    bookingCreated.add(1);
  } else if (res.status === 409) {
    bookingConflict.add(1);
  }

  if (!ok) {
    bookingFailed.add(1);
    console.error(`booking failed status=${res.status} body=${String(res.body).slice(0, 500)}`);
  }
}
