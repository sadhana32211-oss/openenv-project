const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

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
    this.maxSteps = gridSize * gridSize * 4; // Allow enough steps to explore
    
    // Reward configuration
    this.rewards = {
      goal: 10,
      obstacle: -0.5,
      pit: -1,
      boundary: -0.1,
      step: -0.01
    };
    
    // Action space configuration
    this.actionSpace = {
      type: 'discrete',
      n: 4,
      labels: ['UP', 'RIGHT', 'DOWN', 'LEFT']
    };
    
    // Observation space configuration
    this.observationSpace = {
      type: 'grid',
      shape: [gridSize, gridSize],
      cellTypes: ['empty', 'agent', 'goal', 'obstacle', 'pit']
    };
    
    // State
    this.agentPos = { x: 0, y: 0 };
    this.goalPos = { x: gridSize - 1, y: gridSize - 1 };
    this.grid = [];
    this.steps = 0;
    this.totalReward = 0;
    this.done = false;
    
    // Initialize the grid
    this._initializeGrid();
  }
  
  _initializeGrid() {
    // Create empty grid
    this.grid = [];
    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = 'empty';
      }
    }
    
    // Place obstacles (rocks/walls) - deterministic placement based on grid size
    const obstacles = this._generateObstacles();
    obstacles.forEach(pos => {
      if (!(pos.x === 0 && pos.y === 0) && !(pos.x === this.goalPos.x && pos.y === this.goalPos.y)) {
        this.grid[pos.y][pos.x] = 'obstacle';
      }
    });
    
    // Place pits (traps) - deterministic placement
    const pits = this._generatePits();
    pits.forEach(pos => {
      if (!(pos.x === 0 && pos.y === 0) && 
          !(pos.x === this.goalPos.x && pos.y === this.goalPos.y) &&
          this.grid[pos.y][pos.x] !== 'obstacle') {
        this.grid[pos.y][pos.x] = 'pit';
      }
    });
    
    // Place agent at start
    this.grid[0][0] = 'agent';
    
    // Place goal
    this.grid[this.goalPos.y][this.goalPos.x] = 'goal';
  }
  
  _generateObstacles() {
    // Generate obstacles based on grid size for consistent, solvable environments
    const obstacles = [];
    const size = this.gridSize;
    
    if (size >= 4) {
      // Add some strategic obstacles
      const obstaclePositions = [
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: Math.floor(size / 2), y: Math.floor(size / 2) - 1 },
      ];
      
      // Filter valid positions (not start, not goal, within bounds)
      obstacles.push(...obstaclePositions.filter(pos => 
        pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size &&
        !(pos.x === 0 && pos.y === 0) && 
        !(pos.x === size - 1 && pos.y === size - 1)
      ));
    }
    
    return obstacles;
  }
  
  _generatePits() {
    // Generate pits based on grid size
    const pits = [];
    const size = this.gridSize;
    
    if (size >= 4) {
      const pitPositions = [
        { x: 1, y: 2 },
        { x: 3, y: 2 },
        { x: size - 2, y: size - 3 },
      ];
      
      // Filter valid positions
      pits.push(...pitPositions.filter(pos => 
        pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size &&
        !(pos.x === 0 && pos.y === 0) && 
        !(pos.x === size - 1 && pos.y === size - 1)
      ));
    }
    
    return pits;
  }
  
  reset() {
    // Reset state
    this.agentPos = { x: 0, y: 0 };
    this.steps = 0;
    this.totalReward = 0;
    this.done = false;
    
    // Reinitialize grid
    this._initializeGrid();
    
    return this.getState();
  }
  
  step(action) {
    if (this.done) {
      return {
        state: this.getState(),
        reward: 0,
        done: true,
        info: { message: 'Episode already finished. Call reset() to start a new episode.' }
      };
    }
    
    // Validate action
    if (action < 0 || action > 3) {
      return {
        state: this.getState(),
        reward: -0.1,
        done: false,
        info: { message: `Invalid action: ${action}. Must be 0-3.`, success: false }
      };
    }
    
    // Calculate new position based on action
    // 0: UP, 1: RIGHT, 2: DOWN, 3: LEFT
    const dx = [0, 1, 0, -1];
    const dy = [1, 0, -1, 0];
    
    const newX = this.agentPos.x + dx[action];
    const newY = this.agentPos.y + dy[action];
    
    let reward = this.rewards.step;
    let message = '';
    let success = true;
    
    // Check boundary collision
    if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
      reward = this.rewards.boundary;
      message = 'Hit boundary!';
      success = false;
    } else {
      // Check what's at the new position
      const cellType = this.grid[newY][newX];
      
      if (cellType === 'obstacle') {
        reward = this.rewards.obstacle;
        message = 'Hit obstacle!';
        success = false;
      } else if (cellType === 'pit') {
        reward = this.rewards.pit;
        message = 'Fell in pit!';
        this.done = true;
      } else if (cellType === 'goal') {
        reward = this.rewards.goal;
        message = 'Reached goal!';
        this.done = true;
      } else {
        message = 'Moved successfully';
      }
      
      // Update agent position if move was valid
      if (success || cellType === 'goal' || cellType === 'pit') {
        // Clear old position
        this.grid[this.agentPos.y][this.agentPos.x] = 
          this.grid[this.agentPos.y][this.agentPos.x] === 'agent' ? 'empty' : this.grid[this.agentPos.y][this.agentPos.x];
        
        // Update position
        this.agentPos = { x: newX, y: newY };
        
        // Set new agent position (unless fell in pit)
        if (cellType !== 'pit') {
          this.grid[newY][newX] = 'agent';
        }
      }
    }
    
    // Increment step counter
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
        message, 
        success,
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
      steps: this.steps,
      done: this.done,
      total_reward: this.totalReward,
      grid: this.grid.map(row => [...row]) // Deep copy of grid
    };
  }
  
  getInfo() {
    return {
      name: 'GridWorld-v0',
      description: 'A classic grid world reinforcement learning environment where an agent navigates a grid to reach a goal while avoiding obstacles and pits.',
      version: '1.0.0',
      action_space: this.actionSpace,
      observation_space: this.observationSpace,
      reward_range: {
        min: Math.min(...Object.values(this.rewards)),
        max: Math.max(...Object.values(this.rewards))
      },
      max_steps: this.maxSteps,
      rewards: this.rewards,
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
  
  delete(envId) {
    return this.environments.delete(envId);
  }
  
  list() {
    const envList = [];
    this.environments.forEach((env, id) => {
      envList.push({
        env_id: id,
        grid_size: env.gridSize,
        steps: env.steps,
        total_reward: env.totalReward,
        done: env.done
      });
    });
    return envList;
  }
}

// Create global environment manager
const envManager = new EnvironmentManager();

// ============================================
// API ROUTES
// ============================================

// Home page route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

// About page route
app.get('/about', (req, res) => {
  res.sendFile(__dirname + '/public/about.html');
});

// API: Get environment info
app.get('/api/env/info', (req, res) => {
  const env = envManager.getOrCreate('default', 5);
  res.json(env.getInfo());
});

// API: List all environments
app.get('/api/envs', (req, res) => {
  res.json(envManager.list());
});

// API: Reset environment
app.post('/api/reset', (req, res) => {
  const { env_id = 'default', grid_size = 5 } = req.query;
  const env = envManager.getOrCreate(env_id, parseInt(grid_size));
  const state = env.reset();
  
  res.json({
    env_id: env_id,
    state: state,
    info: env.getInfo()
  });
});

// API: Take a step
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

// API: Get current state
app.get('/api/state', (req, res) => {
  const { env_id = 'default' } = req.query;
  const env = envManager.getOrCreate(env_id);
  
  res.json({
    env_id: env_id,
    state: env.getState(),
    info: env.getInfo()
  });
});

// API: Delete environment
app.delete('/api/env/:env_id', (req, res) => {
  const { env_id } = req.params;
  
  if (envManager.delete(env_id)) {
    res.json({ success: true, message: `Environment '${env_id}' deleted` });
  } else {
    res.status(404).json({ success: false, message: `Environment '${env_id}' not found` });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(port, () => {
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

// Export for testing and programmatic use
module.exports = { GridWorldEnv, EnvironmentManager, app };
