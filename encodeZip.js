import fs from "fs";

const json = fs.readFileSync("serviceAccountKey.json");
const base64 = Buffer.from(json).toString("base64");

console.log("\n🔥 BASE64 ÇIKTI:\n");
console.log(base64);
