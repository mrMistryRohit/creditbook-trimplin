# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

Build the APK:

```
 eas build:configure
```

then (for android apk)

```
eas build --platform android --profile preview
```

# Directory Tree

```
creditbook-trimplin
├─ 📁.expo
├─ 📁.vscode
│  ├─ 📁.react
│  ├─ 📄extensions.json
│  └─ 📄settings.json
├─ 📁android
│  ├─ 📁.gradle
│  │  ├─ 📁8.14.3
│  │  │  ├─ 📁checksums
│  │  │  │  └─ 📄checksums.lock
│  │  │  ├─ 📁expanded
│  │  │  ├─ 📁fileChanges
│  │  │  │  └─ 📄last-build.bin
│  │  │  ├─ 📁fileHashes
│  │  │  │  ├─ 📄fileHashes.bin
│  │  │  │  ├─ 📄fileHashes.lock
│  │  │  │  └─ 📄resourceHashesCache.bin
│  │  │  ├─ 📁vcsMetadata
│  │  │  └─ 📄gc.properties
│  │  ├─ 📁buildOutputCleanup
│  │  │  ├─ 📄buildOutputCleanup.lock
│  │  │  └─ 📄cache.properties
│  │  ├─ 📁noVersion
│  │  │  └─ 📄buildLogic.lock
│  │  └─ 📁vcs-1
│  │     └─ 📄gc.properties
│  ├─ 📁app
│  │  ├─ 📁src
│  │  │  ├─ 📁debug
│  │  │  │  └─ 📄AndroidManifest.xml
│  │  │  ├─ 📁debugOptimized
│  │  │  │  └─ 📄AndroidManifest.xml
│  │  │  └─ 📁main
│  │  │     ├─ 📁java
│  │  │     │  └─ 📁com
│  │  │     │     └─ 📁rohit002002
│  │  │     │        └─ 📁creditbooktrimplin
│  │  │     │           ├─ 📄MainActivity.kt
│  │  │     │           └─ 📄MainApplication.kt
│  │  │     ├─ 📁res
│  │  │     │  ├─ 📁drawable
│  │  │     │  │  ├─ 📄ic_launcher_background.xml
│  │  │     │  │  └─ 📄rn_edit_text_material.xml
│  │  │     │  ├─ 📁drawable-hdpi
│  │  │     │  │  └─ 📄splashscreen_logo.png
│  │  │     │  ├─ 📁drawable-mdpi
│  │  │     │  │  └─ 📄splashscreen_logo.png
│  │  │     │  ├─ 📁drawable-xhdpi
│  │  │     │  │  └─ 📄splashscreen_logo.png
│  │  │     │  ├─ 📁drawable-xxhdpi
│  │  │     │  │  └─ 📄splashscreen_logo.png
│  │  │     │  ├─ 📁drawable-xxxhdpi
│  │  │     │  │  └─ 📄splashscreen_logo.png
│  │  │     │  ├─ 📁mipmap-anydpi-v26
│  │  │     │  │  ├─ 📄ic_launcher.xml
│  │  │     │  │  └─ 📄ic_launcher_round.xml
│  │  │     │  ├─ 📁mipmap-hdpi
│  │  │     │  │  ├─ 📄ic_launcher.webp
│  │  │     │  │  ├─ 📄ic_launcher_background.webp
│  │  │     │  │  ├─ 📄ic_launcher_foreground.webp
│  │  │     │  │  ├─ 📄ic_launcher_monochrome.webp
│  │  │     │  │  └─ 📄ic_launcher_round.webp
│  │  │     │  ├─ 📁mipmap-mdpi
│  │  │     │  │  ├─ 📄ic_launcher.webp
│  │  │     │  │  ├─ 📄ic_launcher_background.webp
│  │  │     │  │  ├─ 📄ic_launcher_foreground.webp
│  │  │     │  │  ├─ 📄ic_launcher_monochrome.webp
│  │  │     │  │  └─ 📄ic_launcher_round.webp
│  │  │     │  ├─ 📁mipmap-xhdpi
│  │  │     │  │  ├─ 📄ic_launcher.webp
│  │  │     │  │  ├─ 📄ic_launcher_background.webp
│  │  │     │  │  ├─ 📄ic_launcher_foreground.webp
│  │  │     │  │  ├─ 📄ic_launcher_monochrome.webp
│  │  │     │  │  └─ 📄ic_launcher_round.webp
│  │  │     │  ├─ 📁mipmap-xxhdpi
│  │  │     │  │  ├─ 📄ic_launcher.webp
│  │  │     │  │  ├─ 📄ic_launcher_background.webp
│  │  │     │  │  ├─ 📄ic_launcher_foreground.webp
│  │  │     │  │  ├─ 📄ic_launcher_monochrome.webp
│  │  │     │  │  └─ 📄ic_launcher_round.webp
│  │  │     │  ├─ 📁mipmap-xxxhdpi
│  │  │     │  │  ├─ 📄ic_launcher.webp
│  │  │     │  │  ├─ 📄ic_launcher_background.webp
│  │  │     │  │  ├─ 📄ic_launcher_foreground.webp
│  │  │     │  │  ├─ 📄ic_launcher_monochrome.webp
│  │  │     │  │  └─ 📄ic_launcher_round.webp
│  │  │     │  ├─ 📁values
│  │  │     │  │  ├─ 📄colors.xml
│  │  │     │  │  ├─ 📄strings.xml
│  │  │     │  │  └─ 📄styles.xml
│  │  │     │  └─ 📁values-night
│  │  │     │     └─ 📄colors.xml
│  │  │     └─ 📄AndroidManifest.xml
│  │  ├─ 📄build.gradle
│  │  ├─ 📄debug.keystore
│  │  ├─ 📄google-services.json
│  │  └─ 📄proguard-rules.pro
│  ├─ 📁build
│  │  ├─ 📁generated
│  │  │  └─ 📁autolinking
│  │  │     ├─ 📄autolinking.json
│  │  │     ├─ 📄package-lock.json.sha
│  │  │     └─ 📄package.json.sha
│  │  └─ 📁reports
│  │     └─ 📁problems
│  │        └─ 📄problems-report.html
│  ├─ 📁gradle
│  │  └─ 📁wrapper
│  │     ├─ 📄gradle-wrapper.jar
│  │     └─ 📄gradle-wrapper.properties
│  ├─ 📄.gitignore
│  ├─ 📄build.gradle
│  ├─ 📄gradle.properties
│  ├─ 📄gradlew
│  ├─ 📄gradlew.bat
│  └─ 📄settings.gradle
├─ 📁app
│  ├─ 📁(auth)
│  │  ├─ 📄login.tsx
│  │  ├─ 📄register.tsx
│  │  └─ 📄_layout.tsx
│  ├─ 📁(tabs)
│  │  ├─ 📄index.tsx
│  │  ├─ 📄ledger.tsx
│  │  ├─ 📄reports.tsx
│  │  └─ 📄_layout.tsx
│  ├─ 📄add-bill-item.tsx
│  ├─ 📄add-stock-item.tsx
│  ├─ 📄archived-customers.tsx
│  ├─ 📄archived-suppliers.tsx
│  ├─ 📄bill-detail.tsx
│  ├─ 📄create-bill.tsx
│  ├─ 📄customer-detail.tsx
│  ├─ 📄modal.tsx
│  ├─ 📄settings.tsx
│  ├─ 📄stock-item-detail.tsx
│  ├─ 📄stock.tsx
│  ├─ 📄supplier-detail.tsx
│  └─ 📄_layout.tsx
├─ 📁assets
│  └─ 📁images
│     ├─ 📄android-icon-background.png
│     ├─ 📄android-icon-foreground.png
│     ├─ 📄android-icon-monochrome.png
│     ├─ 📄favicon.png
│     ├─ 📄icon.png
│     ├─ 📄partial-react-logo.png
│     ├─ 📄react-logo.png
│     ├─ 📄react-logo@2x.png
│     ├─ 📄react-logo@3x.png
│     └─ 📄splash-icon.png
├─ 📁components
│  ├─ 📁ui
│  │  ├─ 📄collapsible.tsx
│  │  ├─ 📄icon-symbol.ios.tsx
│  │  └─ 📄icon-symbol.tsx
│  ├─ 📄external-link.tsx
│  ├─ 📄haptic-tab.tsx
│  ├─ 📄hello-wave.tsx
│  ├─ 📄parallax-scroll-view.tsx
│  ├─ 📄themed-text.tsx
│  └─ 📄themed-view.tsx
├─ 📁constants
│  └─ 📄theme.ts
├─ 📁hooks
│  ├─ 📄use-color-scheme.ts
│  ├─ 📄use-color-scheme.web.ts
│  └─ 📄use-theme-color.ts
├─ 📁node_modules
├─ 📁scripts
│  └─ 📄reset-project.js
├─ 📁src
│  ├─ 📁components
│  │  ├─ 📄AppHeader.tsx
│  │  ├─ 📄Card.tsx
│  │  ├─ 📄PrimaryButton.tsx
│  │  └─ 📄Screen.tsx
│  ├─ 📁config
│  │  └─ 📄firebase.ts
│  ├─ 📁context
│  │  ├─ 📄AuthContext.tsx
│  │  ├─ 📄BillContext.tsx
│  │  └─ 📄BusinessContext.tsx
│  ├─ 📁database
│  │  ├─ 📄billRepo.ts
│  │  ├─ 📄businessRepo.ts
│  │  ├─ 📄customerRepo.ts
│  │  ├─ 📄db.ts
│  │  ├─ 📄inventoryRepo.ts
│  │  ├─ 📄reportsRepo.ts
│  │  ├─ 📄supplierRepo.ts
│  │  ├─ 📄supplierTransactionRepo.ts
│  │  ├─ 📄transactionRepo.ts
│  │  └─ 📄userRepo.ts
│  ├─ 📁screens
│  │  ├─ 📄AddBillItemScreen.tsx
│  │  ├─ 📄AddStockItemScreen.tsx
│  │  ├─ 📄ArchivedCustomersScreen.tsx
│  │  ├─ 📄ArchivedSuppliersScreen.tsx
│  │  ├─ 📄BillDetailScreen.tsx
│  │  ├─ 📄CreateBillScreen.tsx
│  │  ├─ 📄CustomerDetailScreen.tsx
│  │  ├─ 📄HomeScreen.tsx
│  │  ├─ 📄LedgerScreen.tsx
│  │  ├─ 📄ReportsScreen.tsx
│  │  ├─ 📄SettingsScreen.tsx
│  │  ├─ 📄StockItemDetailScreen.tsx
│  │  ├─ 📄StockScreen.tsx
│  │  └─ 📄SupplierDetailScreen.tsx
│  ├─ 📁services
│  │  └─ 📄SyncService.ts
│  ├─ 📁types
│  └─ 📁utils
│     ├─ 📄events.ts
│     └─ 📄imageHelper.ts
├─ 📄.gitignore
├─ 📄app.json
├─ 📄babel.config.js
├─ 📄eas.json
├─ 📄eslint.config.js
├─ 📄google-services.json
├─ 📄package-lock.json
├─ 📄package.json
├─ 📄README.md
└─ 📄tsconfig.json
```

---

# END
