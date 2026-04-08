import Handlebars from "handlebars";
import * as fs from "node:fs";

const generateFile = (filePath: string, data: Record<string, any>): void => {
    const source = fs.readFileSync(filePath, "utf8");
    const template = Handlebars.compile(source);
    const result = template(data);

    fs.writeFileSync(filePath, result);
}

export default generateFile;
