import "./styles.css";
import { Engine, Scene } from "@babylonjs/core";
import { initGameScene } from "./game";

let ws: WebSocket | null = null;

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const menu = document.getElementById("menuOverlay") as HTMLDivElement;
  const scoreHud = document.getElementById("scoreHud") as HTMLDivElement;

  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  const gameObjects = initGameScene(scene, canvas);

  // connect using current host so nginx proxy works
  const proto = location.protocol === "https:" ? "wss:" : "ws:";

  function initWebsocket()
  {
    ws = new WebSocket(`${proto}//${location.host}/ws`);

    ws.onopen = () => console.log("WS connected");
    ws.onerror = (e) => console.error("WS error", e);

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        console.log("WS message", data);
        if (data.type === "state") {
          const { ball, paddles, score } = data;
          gameObjects.ball.position.x = ball.x;
          gameObjects.ball.position.y = ball.y;
          gameObjects.paddleLeft.position.y = paddles.left;
          gameObjects.paddleRight.position.y = paddles.right;
          (document.getElementById("scoreP1") as HTMLElement).textContent = String(score.p1);
          (document.getElementById("scoreP2") as HTMLElement).textContent = String(score.p2);
        }
        if (data.type === "assign") {
          console.log("role:", data.role);
        }
        if (data.type === "gameOver") {
          alert(`${data.winner} wins!`);
          location.reload();
        }
      } catch (e) {}
    };

    // input sending: use mouse or touch to set paddle y for your role
    function sendPaddle(yNorm: number) {
      ws?.send(JSON.stringify({ type: "paddleMove", y: yNorm }));
    }

    // mouse/touch
    window.addEventListener("pointermove", (e) => {
      const normalized = 1 - (e.clientY / window.innerHeight); // 0..1
      const mapped = (normalized - 0.5) * 2; // -1..1
      sendPaddle(mapped);
    });

    // keyboard for convenience
    const keys: Record<string, boolean> = {};
    window.addEventListener("keydown", (e) => keys[e.key] = true);
    window.addEventListener("keyup", (e) => keys[e.key] = false);
    setInterval(() => {
      // keyboard controlling: W/S -> -1..1 mapping
      if (keys['w'] || keys['s']) {
        let y = 0;
        if (keys['w']) y = 1;
        if (keys['s']) y = -1;
        sendPaddle(y);
      }
    }, 1000 / 15);
  }

  function initOfflineGame(scene: Scene, gameObjects: { paddleLeft: any; paddleRight: any; ball: any; }) {
    let ballVX = 0.1;
    let ballVY = 0.1;
    
    const keys: Record<string, boolean> = {};
    window.addEventListener("keydown", (e) => keys[e.key] = true);
    window.addEventListener("keyup", (e) => keys[e.key] = false);
    setInterval(() => {
      // keyboard controlling: W/S -> -1..1 mapping
      if (keys['w'] || keys['s']) {
        let y = 0;
        if (keys['w']) y = 0.8;
        if (keys['s']) y = -0.8;
        gameObjects.paddleLeft.position.y += y;
        console.log(gameObjects.paddleLeft.position.y);
      }
      if (keys['ArrowUp'] || keys['ArrowDown']) {
        let y = 0;
        if (keys['ArrowUp']) y = 0.8;
        if (keys['ArrowDown']) y = -0.8;
        gameObjects.paddleRight.position.y += y;
        console.log(gameObjects.paddleRight.position.y);
      }
    }, 1000 / 15);
  
    scene.onBeforeRenderObservable.add(() => {
      // move ball
      gameObjects.ball.position.x += ballVX;
      gameObjects.ball.position.y += ballVY;


      // simple wall collision
      if (gameObjects.ball.position.y > 5 || gameObjects.ball.position.y < -5) {
        ballVY = -ballVY;
      }

      // simple paddle collision
      if (gameObjects.ball.position.x < gameObjects.paddleLeft.position.x + 0.25 &&
          gameObjects.ball.position.x > gameObjects.paddleLeft.position.x &&
          Math.abs(gameObjects.ball.position.y - gameObjects.paddleLeft.position.y) < 0.75) {
        ballVX = -ballVX;
      }
      if (gameObjects.ball.position.x > gameObjects.paddleRight.position.x - 0.25 &&
          gameObjects.ball.position.x < gameObjects.paddleRight.position.x &&
          Math.abs(gameObjects.ball.position.y - gameObjects.paddleRight.position.y) < 0.75) {
        ballVX = -ballVX;
      }

      // reset if out of bounds
      if (gameObjects.ball.position.x < -6 || gameObjects.ball.position.x > 6) {
        gameObjects.ball.position.x = 0;
        gameObjects.ball.position.y = 0;
      }

      // simple AI for right paddle
      // gameObjects.paddleRight.position.y += (gameObjects.ball.position.y - gameObjects.paddleRight.position.y) * 0.3;
    });
  }

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  // UI buttons
  document.getElementById("start1v1")!.addEventListener("click", () => startMode("1v1"));
  document.getElementById("startTournament")!.addEventListener("click", () => startMode("tournament"));
  document.getElementById("start1v1_local")!.addEventListener("click", () => startMode("1v1_local"));

  function startMode(mode: string) {
    if (mode == "1v1") 
    {
      initWebsocket();
      ws?.send(JSON.stringify({ type: "selectMode", mode }));
    }
    else if (mode == "1v1_local")
    {
      initOfflineGame(scene, gameObjects);
    }
      // hide menu
    menu.classList.add("opacity-0", "pointer-events-none");
    setTimeout(() => {
      menu.style.display = "none";
      scoreHud.classList.remove("hidden");
    }, 260);
  }
});
