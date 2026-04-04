const express = require('express');
const app = express();
const port = process.env.PORT || 7860;

app.use(express.json());
app.use(express.static('public'));

// ================= ENV =================
class GridWorldEnv {
  constructor(gridSize = 5, envId = 'default') {
    this.envId = envId;
    this.gridSize = gridSize;
    this.maxSteps = gridSize * gridSize * 4;

    this.rewards = {
      goal: 10,
      obstacle: -0.5,
      pit: -1,
      boundary: -0.1,
      step: -0.01
    };

    this.agentPos = { x: 0, y: 0 };
    this.goalPos = { x: gridSize - 1, y: gridSize - 1 };
    this.grid = [];
    this.steps = 0;
    this.totalReward = 0;
    this.done = false;

    this._init();
  }

  _init() {
    this.grid = [];

    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = 'empty';
      }
    }

    this.grid[0][0] = 'agent';
    this.grid[this.gridSize - 1][this.gridSize - 1] = 'goal';

    // obstacles + pits
    this.grid[1][2] = 'obstacle';
    this.grid[2][2] = 'obstacle';
    this.grid[3][2] = 'obstacle';
    this.grid[2][1] = 'pit';
    this.grid[2][3] = 'pit';
  }

  reset() {
    this.steps = 0;
    this.totalReward = 0;
    this.done = false;
    this.agentPos = { x: 0, y: 0 };
    this._init();
    return this.getState();
  }

  step(action) {
    const dx = [0, 1, 0, -1];
    const dy = [1, 0, -1, 0];

    let newX = this.agentPos.x + dx[action];
    let newY = this.agentPos.y + dy[action];

    let reward = -0.01;

    if (newX < 0 || newY < 0 || newX >= this.gridSize || newY >= this.gridSize) {
      reward = -0.1;
    } else {
      let cell = this.grid[newY][newX];

      if (cell === 'obstacle') reward = -0.5;
      else if (cell === 'pit') {
        reward = -1;
        this.done = true;
      } else if (cell === 'goal') {
        reward = 10;
        this.done = true;
      } else {
        this.grid[this.agentPos.y][this.agentPos.x] = 'empty';
        this.agentPos = { x: newX, y: newY };
        this.grid[newY][newX] = 'agent';
      }
    }

    this.steps++;
    this.totalReward += reward;

    return {
      state: this.getState(),
      reward,
      done: this.done,
      info: {}
    };
  }

  getState() {
    return {
      agent_position: this.agentPos,
      grid: this.grid,
      steps: this.steps,
      done: this.done,
      total_reward: this.totalReward
    };
  }

  getInfo() {
    return {
      name: "GridWorld-v0",
      grid_size: this.gridSize
    };
  }
}

// ============ MANAGER ============
const envManager = new Map();

function getEnv(id = "default") {
  if (!envManager.has(id)) {
    envManager.set(id, new GridWorldEnv());
  }
  return envManager.get(id);
}

// ============ ROUTES ============

// ✅ REQUIRED FIX
app.post('/api/reset', (req, res) => {
  const env = getEnv();
  const state = env.reset();

  res.json({
    env_id: "default",
    state,
    info: env.getInfo()
  });
});

// step
app.post('/api/step', (req, res) => {
  const action = parseInt(req.body.action);
  const env = getEnv();

  const result = env.step(action);

  res.json({
    env_id: "default",
    ...result
  });
});

// state
app.get('/api/state', (req, res) => {
  const env = getEnv();

  res.json({
    env_id: "default",
    state: env.getState(),
    info: env.getInfo()
  });
});

// start
app.listen(port, '0.0.0.0', () => {
  console.log("Server running on port " + port);
});