import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export async function fetchAllMatches() {
  const res = await axios.get(`${API}/matches/all`);
  return res.data;
}

export async function fetchSchedule() {
  const res = await axios.get(`${API}/schedule`);
  return res.data;
}

export async function fetchNow() {
  const res = await axios.get(`${API}/now`);
  return res.data;
}

// Simulate-date runtime override + Live-control API
export async function fetchSimulateDate() {
  const res = await axios.get(`${API}/settings/simulate-date`);
  return res.data;
}

export async function setSimulateDate(date) {
  const res = await axios.put(`${API}/settings/simulate-date`, { date });
  return res.data;
}

export async function enableLiveMode() {
  const res = await axios.post(`${API}/settings/simulate-date/live`);
  return res.data;
}

export async function resetSimulateDate() {
  const res = await axios.delete(`${API}/settings/simulate-date`);
  return res.data;
}

export async function triggerGoalTest() {
  const res = await axios.post(`${API}/admin/goal-test`);
  return res.data;
}

// --- Live Control (Admin Remote) ---
export async function controlPause()  { return (await axios.post(`${API}/control/rotation/pause`)).data; }
export async function controlResume() { return (await axios.post(`${API}/control/rotation/resume`)).data; }
export async function controlNext()   { return (await axios.post(`${API}/control/screen/next`)).data; }
export async function controlPrev()   { return (await axios.post(`${API}/control/screen/previous`)).data; }
export async function controlShow(screen)  { return (await axios.post(`${API}/control/screen/show`,  { screen })).data; }
export async function controlPin(screen)   { return (await axios.post(`${API}/control/screen/pin`,   { screen })).data; }
export async function controlUnpin()  { return (await axios.post(`${API}/control/screen/unpin`)).data; }
export async function controlReload() { return (await axios.post(`${API}/control/tv/reload`)).data; }
export async function controlOverlays(hide) { return (await axios.post(`${API}/control/overlays/hide`, { hide })).data; }

export async function fetchGroups() {
  const res = await axios.get(`${API}/groups`);
  return res.data;
}

// ---- Lower Thirds (admin-driven cycle) ----
export async function fetchLowerThirds() {
  const res = await axios.get(`${API}/lower-thirds`);
  return res.data;
}

export async function fetchLowerThirdsSettings() {
  const res = await axios.get(`${API}/lower-thirds/settings`);
  return res.data;
}

export async function fetchLowerThirdsMeta() {
  const res = await axios.get(`${API}/lower-thirds/meta`);
  return res.data;
}

export async function createLowerThird(payload) {
  const res = await axios.post(`${API}/lower-thirds`, payload);
  return res.data;
}

export async function updateLowerThird(id, payload) {
  const res = await axios.put(`${API}/lower-thirds/${id}`, payload);
  return res.data;
}

export async function deleteLowerThird(id) {
  const res = await axios.delete(`${API}/lower-thirds/${id}`);
  return res.data;
}

export async function updateLowerThirdsSettings(payload) {
  const res = await axios.put(`${API}/lower-thirds/settings`, payload);
  return res.data;
}

export async function patchLowerThirdPosition(id, position_x, position_y) {
  const res = await axios.patch(`${API}/lower-thirds/${id}/position`, {
    position_x,
    position_y,
  });
  return res.data;
}

export async function patchLowerThirdActive(id, active) {
  const res = await axios.patch(`${API}/lower-thirds/${id}/active`, { active });
  return res.data;
}

// ---- Experts ----
export async function fetchExperts() {
  const res = await axios.get(`${API}/experts`);
  return res.data;
}

export async function updateExpert(id, payload) {
  const res = await axios.put(`${API}/experts/${id}`, payload);
  return res.data;
}

export async function uploadExpertImage(id, file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post(`${API}/experts/${id}/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });
  return res.data;
}

export async function clearExpertImage(id) {
  const res = await axios.delete(`${API}/experts/${id}/image`);
  return res.data;
}

/** Convert a backend expert (snake_case) to the shape ExpertsScreen expects. */
export function adaptExpert(e) {
  if (!e) return null;
  const imageUrl = e.image_url
    ? e.image_url.startsWith("http")
      ? e.image_url
      : `${BACKEND_URL}${e.image_url}`
    : null;
  return {
    id: e.id,
    name: e.name,
    role: e.role,
    period: { from: e.period_from, to: e.period_to },
    imageUrl,
    imageFit: e.image_fit || "cover",
    imagePosition: e.image_position || null,
    order: e.order || 0,
  };
}

// In-memory demo fallback (used when backend is unreachable)
const _mkIso = (offsetMin) =>
  new Date(Date.now() + offsetMin * 60 * 1000).toISOString();

export const FALLBACK_MATCHES = [
  { id: "fb1", stage: "Gruppe A", venue: "Lusail Stadium", kickoff: _mkIso(-270), status: "finished", minute: null, home: { code: "DE", name: "Deutschland", short: "GER" }, away: { code: "JP", name: "Japan", short: "JPN" }, home_score: 3, away_score: 1 },
  { id: "fb2", stage: "Gruppe B", venue: "Al Bayt Stadium", kickoff: _mkIso(-165), status: "finished", minute: null, home: { code: "BR", name: "Brasilien", short: "BRA" }, away: { code: "MX", name: "Mexiko", short: "MEX" }, home_score: 2, away_score: 0 },
  { id: "fb3", stage: "Gruppe C", venue: "Education City", kickoff: _mkIso(-37), status: "live", minute: 37, home: { code: "ES", name: "Spanien", short: "ESP" }, away: { code: "PT", name: "Portugal", short: "POR" }, home_score: 1, away_score: 1 },
  { id: "fb4", stage: "Gruppe D", venue: "Stadium 974", kickoff: _mkIso(-50), status: "halftime", minute: 45, home: { code: "FR", name: "Frankreich", short: "FRA" }, away: { code: "IT", name: "Italien", short: "ITA" }, home_score: 2, away_score: 1 },
  { id: "fb5", stage: "Achtelfinale", venue: "Khalifa International", kickoff: _mkIso(18), status: "scheduled", minute: null, home: { code: "AR", name: "Argentinien", short: "ARG" }, away: { code: "NL", name: "Niederlande", short: "NED" }, home_score: null, away_score: null },
  { id: "fb6", stage: "Achtelfinale", venue: "Al Janoub Stadium", kickoff: _mkIso(150), status: "scheduled", minute: null, home: { code: "GB-ENG", name: "England", short: "ENG" }, away: { code: "BE", name: "Belgien", short: "BEL" }, home_score: null, away_score: null },
  { id: "fb7", stage: "Achtelfinale", venue: "Ahmad bin Ali", kickoff: _mkIso(300), status: "scheduled", minute: null, home: { code: "HR", name: "Kroatien", short: "CRO" }, away: { code: "MA", name: "Marokko", short: "MAR" }, home_score: null, away_score: null },
  { id: "fb8", stage: "Achtelfinale", venue: "Al Thumama", kickoff: _mkIso(450), status: "scheduled", minute: null, home: { code: "UY", name: "Uruguay", short: "URU" }, away: { code: "US", name: "USA", short: "USA" }, home_score: null, away_score: null },
  // tomorrow (≈+22h .. +30h)
  { id: "fbt1", stage: "Viertelfinale", venue: "Lusail Stadium", kickoff: _mkIso(60 * 22), status: "scheduled", minute: null, home: { code: "DE", name: "Deutschland", short: "GER" }, away: { code: "ES", name: "Spanien", short: "ESP" }, home_score: null, away_score: null },
  { id: "fbt2", stage: "Viertelfinale", venue: "Al Bayt Stadium", kickoff: _mkIso(60 * 25), status: "scheduled", minute: null, home: { code: "FR", name: "Frankreich", short: "FRA" }, away: { code: "PT", name: "Portugal", short: "POR" }, home_score: null, away_score: null },
  { id: "fbt3", stage: "Viertelfinale", venue: "Education City", kickoff: _mkIso(60 * 28), status: "scheduled", minute: null, home: { code: "BR", name: "Brasilien", short: "BRA" }, away: { code: "AR", name: "Argentinien", short: "ARG" }, home_score: null, away_score: null },
  { id: "fbt4", stage: "Viertelfinale", venue: "Stadium 974", kickoff: _mkIso(60 * 30), status: "scheduled", minute: null, home: { code: "GB-ENG", name: "England", short: "ENG" }, away: { code: "NL", name: "Niederlande", short: "NED" }, home_score: null, away_score: null },
];

export const FALLBACK_GROUPS = [
  { name: "Gruppe A", standings: [
    { team: { code: "DE", name: "Deutschland", short: "GER" }, played: 3, wins: 3, draws: 0, losses: 0, goals_for: 7, goals_against: 2, goal_diff: 5, points: 9 },
    { team: { code: "JP", name: "Japan", short: "JPN" }, played: 3, wins: 2, draws: 0, losses: 1, goals_for: 5, goals_against: 4, goal_diff: 1, points: 6 },
    { team: { code: "MA", name: "Marokko", short: "MAR" }, played: 3, wins: 1, draws: 0, losses: 2, goals_for: 3, goals_against: 4, goal_diff: -1, points: 3 },
    { team: { code: "US", name: "USA", short: "USA" }, played: 3, wins: 0, draws: 0, losses: 3, goals_for: 2, goals_against: 7, goal_diff: -5, points: 0 },
  ]},
  { name: "Gruppe B", standings: [
    { team: { code: "BR", name: "Brasilien", short: "BRA" }, played: 3, wins: 2, draws: 1, losses: 0, goals_for: 6, goals_against: 1, goal_diff: 5, points: 7 },
    { team: { code: "AR", name: "Argentinien", short: "ARG" }, played: 3, wins: 2, draws: 0, losses: 1, goals_for: 5, goals_against: 3, goal_diff: 2, points: 6 },
    { team: { code: "MX", name: "Mexiko", short: "MEX" }, played: 3, wins: 1, draws: 0, losses: 2, goals_for: 2, goals_against: 4, goal_diff: -2, points: 3 },
    { team: { code: "UY", name: "Uruguay", short: "URU" }, played: 3, wins: 0, draws: 1, losses: 2, goals_for: 1, goals_against: 6, goal_diff: -5, points: 1 },
  ]},
  { name: "Gruppe C", standings: [
    { team: { code: "ES", name: "Spanien", short: "ESP" }, played: 3, wins: 2, draws: 1, losses: 0, goals_for: 5, goals_against: 2, goal_diff: 3, points: 7 },
    { team: { code: "PT", name: "Portugal", short: "POR" }, played: 3, wins: 2, draws: 1, losses: 0, goals_for: 4, goals_against: 1, goal_diff: 3, points: 7 },
    { team: { code: "HR", name: "Kroatien", short: "CRO" }, played: 3, wins: 1, draws: 0, losses: 2, goals_for: 3, goals_against: 5, goal_diff: -2, points: 3 },
    { team: { code: "NL", name: "Niederlande", short: "NED" }, played: 3, wins: 0, draws: 0, losses: 3, goals_for: 1, goals_against: 5, goal_diff: -4, points: 0 },
  ]},
  { name: "Gruppe D", standings: [
    { team: { code: "FR", name: "Frankreich", short: "FRA" }, played: 3, wins: 3, draws: 0, losses: 0, goals_for: 8, goals_against: 2, goal_diff: 6, points: 9 },
    { team: { code: "IT", name: "Italien", short: "ITA" }, played: 3, wins: 1, draws: 1, losses: 1, goals_for: 4, goals_against: 4, goal_diff: 0, points: 4 },
    { team: { code: "BE", name: "Belgien", short: "BEL" }, played: 3, wins: 1, draws: 1, losses: 1, goals_for: 3, goals_against: 3, goal_diff: 0, points: 4 },
    { team: { code: "GB-ENG", name: "England", short: "ENG" }, played: 3, wins: 0, draws: 0, losses: 3, goals_for: 1, goals_against: 7, goal_diff: -6, points: 0 },
  ]},
];
