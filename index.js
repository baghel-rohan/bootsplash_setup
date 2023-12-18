#!/usr/bin/env node

const fs = require("fs")
const { execSync } = require("child_process")
const path = require("path")
const yargs = require("yargs")
const xml2js = require("xml2js")

const argv = yargs
  .option("projectRelativePath", {
    alias: "p",
    describe: "Relative path to the React Native project directory",
    demandOption: true,
    type: "string",
    default: ".",
  })
  .option("backgroundColor", {
    alias: "bg",
    describe: "Background color or the splash screens of the flavours",
    demandOption: true,
    type: "string",
    default: "#FFFFFF",
  })
  .option("logoSize", {
    alias: "s",
    describe: "Size of logo according to the android splashscreen guidelines",
    demandOption: true,
    type: "number",
    default: 192,
  })
  .help()
  .alias("help", "h").argv

const projectPath = argv.projectRelativePath
const backgroundColor = argv.backgroundColor
const logoSize = argv.logoSize

// Step 1: Get all flavor name from android app directory
function getDirectories(path) {
  return fs
    .readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
}
const directoryPath = `${projectPath}/android/app/src`

let directories = []
try {
  directories = getDirectories(directoryPath)
} catch (error) {
  console.error("Error reading directory:", error)
}

let flavors = []

directories.forEach((item) => {
  if (item == "androidTest" || item == "debug" || item == "main") {
  } else {
    flavors.push(item)
  }
})

if (flavors.length == 0) flavors = ["main"] // Create for at-least main

// Step 2: Run generate command to create splash logo

flavors.forEach((flavor) => {
  // Check if the corresponding PNG file exists
  const pngPath = `${projectPath}/assets/${flavor}.png`

  if (fs.existsSync(pngPath)) {
    const command = `yarn react-native generate-bootsplash ${projectPath}/assets/${flavor}.png --platforms=android,ios --flavor=${flavor} --logo-width=${logoSize} --background-color=${backgroundColor}`

    try {
      execSync(command, { stdio: "inherit" })
    } catch (error) {
      console.error(`Failed to run ${command}. Exiting script.`)
      process.exit(1)
    }
  }
})

// Step 3: Add style tag to styles.xml
const stylesXmlPath = `${projectPath}/android/app/src/main/res/values/styles.xml`
const stylesXml = fs.readFileSync(stylesXmlPath, "utf-8")
const bootThemeStyle = `<style name="BootTheme" parent="Theme.SplashScreen">\n\t\t<item name="windowSplashScreenBackground">@color/bootsplash_background</item>\n\t\t<item name="windowSplashScreenAnimatedIcon">@mipmap/bootsplash_logo</item>\n\t\t<item name="postSplashScreenTheme">@style/AppTheme</item>\n\t</style>`

if (!stylesXml.includes(bootThemeStyle)) {
  const resourcesTagIndex = stylesXml.indexOf("</resources>")
  const updatedStylesXml =
    stylesXml.slice(0, resourcesTagIndex) +
    `\n\t${bootThemeStyle}\n` +
    stylesXml.slice(resourcesTagIndex)

  fs.writeFileSync(stylesXmlPath, updatedStylesXml, "utf-8")
}

// Step 4: Add android:theme="@style/BootTheme" to AndroidManifest.xml
const manifestPath = `${projectPath}/android/app/src/main/AndroidManifest.xml`
const manifest = fs.readFileSync(manifestPath, "utf-8")

const packagePathMatches = manifest.match(/package="(.+?)"/)
const packagePath = packagePathMatches
  ? packagePathMatches[1].replace(/\./g, "/")
  : ""

// Step 5: Modify MainActivity.java
const mainActivityPath = `${projectPath}/android/app/src/main/java/${packagePath}/MainActivity.java`
const mainActivity = fs.readFileSync(mainActivityPath, "utf-8")

if (!mainActivity.includes("RNBootSplash.init(this);")) {
  const importStatement =
    "import android.os.Bundle;\nimport com.zoontek.rnbootsplash.RNBootSplash;"
  const onCreateMethod = `\t@Override\n\tprotected void onCreate(Bundle savedInstanceState) {\n\t\tRNBootSplash.init(this);\n\t\tsuper.onCreate(savedInstanceState);\n\t}`

  const updatedMainActivity =
    importStatement +
    "\n\n" +
    mainActivity.replace(
      /public class MainActivity.*{/,
      `public class MainActivity {\n${onCreateMethod}`
    )

  fs.writeFileSync(mainActivityPath, updatedMainActivity, "utf-8")
}

console.log("Setup completed successfully!")
