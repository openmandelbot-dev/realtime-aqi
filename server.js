import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.static('public'));

const PORT = Number(process.env.PORT || 3000);
const RESOURCE_ID = process.env.RESOURCE_ID || '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';
const API_KEY = process.env.DATA_GOV_API_KEY;
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

function pickValue(record, keys) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') {
      return record[key];
    }
  }
  return null;
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeRecord(record) {
  const latitude = toNumber(pickValue(record, ['latitude', 'Latitude', 'lat', 'station_latitude']));
  const longitude = toNumber(pickValue(record, ['longitude', 'Longitude', 'lon', 'lng', 'station_longitude']));
  const aqi = toNumber(pickValue(record, ['aqi', 'AQI', 'air_quality_index', 'max_aqi', 'avg_aqi']));
  const city = pickValue(record, ['city', 'city_name', 'name_of_city', 'city/town']) || 'Unknown';
  const state = pickValue(record, ['state', 'state_name', 'province', 'region']) || 'Unknown';
  const station = pickValue(record, ['station', 'station_name', 'location', 'site']) || 'Unknown Station';
  const updatedAt = pickValue(record, ['last_update', 'last_updated', 'date', 'timestamp', 'from_date', 'to_date']) || 'N/A';

  if (latitude === null || longitude === null || aqi === null) {
    return null;
  }

  return {
    latitude,
    longitude,
    aqi,
    city: String(city),
    state: String(state),
    station: String(station),
    updatedAt: String(updatedAt)
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/aqi', async (req, res) => {
  if (!API_KEY) {
    res.status(500).json({
      error: 'Missing DATA_GOV_API_KEY in environment variables.'
    });
    return;
  }

  const limit = Number(req.query.limit || 1000);

  const params = new URLSearchParams({
    'api-key': API_KEY,
    format: 'json',
    limit: String(Math.min(Math.max(limit, 1), 5000))
  });

  try {
    const response = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { accept: 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({
        error: 'Upstream API request failed.',
        details: errorText
      });
      return;
    }

    const payload = await response.json();
    const records = Array.isArray(payload.records) ? payload.records : [];
    const normalized = records.map(normalizeRecord).filter(Boolean);

    res.json({
      total: normalized.length,
      sourceTotal: payload.total,
      resourceId: RESOURCE_ID,
      records: normalized
    });
  } catch (error) {
    res.status(500).json({
      error: 'Unable to fetch AQI data.',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`AQI dashboard running at http://localhost:${PORT}`);
});
