const game = require("./game.config.json");
const electronDist = process.env.STEAM_GAME_ELECTRON_DIST;

module.exports = {
  appId: game.appId,
  productName: game.title,
  ...(electronDist ? { electronDist } : {}),
  extraMetadata: {
    desktopName: `${game.appId}.desktop`,
  },
  asar: true,
  directories: {
    output: "release",
  },
  files: ["dist/**/*", "electron/**/*", "game.config.json", "package.json"],
  toolsets: {
    appimage: "1.0.3",
  },
  linux: {
    category: "Game",
    executableName: game.slug,
    icon: "assets/icon.png",
    syncDesktopName: true,
    target: ["dir"],
  },
};
