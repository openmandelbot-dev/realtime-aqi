const statusEl = document.getElementById('appStatus');

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('app-status-error', isError);
  statusEl.style.display = message ? 'block' : 'none';
}

function getCategory(aqi) {
  if (aqi <= 50) return { label: 'Good', color: '#2e7d32', className: 'good' };
  if (aqi <= 100) return { label: 'Satisfactory', color: '#9ccc65', className: 'good' };
  if (aqi <= 200) return { label: 'Moderate', color: '#f9a825', className: 'moderate' };
  if (aqi <= 300) return { label: 'Poor', color: '#ef6c00', className: 'poor' };
  if (aqi <= 400) return { label: 'Very Poor', color: '#d84315', className: 'bad' };
  return { label: 'Severe', color: '#9a031e', className: 'severe' };
}

function dedupeRecords(records) {
  const seen = new Set();
  return records.filter((record) => {
    const key = `${record.station}|${record.latitude}|${record.longitude}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

try {
  if (typeof window.L === 'undefined') {
    throw new Error('Leaflet failed to load.');
  }

  const map = L.map('map').setView([22.9734, 78.6569], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const stateFilter = document.getElementById('stateFilter');
  const cityFilter = document.getElementById('cityFilter');
  const viewMode = document.getElementById('viewMode');
  const refreshBtn = document.getElementById('refreshBtn');
  const totalStationsEl = document.getElementById('totalStations');
  const averageAqiEl = document.getElementById('averageAqi');
  const maxAqiEl = document.getElementById('maxAqi');
  const stateStatsEl = document.getElementById('stateStats');
  const legendEl = document.getElementById('legend');

  let layerGroup = L.layerGroup().addTo(map);
  let allRecords = [];

  function renderLegend() {
    const ranges = [
      { label: '0-50 Good', color: '#2e7d32' },
      { label: '51-100 Satisfactory', color: '#9ccc65' },
      { label: '101-200 Moderate', color: '#f9a825' },
      { label: '201-300 Poor', color: '#ef6c00' },
      { label: '301-400 Very Poor', color: '#d84315' },
      { label: '401+ Severe', color: '#9a031e' }
    ];

    legendEl.innerHTML = ranges
      .map(
        (range) =>
          `<div class="legend-row"><span class="legend-color" style="background:${range.color}"></span><span>${range.label}</span></div>`
      )
      .join('');
  }

  function populateStateFilter(records) {
    const states = [...new Set(records.map((item) => item.state))].sort((a, b) => a.localeCompare(b));

    stateFilter.innerHTML = '<option value="ALL">All States</option>';
    states.forEach((state) => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state;
      stateFilter.appendChild(option);
    });
  }

  function populateCityFilter(records, selectedState, preserveValue = true) {
    const previous = preserveValue ? cityFilter.value : 'ALL';
    const citySource =
      selectedState === 'ALL' ? records : records.filter((record) => record.state === selectedState);
    const cities = [...new Set(citySource.map((item) => item.city))].sort((a, b) => a.localeCompare(b));

    cityFilter.innerHTML = '<option value="ALL">All Cities</option>';
    cities.forEach((city) => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      cityFilter.appendChild(option);
    });

    if (preserveValue && cities.includes(previous)) {
      cityFilter.value = previous;
    } else {
      cityFilter.value = 'ALL';
    }
  }

  function renderStateStats(records) {
    const summary = records.reduce((acc, record) => {
      if (!acc[record.state]) {
        acc[record.state] = { totalAqi: 0, count: 0, max: 0 };
      }
      acc[record.state].totalAqi += record.aqi;
      acc[record.state].count += 1;
      acc[record.state].max = Math.max(acc[record.state].max, record.aqi);
      return acc;
    }, {});

    const rows = Object.entries(summary)
      .map(([state, stats]) => ({
        state,
        average: stats.totalAqi / stats.count,
        max: stats.max,
        count: stats.count
      }))
      .sort((a, b) => b.average - a.average);

    stateStatsEl.innerHTML = rows
      .map((row) => {
        const { className } = getCategory(row.average);
        return `<div class="state-row">
          <div>${row.state}<br><small>${row.count} stations</small></div>
          <strong class="${className}">${row.average.toFixed(0)}</strong>
        </div>`;
      })
      .join('');
  }

  function updateMetrics(records) {
    const total = records.length;
    const average = total ? records.reduce((sum, item) => sum + item.aqi, 0) / total : 0;
    const max = total ? Math.max(...records.map((item) => item.aqi)) : 0;

    totalStationsEl.textContent = String(total);
    averageAqiEl.textContent = average.toFixed(1);
    maxAqiEl.textContent = String(max.toFixed(0));
  }

  function renderMap(records) {
    layerGroup.clearLayers();

    records.forEach((record) => {
      const category = getCategory(record.aqi);
      const marker = L.circleMarker([record.latitude, record.longitude], {
        radius: 6,
        fillColor: category.color,
        color: '#1f2937',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      });

      marker.bindPopup(`
        <strong>${record.city}, ${record.state}</strong><br>
        Station: ${record.station}<br>
        AQI: <strong>${record.aqi}</strong> (${category.label})<br>
        Primary Pollutant: ${record.primaryPollutant || 'N/A'}<br>
        Last Updated: ${record.updatedAt}
      `);

      marker.addTo(layerGroup);
    });
  }

  function applyFilter() {
    const selectedState = stateFilter.value;
    const selectedCity = cityFilter.value;
    const selectedView = viewMode.value;

    let filtered = allRecords;
    if (selectedState !== 'ALL') {
      filtered = filtered.filter((item) => item.state === selectedState);
    }
    if (selectedCity !== 'ALL') {
      filtered = filtered.filter((item) => item.city === selectedCity);
    }

    const sorted = [...filtered].sort((a, b) => a.aqi - b.aqi);
    if (selectedView === 'BEST10') {
      filtered = sorted.slice(0, 10);
    } else if (selectedView === 'WORST10') {
      filtered = sorted.slice(-10).reverse();
    }

    renderMap(filtered);
    updateMetrics(filtered);
    renderStateStats(filtered);
  }

  function onStateChange() {
    populateCityFilter(allRecords, stateFilter.value, false);
    applyFilter();
  }

  async function loadData() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';
    setStatus('Loading AQI data...');

    try {
      const response = await fetch('/api/aqi?limit=1200');
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to fetch AQI data.');
      }

      allRecords = dedupeRecords(payload.records || []);

      if (!allRecords.length) {
        setStatus('No AQI records available from API.', true);
        stateStatsEl.innerHTML = '<p>No data returned.</p>';
        return;
      }

      populateStateFilter(allRecords);
      populateCityFilter(allRecords, 'ALL', false);
      applyFilter();
      setStatus(`Loaded ${allRecords.length} stations.`, false);
      setTimeout(() => setStatus(''), 1500);
    } catch (error) {
      const message = `Failed to load data: ${error.message}`;
      stateStatsEl.innerHTML = `<p>${message}</p>`;
      setStatus(message, true);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh';
    }
  }

  stateFilter.addEventListener('change', onStateChange);
  cityFilter.addEventListener('change', applyFilter);
  viewMode.addEventListener('change', applyFilter);
  refreshBtn.addEventListener('click', loadData);

  renderLegend();
  loadData();
} catch (error) {
  setStatus(`Startup error: ${error.message}`, true);
}
