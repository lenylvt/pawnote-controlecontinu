import { authenticatePronoteQRCode, authenticatePronoteCredentials, PronoteApiAccountId, StudentPrecautionaryMeasure } from "pawnote";

/*const pronoteBaseURL = "https://demo.index-education.net/pronote";

console.log("------ CREDS:");

const client = await authenticatePronoteCredentials(pronoteBaseURL, {
  accountTypeID: PronoteApiAccountId.Student,
  username: "demonstration",
  password: "pronotevs",

  // This is a unique identifier that will be used to identify the device
  // with the server. It can be anything, but it must be unique.
  deviceUUID: "my-device-uuid"
});*/

const client = await authenticatePronoteQRCode({
  // The 4 numbers you typed earlier.
  pinCode: "0000",

  // This is the data from the QR Code.
  dataFromQRCode: {
    jeton: "",
    login: "", 
    url: ""
  },

  // An unique identifier that will be used to identify the device.
  deviceUUID: "my-device-uuid"
});

console.log("Start of Script Execution");
console.log("=========================");

const periods = await client.periods;
console.log("Total Periods Fetched:", periods.length);

const pointsByPrefix = {};
const countByPrefix = {};
const totalPointsByPillar = {};

const baremePoints = {
  "Très bonne maîtrise": 50,
  "Maîtrise satisfaisante": 40,
  "Presque maîtrisé": 25,
  "Maîtrise fragile": 25,
  "Début de maîtrise": 25,
  "Maîtrise insuffisante": 10,
};
const baremeValues = Object.values(baremePoints);

// Function to round to the nearest bareme point
function roundToNearestBareme(score) {
  return baremeValues.reduce((prev, curr) => Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev);
}

// Function to round down to the closest lower bareme point
function roundDownToBareme(score) {
  return baremeValues.reduce((prev, curr) => curr <= score && curr >= prev ? curr : prev, 0);
}

// Function to round up to the closest higher bareme point
function roundUpToBareme(score) {
  return baremeValues.reduce((prev, curr) => curr >= score && (prev === 0 || curr <= prev) ? curr : prev, 0);
}

for (const period of periods) {
  console.log("\nProcessing Period:", period.name);
  const evaluations = await client.getEvaluations(period);

  evaluations.forEach((evaluation) => {
    console.log(`\nEvaluating: ${evaluation.name}`);
    console.log("Description:", evaluation.description || "(no description)");
    console.log("Submission Date:", evaluation.date.toLocaleString());

    evaluation.skills.forEach((skill) => {
      console.log("Skill:", skill.item?.name ?? "Unknown skill", "-", skill.level);
      if (skill.pillar && skill.pillar.prefixes) {
        const prefixes = skill.pillar.prefixes;

        prefixes.forEach((prefix) => {
          if (prefix !== "") {
            const points = (baremePoints[skill.level] || 0) * skill.coefficient;
            console.log(`Prefix: ${prefix} - Points: ${points}, Count: ${countByPrefix[prefix] || 0}`);

            if (!pointsByPrefix[prefix]) {
              pointsByPrefix[prefix] = points;
              countByPrefix[prefix] = 1;
            } else {
              pointsByPrefix[prefix] += points;
              countByPrefix[prefix] += 1;
            }
          }
        });
      }
    });
  });
}

console.log("\n");
console.log("==================");
console.log("Summary of Results");

let totalAveragePoints = 0;
let totalAveragePointsMin = 0;
let totalAveragePointsMax = 0;

const sortedPrefixes = Object.keys(pointsByPrefix).sort((a, b) => {
  const splitA = a.split('.');
  const splitB = b.split('.');
  const mainNumA = parseInt(splitA[0].substring(1), 10);
  const mainNumB = parseInt(splitB[0].substring(1), 10);
  const subNumA = splitA[1] ? parseInt(splitA[1], 10) : 0;
  const subNumB = splitB[1] ? parseInt(splitB[1], 10) : 0;

  return mainNumA !== mainNumB ? mainNumA - mainNumB : subNumA - subNumB;
});

sortedPrefixes.forEach(prefix => {
  const average = pointsByPrefix[prefix] / countByPrefix[prefix];
  const roundedAverage = roundToNearestBareme(average);
  const roundedAverageMin = roundDownToBareme(average);
  const roundedAverageMax = roundUpToBareme(average);

  totalAveragePoints += roundedAverage;
  totalAveragePointsMin += roundedAverageMin;
  totalAveragePointsMax += roundedAverageMax;

  console.log(`${prefix}: Nearest Rounded Average Points - ${roundedAverage}, Rounded Down - ${roundedAverageMin}, Rounded Up - ${roundedAverageMax}, Total Points - ${pointsByPrefix[prefix]}, Number of Skills - ${countByPrefix[prefix]}`);
});

console.log("\n");
console.log("==================");
console.log("Overall Total Average Points :");
console.log("Rounded to Nearest:", totalAveragePoints);
console.log("Rounded Down:", totalAveragePointsMin);
console.log("Rounded Up:", totalAveragePointsMax);

console.log("");
console.log("==================");
console.log("CONTROLE CONTINU");
console.log("You have currently:", totalAveragePoints, "/400");
console.log("==================");
console.log("");
