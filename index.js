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
console.log("argv.logoSize==>", logoSize, projectPath, backgroundColor)

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
console.log("directories==>", directories)

let flavors = []

directories.forEach((item) => {
  if (item == "androidTest" || item == "debug" || item == "main") {
  } else {
    flavors.push(item)
  }
})

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

// Step 5: Add implementation("androidx.core:core-splashscreen:1.0.0") to dependencies in build.gradle
// const coreSplashscreenDependency =
//   'implementation("androidx.core:core-splashscreen:1.0.0")'
// const dependenciesIndex = buildGradle.lastIndexOf("dependencies")
// if (dependenciesIndex !== -1) {
//   const updatedBuildGradle =
//     buildGradle.slice(0, dependenciesIndex + "dependencies".length) +
//     `\n    ${coreSplashscreenDependency}` +
//     buildGradle.slice(dependenciesIndex + "dependencies".length)

//   fs.writeFileSync(buildGradlePath, updatedBuildGradle, "utf-8")
// }

// Step 6: Add style tag to styles.xml
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

// Step 7: Add android:theme="@style/BootTheme" to AndroidManifest.xml
const manifestPath = `${projectPath}/android/app/src/main/AndroidManifest.xml`
const manifest = fs.readFileSync(manifestPath, "utf-8")

const packagePathMatches = manifest.match(/package="(.+?)"/)
const packagePath = packagePathMatches
  ? packagePathMatches[1].replace(/\./g, "/")
  : ""

// const applicationTagIndex = manifest.indexOf("<application")
// const existingThemeMatches = manifest
//   .slice(applicationTagIndex, applicationTagIndex + 200)
//   .match(/android:theme="[^"]*"/)
// const existingTheme = existingThemeMatches ? existingThemeMatches[0] : ""

// if (existingTheme) {
//   const updatedManifest =
//     manifest.slice(0, applicationTagIndex + "<application".length) +
//     manifest
//       .slice(applicationTagIndex + "<application".length)
//       .replace(existingTheme, 'android:theme="@style/BootTheme"')

//   fs.writeFileSync(manifestPath, updatedManifest, "utf-8")
// }

// Step 8: Modify MainActivity.java
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
