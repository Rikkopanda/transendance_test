import './styles.css';
import { Engine, Scene } from '@babylonjs/core';
import { createGame } from './game';


document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  createGame(scene, canvas);

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener('resize', () => {
    engine.resize();
  });
});