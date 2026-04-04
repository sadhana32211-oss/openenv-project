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
    this.obstacles = [];
    this.pits = [];
    this.grid = [];
    this.steps = 0;
    this.totalReward = 0;
    this.done = false;

    this._initializeGrid();
  }

  _initializeGrid() {
    this.grid = [];
    this.obstacles = [];
    this.pits = [];

    // Initialize empty grid
    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = 'empty';
      }
    }

    // Place agent at start
    this.agentPos = { x: 0, y: 0 };
    this.grid[0][0] = 'agent';

    // Place goal at opposite corner
    this.goalPos = { x: this.gridSize - 1, y: this.gridSize - 1 };
    this.grid[this.goalPos.y][this.goalPos.x] = 'goal';

    // Place obstacles and pits based on grid size
    this._placeObstaclesAndPits();
  }

  _placeObstaclesAndPits() {
    const size = this.gridSize;

    // Define obstacles (walls) - placed strategically to create a maze-like challenge
    const obstaclePositions = [];
    const pitPositions = [];

    if (size >= 5) {
      // Standard 5x5 layout
      obstaclePositions.push({ x: 2, y: 1 });
      obstaclePositions.push({ x: 2, y: 2 });
      obstaclePositions.push({ x: 2, y: 3 });
      pitPositions.push({ x: 1, y: 2 });
      pitPositions.push({ x: 3, y: 2 });
    }

    if (size >= 6) {
      // Additional challenges for larger grids
      obstaclePositions.push({ x: 3, y: 1 });
      obstaclePositions.push({ x: 3, y: 4 });
      pitPositions.push({ x: 4, y: 3 });
      pitPositions.push({ x: 1, y: 4 });
    }

    if (size >= 7) {
      // Even more challenges for 7x7+ grids
      obstaclePositions.push({ x: 4, y: 2 });
      obstaclePositions.push({ x: 4, y: 5 });
      pitPositions.push({ x: 5, y: 1 });
      pitPositions.push({ x: 2, y: 5 });
    }

    if (size >= 8) {
      obstaclePositions.push({ x: 5, y: 3 });
      obstaclePositions.push({ x: 3, y: 6 });
      pitPositions.push({ x: 6, y: 2 });
      pitPositions.push({ x: 1, y: 6 });
    }

    // Scale obstacles for very large grids
    if (size >= 10) {
      for (let i = 0; i < Math.floor(size / 3); i++) {
        const ox = Math.floor(size * 0.3) + i * 2;
        const oy = Math.floor(size * 0.4) + i;
        if (ox < size - 1 && oy < size - 1 && (ox !== 0 || oy !== 0)) {
          obstaclePositions.push({ x: ox, y: oy });
        }
      }
    }

    // Place obstacles on grid (avoiding agent start and goal)
    for (const pos of obstaclePositions) {
      if (pos.x < size && pos.y < size &&
          !(pos.x === 0 && pos.y === 0) &&
          !(pos.x === this.goalPos.x && pos.y === this.goalPos.y)) {
        this.grid[pos.y][pos.x] = 'obstacle';
        this.obstacles.push({ ...pos });
      }
    }

    // Place pits on grid (avoiding agent start, goal, and obstacles)
    for (const pos of pitPositions) {
      if (pos.x < size && pos.y < size &&
          !(pos.x === 0 && pos.y === 0) &&
          !(pos.x === this.goalPos.x && pos.y === this.goalPos.y) &&
          this.grid[pos.y][pos.x] === 'empty') {
        this.grid[pos.y][pos.x] = 'pit';
        this.pits.push({ ...pos });
      }
    }
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
      return {
        state: this.getState(),
        reward: 0,
        done: true,
        info: { message: 'Episode already finished. Please reset.' }
      };
    }

    // Direction vectors: 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
    // Note: UP increases y, DOWN decreases y (standard grid coordinates)
    const dx = [0, 1, 0, -1];
    const dy = [1, 0, -1, 0];

    const newX = this.agentPos.x + dx[action];
    const newY = this.agentPos.y + dy[action];

    let reward = this.rewards.step; // -0.01 per step
    let message = 'Moved successfully';
    let success = false;

    // Check boundary collision
    if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
      reward = this.rewards.boundary; // -0.1
      message = 'Hit boundary!';
    } else {
      // Check what's at the new position
      const cellType = this.grid[newY][newX];

      switch (cellType) {
        case 'obstacle':
          reward = this.rewards.obstacle; // -0.5
          message = 'Hit obstacle!';
          break;

        case 'pit':
          reward = this.rewards.pit; // -1
          message = 'Fell in pit!';
          this.done = true;
          break;

        case 'goal':
          // Move the agent to the goal
          this.grid[this.agentPos.y][this.agentPos.x] = 'empty';
          this.agentPos = { x: newX, y: newY };
          this.grid[newY][newX] = 'agent';
          reward = this.rewards.goal; // +10
          message = 'Goal reached!';
          success = true;
          this.done = true;
          break;

        case 'empty':
          // Move the agent
          this.grid[this.agentPos.y][this.agentPos.x] = 'empty';
          this.agentPos = { x: newX, y: newY };
          this.grid[newY][newX] = 'agent';
          break;

        default:
          // Move the agent (shouldn't happen, but handle gracefully)
          this.grid[this.agentPos.y][this.agentPos.x] = 'empty';
          this.agentPos = { x: newX, y: newY };
          this.grid[newY][newX] = 'agent';
          break;
      }
    }

    this.steps++;
    this.totalReward += reward;

    // Check max steps
    if (this.steps >= this.maxSteps) {
      this.done = true;
      message = 'Max steps reached!';
    }

    return {
      state: this.getState(),
      reward: reward,
      done: this.done,
      info: {
        message: message,
        success: success,
        action_taken: action,
        steps: this.steps
      }
    };
  }

  getState() {
    return {
      agent_position: { ...this.agentPos },
      goal_position: { ...this.goalPos },
      grid_size: this.gridSize,
      grid: this.grid.map(row => [...row]), // Deep copy
      steps: this.steps,
      done: this.done,
      total_reward: this.totalReward
    };
  }

  getInfo() {
    return {
      name: 'GridWorld-v0',
      description: 'A classic grid world reinforcement learning environment where an agent navigates to reach a goal while avoiding obstacles and pits.',
      version: '1.0.0',
      action_space: {
        type: 'discrete',
        n: 4,
        labels: ['UP', 'RIGHT', 'DOWN', 'LEFT']
      },
      observation_space: {
        type: 'grid',
        shape: [this.gridSize, this.gridSize],
        cellTypes: ['empty', 'agent', 'goal', 'obstacle', 'pit']
      },
      reward_range: {
        min: this.rewards.pit,
        max: this.rewards.goal
      },
      max_steps: this.maxSteps,
      rewards: { ...this.rewards },
      grid_size: this.gridSize
    };
  }
}

// ============================================
// ENVIRONMENT MANAGER
// ============================================

class EnvironmentManager {
  constructor() {
    this.environments = new Map();
  }

  getOrCreate(envId = 'default', gridSize = 5) {
    if (!this.environments.has(envId)) {
      this.environments.set(envId, new GridWorldEnv(gridSize, envId));
    }
    return this.environments.get(envId);
  }

  get(envId = 'default') {
    return this.environments.get(envId);
  }

  list() {
    const envList = [];
    for (const [id, env] of this.environments) {
      const state = env.getState();
      envList.push({
        env_id: id,
        grid_size: env.gridSize,
        steps: state.steps,
        done: state.done,
        total_reward: state.totalReward
      });
    }
    return envList;
  }

  delete(envId) {
    if (this.environments.has(envId)) {
      this.environments.delete(envId);
      return true;
    }
    return false;
  }

  reset(envId = 'default', gridSize) {
    if (gridSize !== undefined && this.environments.has(envId)) {
      // Recreate with new grid size
      this.environments.set(envId, new GridWorldEnv(gridSize, envId));
    }
    const env = this.getOrCreate(envId, gridSize);
    return env.reset();
  }
}

const envManager = new EnvironmentManager();

// ============================================
// API ROUTES
// ============================================

// Home
app.get('/', (req, res) => {
  res.send('OpenEnv Running ✅');
});

// Environment Info
app.get('/api/env/info', (req, res) => {
  const envId = req.query.env_id || 'default';
  const env = envManager.getOrCreate(envId);
  res.json(env.getInfo());
});

// List all environments
app.get('/api/envs', (req, res) => {
  res.json(envManager.list());
});

// Reset environment
app.post('/api/reset', (req, res) => {
  const env_id = req.body?.env_id || 'default';
  const grid_size = req.body?.grid_size || 5;

  const state = envManager.reset(env_id, parseInt(grid_size));

  res.json({
    env_id: env_id,
    state: state,
    info: envManager.get(env_id).getInfo()
  });
});

// Take a step
app.post('/api/step', (req, res) => {
  const { action, env_id = 'default' } = req.body;

  if (action === undefined || action === null) {
    return res.status(400).json({
      error: 'Missing required parameter: action',
      message: 'Action must be an integer 0-3 representing direction (0=UP, 1=RIGHT, 2=DOWN, 3=LEFT)'
    });
  }

  const env = envManager.getOrCreate(env_id);
  const result = env.step(parseInt(action));

  res.json({
    env_id: env_id,
    state: result.state,
    reward: result.reward,
    done: result.done,
    info: result.info
  });
});

// Get current state
app.get('/api/state', (req, res) => {
  const env_id = req.query.env_id || 'default';
  const env = envManager.getOrCreate(env_id);
  res.json(env.getState());
});

// Delete environment
app.delete('/api/env/:env_id', (req, res) => {
  const { env_id } = req.params;
  const deleted = envManager.delete(env_id);

  if (deleted) {
    res.json({ success: true, message: `Environment '${env_id}' deleted` });
  } else {
    res.status(404).json({ success: false, message: `Environment '${env_id}' not found` });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(port, '0.0.0.0', () => {
  console.log(`🌍 OpenEnv Server running at http://localhost:${port}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET  /api/env/info  - Environment information`);
  console.log(`   GET  /api/envs       - List all environments`);
  console.log(`   GET  /api/state      - Get current state`);
  console.log(`   POST /api/reset      - Reset environment`);
  console.log(`   POST /api/step       - Take an action`);
  console.log(`   DELETE /api/env/:id  - Delete environment`);
  console.log(``);
  console.log(`🎮 Open http://localhost:${port} in your browser to play!`);
});

// Export for use in other modules (like agent.js)
module.exports = { GridWorldEnv, EnvironmentManager };