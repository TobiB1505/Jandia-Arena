/**
 * Experts featured at the Jandia Arena.
 * Replace `imageUrl` with an official press photo URL when licensed.
 */
export const EXPERTS = [
  {
    id: "patrick-schmidt",
    name: "Patrick Schmidt",
    period: { from: "09.06.", to: "20.06.2026" },
    role: "Ehemaliger DFB-Juniorennationalspieler · Stürmer",
    imageUrl: null,
  },
  {
    id: "friedhelm-funkel",
    name: "Friedhelm Funkel",
    period: { from: "10.06.", to: "26.06.2026" },
    role: "DFB-Pokalsieger 1985 · 320 Bundesliga-Spiele",
    imageUrl: null,
  },
  {
    id: "michael-reschke",
    name: "Michael Reschke",
    period: { from: "25.06.", to: "06.07.2026" },
    role: "Ex-Sportdirektor Bayern, Leverkusen & VfB Stuttgart",
    imageUrl: null,
  },
  {
    id: "stefan-schnoor",
    name: "Stefan Schnoor",
    period: { from: "25.06.", to: "09.07.2026" },
    role: "277 Bundesliga-Spiele · 15 Tore · Premier-League-Erfahrung",
    imageUrl: null,
  },
  {
    id: "daniela-ulbing",
    name: "Daniela Ulbing",
    period: { from: "24.06.", to: "09.07.2026" },
    role: "Sportmoderatorin · DSF/Sport1, RTL & ProSieben",
    imageUrl: null,
  },
  {
    id: "hansi-kuepper",
    name: "Hansi Küpper",
    period: { from: "20.06.", to: "27.06.2026" },
    role: "Kommentatoren-Legende · Sky, Sat.1, Champions League",
    imageUrl: null,
  },
  {
    id: "kevin-grosskreutz",
    name: "Kevin Großkreutz",
    period: { from: "22.06.", to: "29.06.2026" },
    role: "Weltmeister 2014 · 2× Deutscher Meister · DFB-Pokalsieger",
    imageUrl: null,
  },
  {
    id: "jan-stecker",
    name: "Jan Stecker",
    period: { from: "10.07.", to: "20.07.2026" },
    role: "RTL-/NFL-Moderator · Sportexperte & Kommentator",
    imageUrl: null,
  },
  {
    id: "holger-fach",
    name: "Holger Fach",
    period: { from: "10.07.", to: "20.07.2026" },
    role: "Ex-Bundesligaprofi · 5 A-Länderspiele · DFB-Pokalsieger",
    imageUrl: null,
  },
];

/** Returns initials for the placeholder avatar (e.g. "FF" for "Friedhelm Funkel"). */
export function initialsOf(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}
