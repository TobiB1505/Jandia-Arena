/**
 * Experts featured at the Jandia Arena.
 * Replace `imageUrl` with an official press photo URL when licensed.
 * `imagePosition` can be used to bias the photo crop (e.g. when two people
 * are on the same image and the relevant one is on the left).
 */
export const EXPERTS = [
  {
    id: "patrick-schmidt",
    name: "Patrick Schmidt",
    period: { from: "09.06.", to: "20.06.2026" },
    role: "Ehemaliger DFB-Juniorennationalspieler · Stürmer",
    imageUrl:
      "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/16atujkc_Patrick%20Schmidt.jpg",
  },
  {
    id: "friedhelm-funkel",
    name: "Friedhelm Funkel",
    period: { from: "10.06.", to: "26.06.2026" },
    role: "DFB-Pokalsieger 1985 · 320 Bundesliga-Spiele",
    imageUrl:
      "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/tq8oo8li_Friedhelm%20Funkel.jpg",
  },
  {
    id: "michael-reschke",
    name: "Michael Reschke",
    period: { from: "25.06.", to: "06.07.2026" },
    role: "Ex-Sportdirektor Bayern, Leverkusen & VfB Stuttgart",
    imageUrl:
      "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/v9ox199u_Michael_reschke.jpg",
    // Original photo is a tight close-up – push the crop down so the full
    // face stays inside the card.
    imagePosition: "center 35%",
  },
  {
    id: "stefan-schnoor",
    name: "Stefan Schnoor",
    period: { from: "25.06.", to: "09.07.2026" },
    role: "277 Bundesliga-Spiele · 15 Tore · Premier-League-Erfahrung",
    imageUrl:
      "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/ss8xehak_Stefan%20Schnoor.webp",
    imagePosition: "center 35%",
  },
  {
    id: "daniela-fuss",
    name: "Daniela Fuß",
    period: { from: "24.06.", to: "09.07.2026" },
    role: "Sportmoderatorin · DSF/Sport1, RTL & ProSieben",
    imageUrl:
      "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/tmcx5zxt_Daniela%20Fu%C3%9F.jpg",
    // The press photo carries an IMAGO watermark in the right corner – shift
    // the focus to the left so the face stays centered and the watermark is
    // softened by the gradient overlay.
    imagePosition: "left center",
  },
  {
    id: "hansi-kuepper",
    name: "Hansi Küpper",
    period: { from: "20.06.", to: "27.06.2026" },
    role: "Kommentatoren-Legende · Sky, Sat.1, Champions League",
    imageUrl:
      "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/hlefm6j7_Hansi%20Kuepper.jpg",
  },
  {
    id: "kevin-grosskreutz",
    name: "Kevin Großkreutz",
    period: { from: "22.06.", to: "29.06.2026" },
    role: "Weltmeister 2014 · 2× Deutscher Meister · DFB-Pokalsieger",
    imageUrl:
      "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/l8phd0b7_Kevin%20Grosskreutz.jpg",
    // Getty watermark sits in the right half – bias to the face on the left.
    imagePosition: "left center",
  },
  {
    id: "jan-stecker",
    name: "Jan Stecker",
    period: { from: "10.07.", to: "20.07.2026" },
    role: "RTL-/NFL-Moderator · Sportexperte & Kommentator",
    imageUrl:
      "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/5fx8cukk_Jan%20Stecker.jpg",
    // The photo shows two people – Jan Stecker is the one on the left.
    imagePosition: "left center",
  },
  {
    id: "holger-fach",
    name: "Holger Fach",
    period: { from: "10.07.", to: "20.07.2026" },
    role: "Ex-Bundesligaprofi · 5 A-Länderspiele · DFB-Pokalsieger",
    imageUrl:
      "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/nhgnhyy5_Holger%20Fach.jpg",
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
