import "./style.css";

import project from "../game.config.json";
import { Game } from "./game/Game";

document.title = project.title;

const appElement = document.getElementById("app");
if (!appElement) {
  throw new Error("Missing #app element");
}

new Game(appElement).start();
