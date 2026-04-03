# 🌍 OpenEnv - Grid World Environment

A complete, real-world OpenEnv environment that AI agents can learn from through the standard `step()` / `reset()` / `state()` API.

## Overview

OpenEnv provides a **Grid World** environment - a classic reinforcement learning problem where an agent navigates a grid to reach a goal while avoiding obstacles and pits. This implementation follows the standard RL environment interface pattern used by popular frameworks like OpenAI Gym.

## Features

- ✅ Standard RL API: `reset()`, `step()`, `state()`
- ✅ RESTful HTTP API for language-agnostic access
- ✅ Interactive web interface with real-time visualization
- ✅ Keyboard controls (WASD / Arrow keys)
- ✅ Multiple environment instance support
- ✅ Configurable grid size
- ✅ Q-Learning agent example included
- ✅ Comprehensive documentation

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open browser to http://localhost:3000
```

### Run Agent Demo

```bash
# Run the Q-Learning agent demonstration
npm run demo
```

## Environment Details

### Grid World (GridWorld-v0)

| Property | Value |
|----------|-------|
| Grid Size | 5×5 (configurable) |
| Action Space | 4 discrete actions |
| Observation Space | Grid state |
| Max Steps | 100 (grid_size² × 4) |

### Rewards

| Event | Reward |
|-------|--------|
| Reach Goal | +10 |
| Hit Obstacle | -0.5 |
| Fall in Pit | -1 |
| Hit Boundary | -0.1 |
| Each Step | -0.01 |

### Actions

| Action | Direction | Keyboard |
|--------|-----------|----------|
| 0 | Up (↑) | W / ↑ |
| 1 | Right (→) | D / → |
| 2 | Down (↓) | S / ↓ |
| 3 | Left (←) | A / ← |

## Grid Layout

```
y
4  ·  ·  ·  ·  ·
3  ·  ·  🧱  ·  ·
2  ·  🕳️  🧱  🕳️  ·
1  ·  ·  🧱  ·  ·
0  🤖  ·  ·  ·  🎯
   -------------
      0  1  2  3  4    x
```

- 🤖 Agent starts at (0, 0)
- 🎯 Goal is at (4, 4)
- 🧱 Obstacles block movement
- 🕳️ Pits end the episode with penalty

## API Reference

### Environment Info

```http
GET /api/env/info
```

Returns metadata about the environment including action space, observation space, and reward ranges.

**Response:**
```json
{
  "name": "GridWorld-v0",
  "description": "A classic grid world reinforcement learning environment...",
  "version": "1.0.0",
  "action_space": {
    "type": "discrete",
    "n": 4,
    "labels": ["UP", "RIGHT", "DOWN", "LEFT"]
  },
  "observation_space": {
    "type": "grid",
    "shape": [5, 5],
    "cellTypes": ["empty", "agent", "goal", "obstacle", "pit"]
  },
  "reward_range": { "min": -1, "max": 10 },
  "max_steps": 100,
  "rewards": {
    "goal": 10, "obstacle": -0.5, "pit": -1,
    "boundary": -0.1, "step": -0.01
  }
}
```

### Reset Environment

```http
POST /api/reset
```

Resets the environment to its initial state. The agent starts at position (0, 0).

**Query Parameters:**
- `env_id` (optional): Unique identifier for the environment instance
- `grid_size` (optional): Size of the grid (default: 5)

**Response:**
```json
{
  "env_id": "default",
  "state": {
    "agent_position": { "x": 0, "y": 0 },
    "goal_position": { "x": 4, "y": 4 },
    "grid_size": 5,
    "steps": 0,
    "done": false,
    "total_reward": 0,
    "grid": [["agent", "empty", ...], ...]
  },
  "info": { ... }
}
```

### Take Action (Step)

```http
POST /api/step
Content-Type: application/json

{
  "action": 1,
  "env_id": "default"
}
```

Executes an action in the environment and returns the new state, reward, and done flag.

**Body:**
- `action` (required): Integer 0-3 representing the direction
- `env_id` (optional): Environment instance ID (default: "default")

**Response:**
```json
{
  "env_id": "default",
  "state": {
    "agent_position": { "x": 1, "y": 0 },
    "goal_position": { "x": 4, "y": 4 },
    "grid_size": 5,
    "steps": 1,
    "done": false,
    "total_reward": -0.01,
    "grid": [...]
  },
  "reward": -0.01,
  "done": false,
  "info": {
    "message": "Moved successfully",
    "success": true,
    "action_taken": 1,
    "steps": 1
  }
}
```

### Get Current State

```http
GET /api/state?env_id=default
```

Returns the current state without taking any action.

### List Environments

```http
GET /api/envs
```

Lists all active environment instances.

### Delete Environment

```http
DELETE /api/env/:env_id
```

Deletes a specific environment instance.

## Usage Examples

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');
const BASE_URL = 'http://localhost:3000';

// Reset the environment
async function reset() {
  const response = await fetch(`${BASE_URL}/api/reset`, { method: 'POST' });
  return response.json();
}

// Take an action
async function step(action) {
  const response = await fetch(`${BASE_URL}/api/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  return response.json();
}

// Get current state
async function getState() {
  const response = await fetch(`${BASE_URL}/api/state`);
  return response.json();
}

// Training loop example
async function train() {
  const actions = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
  
  await reset();
  let done = false;
  let totalReward = 0;
  
  while (!done) {
    // Your RL agent selects an action
    const action = selectAction();
    
    const result = await step(action);
    totalReward += result.reward;
    done = result.done;
    
    // Learn from the experience
    learn(result.state, action, result.reward);
  }
  
  console.log('Episode complete! Total reward:', totalReward);
}
```

### Using the Environment Directly (No Server)

```javascript
const { GridWorldEnv } = require('./index');
const { QLearningAgent } = require('./agent');

// Create environment
const env = new GridWorldEnv(5, 'my-env');

// Create agent
const agent = new QLearningAgent({
  learningRate: 0.1,
  discountFactor: 0.95,
  epsilon: 0.1
});

// Training loop
for (let episode = 0; episode < 100; episode++) {
  let state = env.reset();
  let done = false;
  
  while (!done) {
    const action = agent.selectAction(state);
    const result = env.step(action);
    
    agent.learn(state, action, result.reward, result.state, result.done);
    
    state = result.state;
    done = result.done;
  }
  
  agent.decayEpsilon();
}
```

### Python

```python
import requests
import json

BASE_URL = "http://localhost:3000"

def reset():
    response = requests.post(f"{BASE_URL}/api/reset")
    return response.json()

def step(action):
    response = requests.post(
        f"{BASE_URL}/api/step",
        headers={"Content-Type": "application/json"},
        data=json.dumps({"action": action})
    )
    return response.json()

def get_state():
    response = requests.get(f"{BASE_URL}/api/state")
    return response.json()

# Training loop
def train():
    actions = {"UP": 0, "RIGHT": 1, "DOWN": 2, "LEFT": 3}
    
    reset()
    done = False
    total_reward = 0
    
    while not done:
        action = select_action()  # Your RL agent
        result = step(action)
        total_reward += result["reward"]
        done = result["done"]
        learn(result["state"], action, result["reward"])
    
    print(f"Episode complete! Total reward: {total_reward}")
```

### cURL

```bash
# Reset
curl -X POST http://localhost:3000/api/reset

# Step (move right)
curl -X POST http://localhost:3000/api/step \
  -H "Content-Type: application/json" \
  -d '{"action": 1}'

# Get state
curl http://localhost:3000/api/state

# Get environment info
curl http://localhost:3000/api/env/info
```

## Q-Learning Agent

The included `agent.js` file contains a complete Q-Learning implementation:

```javascript
const { QLearningAgent } = require('./agent');

const agent = new QLearningAgent({
  learningRate: 0.2,      // How much to learn from new info
  discountFactor: 0.95,   // Importance of future rewards
  epsilon: 1.0,           // Initial exploration rate
  epsilonDecay: 0.995,    // How fast to reduce exploration
  minEpsilon: 0.01        // Minimum exploration rate
});

// Select action (training mode with exploration)
const action = agent.selectAction(state, true);

// Learn from experience
agent.learn(state, action, reward, nextState, done);

// Reduce exploration after each episode
agent.decayEpsilon();
```

## Project Structure

```
openenv-project/
├── index.js              # Main server with GridWorldEnv class
├── agent.js              # Q-Learning and Random agents
├── package.json          # Dependencies and scripts
├── README.md             # This file
└── public/
    ├── index.html        # Main interactive interface
    ├── home.html         # Home page (redirects to index)
    ├── about.html        # About/documentation page
    └── css/
        └── style.css     # All styles
```

## Building Your Own Agent

### Q-Learning Example

```javascript
class QLearningAgent {
  constructor(actions, learningRate = 0.1, discountFactor = 0.95, epsilon = 0.1) {
    this.actions = actions;
    this.lr = learningRate;
    this.gamma = discountFactor;
    this.epsilon = epsilon;
    this.qTable = {};
  }

  getStateKey(state) {
    return `${state.agent_position.x},${state.agent_position.y}`;
  }

  getQValues(state) {
    const key = this.getStateKey(state);
    if (!this.qTable[key]) {
      this.qTable[key] = new Array(this.actions).fill(0);
    }
    return this.qTable[key];
  }

  selectAction(state) {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.actions); // Explore
    }
    const qValues = this.getQValues(state);
    return qValues.indexOf(Math.max(...qValues)); // Exploit
  }

  learn(state, action, reward, nextState, done) {
    const key = this.getStateKey(state);
    const nextKey = this.getStateKey(nextState);
    
    if (!this.qTable[key]) {
      this.qTable[key] = new Array(this.actions).fill(0);
    }
    
    const maxNextQ = done ? 0 : Math.max(...this.getQValues(nextState));
    this.qTable[key][action] += this.lr * (
      reward + this.gamma * maxNextQ - this.qTable[key][action]
    );
  }
}
```

## Use Cases

- **Reinforcement Learning Research**: Test and compare RL algorithms
- **Education**: Teach RL concepts with a visual, interactive environment
- **Algorithm Testing**: Validate pathfinding algorithms (A*, Dijkstra)
- **Prototyping**: Quick iteration before scaling to complex environments
- **API Testing**: Language-agnostic RL environment via REST API

## Contributing

Feel free to submit issues and enhancement requests!

## License

ISC