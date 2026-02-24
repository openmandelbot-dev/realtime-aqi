# India Realtime AQI Geospatial App

A full-stack app that fetches realtime AQI data from [data.gov.in AQI catalog](https://www.data.gov.in/catalog/real-time-air-quality-index) and visualizes it on an interactive map across cities and states in India.

## Features
- Realtime AQI fetch through a backend API proxy
- Geospatial map view using Leaflet + OpenStreetMap
- AQI color-coded markers with category legend
- State filter for focused analysis
- Live state rankings and AQI summary metrics

## Tech Stack
- Node.js + Express
- Vanilla JavaScript (frontend)
- Leaflet map library

## Project Structure
```text
aqi-geospatial-app/
  public/
    app.js
    index.html
    styles.css
  .env.example
  .gitignore
  package.json
  server.js
```

## Prerequisites
- Node.js 18+
- Data.gov.in API key

## Setup and Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your real API key:
   ```env
   DATA_GOV_API_KEY=your_actual_key
   PORT=3000
   RESOURCE_ID=3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69
   ```
4. Start app:
   ```bash
   npm start
   ```
5. Open in browser:
   - `http://localhost:3000`

## API Endpoint Used
The server queries:
```text
https://api.data.gov.in/resource/<RESOURCE_ID>?api-key=<API_KEY>&format=json&limit=2000
```

## Publish to a New GitHub Repo
Run these commands from inside `aqi-geospatial-app`:

```bash
git init
git add .
git commit -m "Initial commit: realtime AQI geospatial app"
git branch -M main
gh repo create aqi-geospatial-app --public --source=. --remote=origin --push
```

If `gh` is not installed, use GitHub website to create a new empty repo and then:

```bash
git remote add origin https://github.com/<your-username>/aqi-geospatial-app.git
git push -u origin main
```

## Notes
- Keep `.env` private and never commit API keys.
- AQI field mapping is normalized in `server.js` to handle schema variations from the source feed.
