import fs from "fs"
import axios from "axios"
import path from "path"
import Ajv from "ajv"

const translateAPI = process.env.TRANSLATE_API

const rootDir = path.join("packages-js", "dash", "src", "lib", "i18n")
const localesDir = path.join(rootDir, "locales")

const i18nlist = JSON.parse(fs.readFileSync(path.join(localesDir, "_list.json"), "utf-8"))
const i18nSchema = JSON.parse(fs.readFileSync(path.join(localesDir, "_schema.json"), "utf-8"))

const ajv = new Ajv()
const validate = ajv.compile(i18nSchema)

const files = fs.readdirSync(localesDir, { withFileTypes: true })

const defines = files.filter(f => {
    if (f.name == "_schema.json" || f.name == "_list.json") return false
    const fileData = JSON.parse(fs.readFileSync(path.join(localesDir, f.name), "utf-8"))
    if (validate(fileData)) return true
})

const undefines = i18nlist.filter((data) => {
    const res = defines.find((define, index) => {
        const file = path.parse(define.name)
        if (data.code == file.name) {
            return true
        }
    })
    if (res == undefined) return true
})


async function requestTranslate(data) {
    const result = await axios.post(translateAPI, data)
    if (result.data.code !== 200) return undefined
    return result.data.data
}

async function batchProcess(promises, batchSize) {
    const results = [];
    for (let i = 0; i < promises.length; i += batchSize) {
        const batch = promises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
    }
    return results;
}

async function recursiveTranslate(obj, defaultLocate, targetLocate, batchSize = 5) {
    const tasks = [];
    const translated = JSON.parse(JSON.stringify(obj));
    function collectTasks(originalObj, newObj) {
        for (let key in originalObj) {
            if (key == 'icon') {
                newObj[key] = originalObj[key];
                continue
            }
            if (typeof originalObj[key] === 'object' && originalObj[key] !== null) {
                newObj[key] = Array.isArray(originalObj[key]) ? [] : {};
                collectTasks(originalObj[key], newObj[key]);
            } else {
                tasks.push(
                    (async () => {
                        let result;
                        do {
                            result = await requestTranslate({
                                text: originalObj[key],
                                source: defaultLocate,
                                target: targetLocate
                            });
                            if (result === undefined) {
                                process.stdout.write(`.`);
                            }
                        } while (result === undefined);
                        newObj[key] = result;
                        return result;
                    })()
                );
            }
        }
    }
    collectTasks(obj, translated);
    await batchProcess(tasks, batchSize);
    return translated;
}

if (undefines.length == 0) {
    console.log("Cool! No undefined files!")
    process.exit(0)
}

if (!defines[0]) {
    console.error("Uoops... no define files...\nplease create locale file")
    process.exit(0)
}

const defaultFile = path.parse(defines[0].name)
const defaultData = JSON.parse(fs.readFileSync(path.join(localesDir, `${defaultFile.name}.json`), "utf-8"))

for await (const data of undefines) {
    process.stdout.write(`[${data.code}] Translating`)
    const translated = await recursiveTranslate(defaultData, defaultFile.name, data.code)
    if (validate(translated)) {
        console.log(`\n[${data.code}] Validation passed!`)
    } else {
        console.error(`\n[${data.code}] Validation failed!`)
        continue
    }
    fs.writeFileSync(path.join(localesDir, `${data.code}.json`), JSON.stringify(translated, null, 4))
    console.log(`[${data.code}] Translated and saved at ${path.join(localesDir, `${data.code}.json`)}`)
}
