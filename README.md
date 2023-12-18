# React Native Boot-splash Setup

---

## What Script will provide

- It will add and generate images for the multiple flavours of you android project

## Basic Setup

- Add react-native-bootsplash@4.7.5 package in your project.
- Assets for the splash screen, provide the images for all the flavours you want to create splash screen for in format.
- The images have to be added in projectRoot/assets/{flavourName}.png (Name of the image has to be same as product dimension's or name of the folder in android/app/src)
- You should check for all options of script by using -h flag before running the script.

## Run the script

- After the above setup `npm link` inside bootsplash_script project, and then run the `setup_bootsplash` in root of project (arguments if needed, preferred default arguments).

### iOS

- Setup storyboard of the flavour however you want.

- Edit the `ios/YourProjectName/AppDelegate.m(m)` file:

```obj-c
#import "AppDelegate.h"
#import "RNBootSplash.h" // <- add the header import

// …

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // …

  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

  // from here
  NSString *plistPath = [[NSBundle mainBundle] pathForResource:@"Info" ofType:@"plist"];

  NSDictionary *infoDict = [NSDictionary dictionaryWithContentsOfFile:plistPath];

  NSString *flavorStoryboardName = infoDict[@"UILaunchStoryboardName"];

  UIView *rootView = [super createRootViewWithBridge:bridge
                                            moduleName:@"theftpatrol"
                                             initProps:nil]; // <- Add only if rootView is not already present in the method
  [RNBootSplash initWithStoryboard:flavorStoryboardName rootView:rootView]; // <- initialization using the storyboard file name

  return YES;
}
```

### Android

_⚠️ On Android >= 12, the splash screen will not appear if you start your app from the terminal / Android Studio. To see it, kill your app and restart it in normal conditions (tap on your app icon in the app launcher)._

---

1. As this library only support Android 6+, you probably have to edit your `android/build.gradle` file:

```gradle
buildscript {
  ext {
    buildToolsVersion = "31.0.0"
    minSdkVersion = 23 // <- AndroidX splashscreen has basic support for 21 (only the background color), so 23 is best
    compileSdkVersion = 31 // <- set at least 31
    targetSdkVersion = 31 // <- set at least 31

    // …
```

2. Then edit your `android/app/build.gradle` file:

```gradle
dependencies {
  // …

  implementation "androidx.swiperefreshlayout:swiperefreshlayout:1.0.0"
  implementation "androidx.core:core-splashscreen:1.0.0" // Add this line

  // …
```

3. If the following wasn't added automatically after running the project please add manually :satisfied:, Edit your `android/app/src/main/res/values/styles.xml` file:

```xml
<resources>

  <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
      <!-- Your base theme customization -->
  </style>

  <!-- BootTheme should inherit from Theme.SplashScreen -->
  <style name="BootTheme" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">@color/bootsplash_background</item>
    <item name="windowSplashScreenAnimatedIcon">@mipmap/bootsplash_logo</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
  </style>

</resources>
```

#### Usage

```jsx
import RNBootSplash from "react-native-bootsplash"

RNBootSplash.hide() // immediate
RNBootSplash.hide({ fade: true }) // fade with 220ms default duration
RNBootSplash.hide({ fade: true, duration: 500 }) // fade with custom duration
```
