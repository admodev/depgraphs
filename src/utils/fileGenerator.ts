import Handlebars from "handlebars";
import * as fs from "node:fs";
import * as path from "node:path";

const source = fs.readFileSync(path.join(__dirname, "template.hbs"), "utf8");
const template = Handlebars.compile(source);
