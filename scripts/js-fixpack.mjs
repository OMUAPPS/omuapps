import fixpack from "fixpack";

const paths = [
    "packages-js/chat/package.json",
    "packages-js/dash/package.json",
    "packages-js/i18n/package.json",
    "packages-js/omu/package.json",
    "packages-js/plugin-obs/package.json",
    "packages-js/shared/package.json",
    "packages-js/site/package.json",
    "packages-js/ui/package.json"
]

for (const path of paths) {
    console.log(`\n===${path}===`)
    fixpack(path)
}