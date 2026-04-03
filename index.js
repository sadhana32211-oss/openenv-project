const express = require('express');
const app = express();
const port = process.env.PORT || 7860;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ============================================
// GRIDWORLD ENVIRONMENT CLASS
// ============================================

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

    this._initializeGrid();
  }

  _initializeGrid() {
    this.grid = [];

    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = 'empty';
      }
    }

    this.grid[0][0] = 'agent';
    this.grid[this.goalPos.y][this.goalPos.x] = 'goal';
  }

  reset() {
    this.agentPos = { x: 0, y: 0 };
    this.steps = 0;
    this.totalReward = 0;
    this.done = false;
    this._initializeGrid();

    return this.getState();
  }

  step(action) {
    if (this.done) {
      return { state: this.getState(), reward: 0, done: true };
    }

    const dx = [0, 1, 0, -1];
    const dy = [1, 0, -1, 0];

    const newX = this.agentPos.x + dx[action];
    const newY = this.agentPos.y + dy[action];

    let reward = -0.01;

    if (
      newX >= 0 && newX < this.gridSize &&
      newY >= 0 && newY < this.gridSize
    ) {
      this.grid[this.agentPos.y][this.agentPos.x] = 'empty';
      this.agentPos = { x: newX, y: newY };

      if (newX === this.goalPos.x && newY === this.goalPos.y) {
        reward = 10;
        this.done = true;
      }

      this.grid[newY][newX] = 'agent';
    }

    this.steps++;

    return {
      state: this.getState(),
      reward: reward,
      done: this.done
    };
  }

  getState() {
    return {
      agent_position: this.agentPos,
      goal_position: this.goalPos,
      grid: this.grid,
      steps: this.steps,
      done: this.done
    };
  }

  getInfo() {
    return {
      name: 'GridWorld-v0',
      grid_size: this.gridSize
    };
  }
}

// ============================================
// ENVIRONMENT MANAGER
// ============================================

class EnvironmentManager {
  constructor() {
    this.env = new GridWorldEnv();
  }

  getEnv() {
    return this.env;
  }
}

const manager = new EnvironmentManager();

// ============================================
// API ROUTES
// ============================================

// Home
app.get('/', (req, res) => {
  res.send("OpenEnv Running ✅");
});

// Info
app.get('/api/env/info', (req, res) => {
  res.json(manager.getEnv().getInfo());
});

// State
app.get('/api/state', (req, res) => {
  res.json(manager.getEnv().getState());
});

// RESET (IMPORTANT FIX)
app.post('/api/reset', (req, res) => {
  const state = manager.getEnv().reset();
  res.json({ state });
});

// STEP
app.post('/api/step', (req, res) => {
  const action = parseInt(req.body.action);
  const result = manager.getEnv().step(action);
  res.json(result);
});

// ============================================
// START SERVER
// ============================================

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
