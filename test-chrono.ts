import * as chrono from "chrono-node";

const text =
  "India won the 2026 T20 world cup against Australia by 5 wickets in a thrilling match.";
console.log("Parsing:", text);

const results = chrono.parse(text);
console.log(`Found ${results.length} dates.`);

for (const result of results) {
  console.log("- Text:", result.text);
  console.log("- Date:", result.start.date());
}

const text2 = "The election will happen on 5th march 2026.";
console.log("\nParsing:", text2);
const results2 = chrono.parse(text2);
for (const result of results2) {
  console.log("- Text:", result.text);
  console.log("- Date:", result.start.date());
}
