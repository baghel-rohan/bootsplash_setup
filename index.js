const fs = require('fs')
const { execSync } = require('child_process')
const path = require('path')

const bootsplashPackage = 'react-native-bootsplash'
const bootsplashVersion = '4.7.5'

// Step 1: Check if react-native-bootsplash is installed
const packageJsonPath = '../package.json'
const packageJson = require(packageJsonPath)

if (!packageJson.dependencies || !packageJson.dependencies[bootsplashPackage]) {
  // Step 2: Install react-native-bootsplash
  const lockFile = fs.existsSync('../yarn.lock') ? 'yarn.lock' : 'package-lock.json'
  const installCommand = fs.existsSync('../yarn.lock') ? 'yarn add' : 'npm install'

  try {
    execSync(`${installCommand} ${bootsplashPackage}@${bootsplashVersion}`, { stdio: 'inherit' })
  } catch (error) {
    console.error('Failed to install react-native-bootsplash. Exiting script.')
    process.exit(1)
  }
}

// Step 3: Wait for package installation

// Step 4: Run react-native generate-bootsplash script for each flavor
const buildGradlePath = '../android/app/build.gradle'
const buildGradle = fs.readFileSync(buildGradlePath, 'utf-8')

const flavorMatches = buildGradle.match(/productFlavors\s*{([\s\S]*?)}/)
const flavors = flavorMatches ? flavorMatches[1].match(/\w+/g) : ['main']

flavors.forEach((flavor) => {
  // Check if the corresponding PNG file exists
  const pngPath = `./assets/${flavor}.png`

  if (fs.existsSync(pngPath)) {
    const backgroundColor = '#FFFFFF' // Replace with user input
    const command = `yarn react-native generate-bootsplash ./assets/${flavor}.png --platforms=android --flavor=${flavor} --logo-width=192 --background-color=${backgroundColor}`

    try {
      execSync(command, { stdio: 'inherit' })
    } catch (error) {
      console.error(`Failed to run ${command}. Exiting script.`)
      process.exit(1)
    }
  }
})

// Step 5: Add implementation("androidx.core:core-splashscreen:1.0.0") to dependencies in build.gradle
const coreSplashscreenDependency = 'implementation("androidx.core:core-splashscreen:1.0.0")'
const dependenciesIndex = buildGradle.lastIndexOf('dependencies')
if (dependenciesIndex !== -1) {
  const updatedBuildGradle =
    buildGradle.slice(0, dependenciesIndex + 'dependencies'.length) +
    `\n    ${coreSplashscreenDependency}` +
    buildGradle.slice(dependenciesIndex + 'dependencies'.length)

  fs.writeFileSync(buildGradlePath, updatedBuildGradle, 'utf-8')
}

// Step 6: Add style tag to styles.xml
const stylesXmlPath = '../android/app/src/main/res/values/styles.xml'
const stylesXml = fs.readFileSync(stylesXmlPath, 'utf-8')
const bootThemeStyle = `<style name="BootTheme" parent="Theme.SplashScreen">\n\t\t<item name="windowSplashScreenBackground">@color/bootsplash_background</item>\n\t\t<item name="windowSplashScreenAnimatedIcon">@mipmap/bootsplash_logo</item>\n\t\t<item name="postSplashScreenTheme">@style/AppTheme</item>\n\t</style>`

if (!stylesXml.includes(bootThemeStyle)) {
  const resourcesTagIndex = stylesXml.indexOf('<resources>')
  const updatedStylesXml =
    stylesXml.slice(0, resourcesTagIndex + '<resources>'.length) +
    `\n    ${bootThemeStyle}\n` +
    stylesXml.slice(resourcesTagIndex + '<resources>'.length)

  fs.writeFileSync(stylesXmlPath, updatedStylesXml, 'utf-8')
}

// Step 7: Add android:theme="@style/BootTheme" to AndroidManifest.xml
const manifestPath = '../android/app/src/main/AndroidManifest.xml'
const manifest = fs.readFileSync(manifestPath, 'utf-8')

const packagePathMatches = manifest.match(/package="(.+?)"/)
const packagePath = packagePathMatches ? packagePathMatches[1].replace(/\./g, '/') : ''

const applicationTagIndex = manifest.indexOf('<application')
const existingThemeMatches = manifest
  .slice(applicationTagIndex, applicationTagIndex + 200)
  .match(/android:theme="[^"]*"/)
const existingTheme = existingThemeMatches ? existingThemeMatches[0] : ''

if (existingTheme) {
  const updatedManifest =
    manifest.slice(0, applicationTagIndex + '<application'.length) +
    manifest
      .slice(applicationTagIndex + '<application'.length)
      .replace(existingTheme, 'android:theme="@style/BootTheme"')

  fs.writeFileSync(manifestPath, updatedManifest, 'utf-8')
}

// Step 8: Modify MainActivity.java
const mainActivityPath = `../android/app/src/main/java/${packagePath}/MainActivity.java`
const mainActivity = fs.readFileSync(mainActivityPath, 'utf-8')

if (!mainActivity.includes('RNBootSplash.init(this);')) {
  const importStatement = 'import android.os.Bundle;\nimport com.zoontek.rnbootsplash.RNBootSplash;'
  const onCreateMethod = `\t@Override\n\tprotected void onCreate(Bundle savedInstanceState) {\n\t\tRNBootSplash.init(this);\n\t\tsuper.onCreate(savedInstanceState);\n\t}`

  const updatedMainActivity =
    importStatement +
    '\n\n' +
    mainActivity.replace(/public class MainActivity.*{/, `public class MainActivity {\n${onCreateMethod}`)

  fs.writeFileSync(mainActivityPath, updatedMainActivity, 'utf-8')
}

console.log('Setup completed successfully!')
