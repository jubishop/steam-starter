import * as THREE from "three";

import project from "../../game.config.json";
import gameData from "./data/game.json";
import {
  circlesOverlap,
  clampPosition,
  playerStartPosition,
  spawnOnArenaEdge,
  type Vec2,
} from "./core";
import { Input, type InputFrame, type PlayerControls } from "./Input";

interface WaveData {
  duration: number;
  health: number;
  spawnInterval: number;
  speed: number;
}

interface GameData {
  arena: { height: number; width: number };
  enemy: {
    contactDamage: number;
    maxEnemies: number;
    radius: number;
    score: number;
  };
  player: {
    invulnerabilitySeconds: number;
    maxHealth: number;
    radius: number;
    speed: number;
  };
  waves: WaveData[];
  weapon: {
    bulletRadius: number;
    bulletSpeed: number;
    damage: number;
    fireInterval: number;
    lifetime: number;
    maxBullets: number;
  };
}

interface PlayerEntity {
  aim: Vec2;
  fireCooldown: number;
  health: number;
  invulnerability: number;
  material: THREE.MeshStandardMaterial;
  object: THREE.Group;
  position: Vec2;
  slot: number;
  sourceId: string;
}

interface Bullet {
  color: number;
  life: number;
  position: Vec2;
  velocity: Vec2;
}

interface Enemy {
  health: number;
  position: Vec2;
  speed: number;
}

type GameState = "gameOver" | "paused" | "playing" | "title";

const config = gameData as GameData;
const FIXED_STEP = 1 / 60;
const MAX_FRAME_TIME = 0.1;
const MAX_LOCAL_PLAYERS = 4;
const PLAYER_COLORS = [0x69e6ff, 0xffc857, 0x70e38a, 0xc58cff] as const;

export class Game {
  private readonly appElement: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly input = new Input(import.meta.env.DEV);
  private readonly enemyMesh: THREE.InstancedMesh;
  private readonly bulletMesh: THREE.InstancedMesh;
  private readonly matrixHelper = new THREE.Object3D();
  private readonly colorHelper = new THREE.Color();
  private readonly enemies: Enemy[] = [];
  private readonly bullets: Bullet[] = [];
  private readonly players: PlayerEntity[] = [];
  private readonly joinedSources: string[] = [];
  private readonly playersElement: HTMLElement;
  private readonly scoreElement: HTMLElement;
  private readonly waveElement: HTMLElement;
  private readonly statusElement: HTMLElement;
  private readonly overlayElement: HTMLElement;
  private readonly overlayTitleElement: HTMLElement;
  private readonly overlayTextElement: HTMLElement;

  private state: GameState = "title";
  private score = 0;
  private waveNumber = 1;
  private waveTime = 0;
  private spawnCooldown = 0.5;
  private accumulator = 0;
  private lastFrameTime = performance.now();
  private hudCooldown = 0;
  private connectedControllerCount = -1;

  constructor(appElement: HTMLElement) {
    this.appElement = appElement;
    this.appElement.innerHTML = `
      <section class="hud" aria-live="polite">
        <span class="player-health-list" id="players"></span>
        <span id="score">SCORE 000000</span>
        <span id="wave">WAVE 1</span>
      </section>
      <p class="status" id="status"></p>
      <section class="overlay" id="overlay">
        <p class="eyebrow">JUBISHOP PRESENTS</p>
        <h1 id="overlay-title">${project.title.toUpperCase()}</h1>
        <p id="overlay-text"></p>
      </section>
    `;

    this.playersElement = this.getElement("players");
    this.scoreElement = this.getElement("score");
    this.waveElement = this.getElement("wave");
    this.statusElement = this.getElement("status");
    this.overlayElement = this.getElement("overlay");
    this.overlayTitleElement = this.getElement("overlay-title");
    this.overlayTextElement = this.getElement("overlay-text");

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.appElement.prepend(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x08090d);
    this.camera.position.set(0, 24, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);

    this.createArena();
    this.enemyMesh = this.createEnemyInstances();
    this.bulletMesh = this.createBulletInstances();

    window.addEventListener("resize", this.resize);
    this.resize();
    this.showTitle();
  }

  start(): void {
    requestAnimationFrame(this.frame);
  }

  private readonly frame = (frameTime: number): void => {
    const elapsed = Math.min((frameTime - this.lastFrameTime) / 1000, MAX_FRAME_TIME);
    this.lastFrameTime = frameTime;
    const inputFrame = this.input.read();

    if (inputFrame.connectedControllerCount !== this.connectedControllerCount) {
      this.connectedControllerCount = inputFrame.connectedControllerCount;
      this.statusElement.textContent = `${inputFrame.connectedControllerCount} OF 4 CONTROLLERS CONNECTED`;
    }
    this.handleStateInput(inputFrame);

    if (this.state === "playing") {
      this.accumulator += elapsed;
      while (this.accumulator >= FIXED_STEP) {
        this.update(FIXED_STEP, inputFrame);
        this.accumulator -= FIXED_STEP;
      }
    } else {
      this.accumulator = 0;
    }

    this.updateInstances();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.frame);
  };

  private handleStateInput(inputFrame: InputFrame): void {
    if (this.state === "title") {
      let lobbyChanged = this.removeDisconnectedLobbyPlayers(inputFrame);
      for (const controls of inputFrame.players) {
        if (controls.confirmPressed && !this.joinedSources.includes(controls.sourceId)) {
          if (this.joinedSources.length < MAX_LOCAL_PLAYERS) {
            this.joinedSources.push(controls.sourceId);
            lobbyChanged = true;
          }
        } else if (controls.backPressed) {
          const joinedIndex = this.joinedSources.indexOf(controls.sourceId);
          if (joinedIndex >= 0) {
            this.joinedSources.splice(joinedIndex, 1);
            lobbyChanged = true;
          }
        }
      }
      if (lobbyChanged) {
        this.updateLobbyOverlay();
      }

      const starter = inputFrame.players.find((controls) => controls.startPressed);
      if (starter) {
        if (
          !this.joinedSources.includes(starter.sourceId) &&
          this.joinedSources.length < MAX_LOCAL_PLAYERS
        ) {
          this.joinedSources.push(starter.sourceId);
        }
        this.startRun();
      }
      return;
    }

    if (this.state === "gameOver") {
      if (inputFrame.players.some((controls) => controls.backPressed)) {
        this.joinedSources.length = 0;
        this.showTitle();
      } else if (
        inputFrame.players.some(
          (controls) =>
            this.joinedSources.includes(controls.sourceId) &&
            (controls.confirmPressed || controls.startPressed),
        )
      ) {
        this.startRun();
      }
      return;
    }

    const startPressed = inputFrame.players.some(
      (controls) =>
        this.joinedSources.includes(controls.sourceId) && controls.startPressed,
    );
    if (startPressed && this.state === "playing") {
      this.state = "paused";
      this.showOverlay("PAUSED", "Press Start to continue");
    } else if (startPressed && this.state === "paused") {
      this.state = "playing";
      this.hideOverlay();
    }
  }

  private removeDisconnectedLobbyPlayers(inputFrame: InputFrame): boolean {
    const connectedSources = new Set(inputFrame.players.map(({ sourceId }) => sourceId));
    const previousLength = this.joinedSources.length;
    for (let index = this.joinedSources.length - 1; index >= 0; index -= 1) {
      const sourceId = this.joinedSources[index];
      if (sourceId && !connectedSources.has(sourceId)) {
        this.joinedSources.splice(index, 1);
      }
    }
    return previousLength !== this.joinedSources.length;
  }

  private startRun(): void {
    if (this.joinedSources.length === 0) {
      this.updateLobbyOverlay();
      return;
    }

    this.clearPlayerObjects();
    for (let slot = 0; slot < this.joinedSources.length; slot += 1) {
      const sourceId = this.joinedSources[slot];
      if (sourceId) {
        this.players.push(this.createPlayer(sourceId, slot, this.joinedSources.length));
      }
    }

    this.state = "playing";
    this.score = 0;
    this.waveNumber = 1;
    this.waveTime = 0;
    this.spawnCooldown = 0.5;
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.hideOverlay();
    this.updateHud(true);
  }

  private update(step: number, inputFrame: InputFrame): void {
    this.updatePlayers(step, inputFrame);
    this.updateWave(step);
    this.updateEnemies(step);
    this.updateBullets(step);
    this.resolveCollisions();

    for (const player of this.players) {
      player.invulnerability = Math.max(0, player.invulnerability - step);
    }
    this.hudCooldown -= step;
    if (this.hudCooldown <= 0) {
      this.updateHud(false);
      this.hudCooldown = 0.1;
    }
  }

  private updatePlayers(step: number, inputFrame: InputFrame): void {
    for (const player of this.players) {
      if (player.health <= 0) {
        continue;
      }
      const controls = inputFrame.players.find(
        (candidate) => candidate.sourceId === player.sourceId,
      );
      if (controls) {
        this.updatePlayerMovement(player, controls, step);
        this.updatePlayerWeapon(player, controls, step);
      } else {
        player.fireCooldown = Math.max(0, player.fireCooldown - step);
      }

      player.object.position.set(player.position.x, 0.42, player.position.y);
      player.object.rotation.y = -Math.atan2(player.aim.y, player.aim.x);
      player.material.emissive.setHex(
        player.invulnerability > 0 && Math.floor(player.invulnerability * 20) % 2 === 0
          ? 0x9a2636
          : 0x071b20,
      );
    }
  }

  private updatePlayerMovement(
    player: PlayerEntity,
    controls: PlayerControls,
    step: number,
  ): void {
    player.position.x += controls.move.x * config.player.speed * step;
    player.position.y += controls.move.y * config.player.speed * step;
    const clampedPosition = clampPosition(
      player.position,
      config.arena.width,
      config.arena.height,
      config.player.radius,
    );
    player.position.x = clampedPosition.x;
    player.position.y = clampedPosition.y;

    const aimMagnitude = Math.hypot(controls.aim.x, controls.aim.y);
    if (aimMagnitude > 0.15) {
      player.aim.x = controls.aim.x / aimMagnitude;
      player.aim.y = controls.aim.y / aimMagnitude;
    }
  }

  private updatePlayerWeapon(
    player: PlayerEntity,
    controls: PlayerControls,
    step: number,
  ): void {
    player.fireCooldown = Math.max(0, player.fireCooldown - step);
    if (
      !controls.shoot ||
      player.fireCooldown > 0 ||
      this.bullets.length >= config.weapon.maxBullets
    ) {
      return;
    }

    this.bullets.push({
      color: PLAYER_COLORS[player.slot] ?? PLAYER_COLORS[0],
      life: config.weapon.lifetime,
      position: {
        x: player.position.x + player.aim.x * 0.85,
        y: player.position.y + player.aim.y * 0.85,
      },
      velocity: {
        x: player.aim.x * config.weapon.bulletSpeed,
        y: player.aim.y * config.weapon.bulletSpeed,
      },
    });
    player.fireCooldown = config.weapon.fireInterval;
  }

  private updateWave(step: number): void {
    this.waveTime += step;
    const wave = this.currentWave();
    if (this.waveTime >= wave.duration) {
      this.waveTime -= wave.duration;
      this.waveNumber += 1;
    }

    this.spawnCooldown -= step;
    if (this.spawnCooldown <= 0 && this.enemies.length < config.enemy.maxEnemies) {
      this.spawnEnemy();
      this.spawnCooldown = this.currentWave().spawnInterval / this.difficultyMultiplier();
    }
  }

  private spawnEnemy(): void {
    const wave = this.currentWave();
    const difficulty = this.difficultyMultiplier();
    this.enemies.push({
      health: wave.health + Math.floor((difficulty - 1) * 2),
      position: spawnOnArenaEdge(
        config.arena.width,
        config.arena.height,
        Math.random(),
        Math.random(),
        1.4,
      ),
      speed: wave.speed * Math.min(difficulty, 1.8),
    });
  }

  private updateEnemies(step: number): void {
    for (const enemy of this.enemies) {
      let target: PlayerEntity | undefined;
      let targetDistanceSquared = Number.POSITIVE_INFINITY;
      for (const player of this.players) {
        if (player.health <= 0) {
          continue;
        }
        const xDistance = player.position.x - enemy.position.x;
        const yDistance = player.position.y - enemy.position.y;
        const distanceSquared = xDistance * xDistance + yDistance * yDistance;
        if (distanceSquared < targetDistanceSquared) {
          target = player;
          targetDistanceSquared = distanceSquared;
        }
      }
      if (!target) {
        continue;
      }
      const xDistance = target.position.x - enemy.position.x;
      const yDistance = target.position.y - enemy.position.y;
      const distance = Math.sqrt(targetDistanceSquared) || 1;
      enemy.position.x += (xDistance / distance) * enemy.speed * step;
      enemy.position.y += (yDistance / distance) * enemy.speed * step;
    }
  }

  private updateBullets(step: number): void {
    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = this.bullets[index];
      if (!bullet) {
        continue;
      }
      bullet.position.x += bullet.velocity.x * step;
      bullet.position.y += bullet.velocity.y * step;
      bullet.life -= step;
      if (bullet.life <= 0) {
        this.bullets.splice(index, 1);
      }
    }
  }

  private resolveCollisions(): void {
    for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = this.enemies[enemyIndex];
      if (!enemy) {
        continue;
      }

      let hitPlayer = false;
      for (const player of this.players) {
        if (
          player.health <= 0 ||
          player.invulnerability > 0 ||
          !circlesOverlap(
            player.position,
            config.player.radius,
            enemy.position,
            config.enemy.radius,
          )
        ) {
          continue;
        }

        player.health = Math.max(0, player.health - config.enemy.contactDamage);
        player.invulnerability = config.player.invulnerabilitySeconds;
        this.enemies.splice(enemyIndex, 1);
        hitPlayer = true;
        if (player.health <= 0) {
          player.object.visible = false;
        }
        if (this.players.every((candidate) => candidate.health <= 0)) {
          this.endRun();
          return;
        }
        break;
      }
      if (hitPlayer) {
        continue;
      }

      for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
        const bullet = this.bullets[bulletIndex];
        if (
          !bullet ||
          !circlesOverlap(
            bullet.position,
            config.weapon.bulletRadius,
            enemy.position,
            config.enemy.radius,
          )
        ) {
          continue;
        }

        enemy.health -= config.weapon.damage;
        this.bullets.splice(bulletIndex, 1);
        if (enemy.health <= 0) {
          this.enemies.splice(enemyIndex, 1);
          this.score += config.enemy.score * this.waveNumber;
        }
        break;
      }
    }
  }

  private endRun(): void {
    this.state = "gameOver";
    this.updateHud(true);
    this.showOverlay(
      "TEAM DOWN",
      `Score ${this.score.toLocaleString()}\nA: Replay · B: Change players`,
    );
  }

  private updateInstances(): void {
    this.enemyMesh.count = this.enemies.length;
    for (let index = 0; index < this.enemies.length; index += 1) {
      const enemy = this.enemies[index];
      if (!enemy) {
        continue;
      }
      this.matrixHelper.position.set(enemy.position.x, 0.35, enemy.position.y);
      this.matrixHelper.rotation.set(0, index * 0.37, 0);
      this.matrixHelper.scale.setScalar(1);
      this.matrixHelper.updateMatrix();
      this.enemyMesh.setMatrixAt(index, this.matrixHelper.matrix);
    }
    this.enemyMesh.instanceMatrix.needsUpdate = true;

    this.bulletMesh.count = this.bullets.length;
    for (let index = 0; index < this.bullets.length; index += 1) {
      const bullet = this.bullets[index];
      if (!bullet) {
        continue;
      }
      this.matrixHelper.position.set(bullet.position.x, 0.24, bullet.position.y);
      this.matrixHelper.rotation.set(0, 0, 0);
      this.matrixHelper.scale.setScalar(1);
      this.matrixHelper.updateMatrix();
      this.bulletMesh.setMatrixAt(index, this.matrixHelper.matrix);
      this.bulletMesh.setColorAt(index, this.colorHelper.setHex(bullet.color));
    }
    this.bulletMesh.instanceMatrix.needsUpdate = true;
    if (this.bulletMesh.instanceColor) {
      this.bulletMesh.instanceColor.needsUpdate = true;
    }
  }

  private currentWave(): WaveData {
    const wave = config.waves[Math.min(this.waveNumber - 1, config.waves.length - 1)];
    if (!wave) {
      throw new Error("At least one wave must be defined in src/game/data/game.json");
    }
    return wave;
  }

  private difficultyMultiplier(): number {
    return 1 + Math.max(0, this.waveNumber - config.waves.length) * 0.12;
  }

  private updateHud(force: boolean): void {
    if (!force && this.state !== "playing") {
      return;
    }
    this.playersElement.innerHTML = this.players
      .map((player) => {
        const color = `#${(PLAYER_COLORS[player.slot] ?? PLAYER_COLORS[0]).toString(16).padStart(6, "0")}`;
        const health = player.health > 0 ? player.health : "DOWN";
        return `<span style="color:${color}">P${player.slot + 1} ${health}</span>`;
      })
      .join("");
    this.scoreElement.textContent = `SCORE ${this.score.toString().padStart(6, "0")}`;
    this.waveElement.textContent = `WAVE ${this.waveNumber}`;
  }

  private showTitle(): void {
    this.state = "title";
    this.clearPlayerObjects();
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.playersElement.textContent = "";
    this.scoreElement.textContent = "SCORE 000000";
    this.waveElement.textContent = "WAVE 1";
    this.updateLobbyOverlay();
  }

  private updateLobbyOverlay(): void {
    const joined = Array.from(
      { length: MAX_LOCAL_PLAYERS },
      (_, slot) => `P${slot + 1} ${slot < this.joinedSources.length ? "READY" : "—"}`,
    ).join("   ");
    this.showOverlay(
      project.title.toUpperCase(),
      `A: Join · B: Leave\n${joined}\nStart: Begin with 1–4 players`,
    );
  }

  private showOverlay(title: string, text: string): void {
    this.overlayTitleElement.textContent = title;
    this.overlayTextElement.textContent = text;
    this.overlayElement.classList.remove("hidden");
  }

  private hideOverlay(): void {
    this.overlayElement.classList.add("hidden");
  }

  private createArena(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(config.arena.width, config.arena.height),
      new THREE.MeshStandardMaterial({
        color: 0x181b22,
        metalness: 0.15,
        roughness: 0.92,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(config.arena.width, 0.2, config.arena.height),
      ),
      new THREE.LineBasicMaterial({ color: 0x6e1724 }),
    );
    border.position.y = 0.02;
    this.scene.add(border);

    const grid = new THREE.GridHelper(config.arena.width, 40, 0x39131a, 0x24262e);
    grid.position.y = 0.015;
    grid.scale.z = config.arena.height / config.arena.width;
    this.scene.add(grid);

    this.scene.add(new THREE.HemisphereLight(0xb9d9ff, 0x4a0712, 2.3));
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(-8, 18, -6);
    this.scene.add(light);
  }

  private createPlayer(
    sourceId: string,
    slot: number,
    playerCount: number,
  ): PlayerEntity {
    const color = PLAYER_COLORS[slot] ?? PLAYER_COLORS[0];
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: 0x071b20,
      roughness: 0.45,
    });
    const object = new THREE.Group();
    object.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(config.player.radius, config.player.radius, 0.6, 12),
        material,
      ),
    );
    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xf2f7fa, emissive: 0x25292c }),
    );
    barrel.position.set(0.72, 0.1, 0);
    object.add(barrel);

    const position = playerStartPosition(slot, playerCount, 2.4);
    object.position.set(position.x, 0.42, position.y);
    this.scene.add(object);
    return {
      aim: { x: 1, y: 0 },
      fireCooldown: 0,
      health: config.player.maxHealth,
      invulnerability: 0,
      material,
      object,
      position,
      slot,
      sourceId,
    };
  }

  private clearPlayerObjects(): void {
    for (const player of this.players) {
      this.scene.remove(player.object);
      player.object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) {
          return;
        }
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          for (const material of child.material) {
            material.dispose();
          }
        } else {
          child.material.dispose();
        }
      });
    }
    this.players.length = 0;
  }

  private createEnemyInstances(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(config.enemy.radius, config.enemy.radius * 0.82, 0.7, 9),
      new THREE.MeshStandardMaterial({
        color: 0xbd263d,
        emissive: 0x35070e,
        roughness: 0.55,
      }),
      config.enemy.maxEnemies,
    );
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    return mesh;
  }

  private createBulletInstances(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(config.weapon.bulletRadius, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      config.weapon.maxBullets,
    );
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    return mesh;
  }

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / Math.max(height, 1);
    const viewHeight = Math.max(
      config.arena.height + 2,
      (config.arena.width + 2) / aspect,
    );
    const viewWidth = viewHeight * aspect;

    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.near = 0.1;
    this.camera.far = 100;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing required element #${id}`);
    }
    return element;
  }
}
