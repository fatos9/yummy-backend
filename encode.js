import fs from "fs";

const json = fs.readFileSync("serviceAccountKey.json", "utf8");
const base64 = Buffer.from(json, "utf8").toString("base64");

console.log(base64);
