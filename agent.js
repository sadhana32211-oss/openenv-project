/**
 * OpenEnv - Example AI Agents
 * 
 * This file demonstrates how to create AI agents that interact with
 * the OpenEnv GridWorld environment using the standard RL API.
 * 
 * Run with: node agent.js
 */

const { GridWorldEnv } = require('./index');

// ============================================
// Q-LEARNING AGENT
// ============================================

class QLearningAgent {
  constructor(options = {}) {
    this.actions = 4; // UP, RIGHT, DOWN, LEFT
    this.learningRate = options.learningRate || 0.1;
    this.discountFactor = options.discountFactor || 0.95;
    this.epsilon = options.epsilon || 0.1;
    this.epsilonDecay = options.epsilonDecay || 0.995;
    this.minEpsilon = options.minEpsilon || 0.01;
    
    // Q-table: key = "x,y" -> array of Q-values for each action
    this.qTable = {};
    
    // Training statistics
    this.episodeRewards = [];
    this.totalEpisodes = 0;
  }
  
  /**
   * Convert state to a Q-table key
   */
  getStateKey(state) {
    return `${state.agent_position.x},${state.agent_position.y}`;
  }
  
  /**
   * Get Q-values for a state, initializing if needed
   */
  getQValues(state) {
    const key = this.getStateKey(state);
    if (!this.qTable[key]) {
      this.qTable[key] = new Array(this.actions).fill(0);
    }
    return this.qTable[key];
  }
  
  /**
   * Select an action using epsilon-greedy policy
   */
  selectAction(state, training = true) {
    // Exploration: random action
    if (training && Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.actions);
    }
    
    // Exploitation: best action
    const qValues = this.getQValues(state);
    const maxQ = Math.max(...qValues);
    const bestActions = qValues.map((q, i) => q === maxQ ? i : -1).filter(i => i !== -1);
    
    // Random tie-breaking
    return bestActions[Math.floor(Math.random() * bestActions.length)];
  }
  
  /**
   * Learn from an experience tuple
   */
  learn(state, action, reward, nextState, done) {
    const key = this.getStateKey(state);
    const nextKey = this.getStateKey(nextState);
    
    // Initialize Q-values if needed
    if (!this.qTable[key]) {
      this.qTable[key] = new Array(this.actions).fill(0);
    }
    
    // Get max Q-value for next state
    const maxNextQ = done ? 0 : Math.max(...this.getQValues(nextState));
    
    // Q-learning update
    this.qTable[key][action] += this.learningRate * (
      reward + this.discountFactor * maxNextQ - this.qTable[key][action]
    );
  }
  
  /**
   * Decay epsilon after each episode
   */
  decayEpsilon() {
    this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
  }
  
  /**
   * Reset training statistics
   */
  reset() {
    this.qTable = {};
    this.episodeRewards = [];
    this.totalEpisodes = 0;
    this.epsilon = 0.1;
  }
  
  /**
   * Get training statistics
   */
  getStats() {
    return {
      episodes: this.totalEpisodes,
      epsilon: this.epsilon,
      qTableSize: Object.keys(this.qTable).length,
      avgReward: this.episodeRewards.length > 0 
        ? this.episodeRewards.reduce((a, b) => a + b, 0) / this.episodeRewards.length 
        : 0,
      recentAvgReward: this.episodeRewards.length >= 10
        ? this.episodeRewards.slice(-10).reduce((a, b) => a + b, 0) / 10
        : (this.episodeRewards.length > 0 ? this.episodeRewards[this.episodeRewards.length - 1] : 0)
    };
  }
}

// ============================================
// RANDOM AGENT (Baseline)
// ============================================

class RandomAgent {
  constructor() {
    this.actions = 4;
    this.episodeRewards = [];
  }
  
  selectAction() {
    return Math.floor(Math.random() * this.actions);
  }
  
  learn() {
    // No learning for random agent
  }
  
  decayEpsilon() {}
  
  reset() {
    this.episodeRewards = [];
  }
  
  getStats() {
    return {
      avgReward: this.episodeRewards.length > 0
        ? this.episodeRewards.reduce((a, b) => a + b, 0) / this.episodeRewards.length
        : 0
    };
  }
}

// ============================================
// TRAINING FUNCTION
// ============================================

async function trainAgent(agent, env, numEpisodes = 100, verbose = true) {
  for (let episode = 1; episode <= numEpisodes; episode++) {
    // Reset environment
    let state = env.reset();
    let done = false;
    let episodeReward = 0;
    let steps = 0;
    
    while (!done) {
      // Select action
      const action = agent.selectAction(state);
      
      // Take step
      const result = env.step(action);
      const nextState = result.state;
      const reward = result.reward;
      done = result.done;
      
      // Learn
      agent.learn(state, action, reward, nextState, done);
      
      state = nextState;
      episodeReward += reward;
      steps++;
    }
    
    // Record episode stats
    agent.episodeRewards.push(episodeReward);
    agent.totalEpisodes++;
    agent.decayEpsilon();
    
    // Print progress
    if (verbose && (episode % 10 === 0 || episode === 1)) {
      const stats = agent.getStats();
      const success = episodeReward > 0 ? '🎯' : episodeReward < -0.5 ? '💀' : '🚶';
      console.log(`Episode ${episode}/${numEpisodes} ${success} | Reward: ${episodeReward.toFixed(2)} | Steps: ${steps} | Epsilon: ${agent.epsilon.toFixed(3)} | Q-States: ${stats.qTableSize}`);
    }
  }
  
  return agent.getStats();
}

// ============================================
// DEMONSTRATION
// ============================================

function demonstrateEnvironment() {
  console.log('\n' + '='.repeat(60));
  console.log('🌍 OpenEnv - Environment Demonstration');
  console.log('='.repeat(60) + '\n');
  
  // Create environment
  const env = new GridWorldEnv(5, 'demo');
  
  console.log('📊 Environment Info:');
  const info = env.getInfo();
  console.log(`   Name: ${info.name}`);
  console.log(`   Grid Size: ${info.grid_size}x${info.grid_size}`);
  console.log(`   Action Space: ${info.action_space.n} discrete actions`);
  console.log(`   Actions: ${info.action_space.labels.join(', ')}`);
  console.log(`   Max Steps: ${info.max_steps}`);
  console.log(`   Rewards: Goal=${info.rewards.goal}, Obstacle=${info.rewards.obstacle}, Pit=${info.rewards.pit}`);
  
  console.log('\n🗺️  Initial Grid Layout:');
  let state = env.reset();
  printGrid(state);
  
  console.log('\n🎮 Manual Actions:');
  
  // Move right twice
  console.log('   → Moving RIGHT...');
  let result = env.step(1);
  console.log(`     Reward: ${result.reward}, Position: (${result.state.agent_position.x}, ${result.state.agent_position.y})`);
  
  console.log('   → Moving RIGHT...');
  result = env.step(1);
  console.log(`     Reward: ${result.reward}, Position: (${result.state.agent_position.x}, ${result.state.agent_position.y})`);
  
  // Move up
  console.log('   ↑ Moving UP...');
  result = env.step(0);
  console.log(`     Reward: ${result.reward}, Position: (${result.state.agent_position.x}, ${result.state.agent_position.y})`);
  
  console.log('\n🗺️  Current Grid:');
  printGrid(result.state);
  
  console.log(`\n📈 Stats: Steps=${result.state.steps}, Total Reward=${result.state.total_reward.toFixed(2)}`);
}

function printGrid(state) {
  const size = state.grid_size;
  const grid = state.grid;
  
  // Print from top (highest y) to bottom
  for (let y = size - 1; y >= 0; y--) {
    let row = '   ';
    for (let x = 0; x < size; x++) {
      const cell = grid[y][x];
      switch (cell) {
        case 'agent': row += '🤖 '; break;
        case 'goal': row += '🎯 '; break;
        case 'obstacle': row += '🧱 '; break;
        case 'pit': row += '🕳️ '; break;
        default: row += '·  ';
      }
    }
    console.log(row);
  }
  console.log('   ' + '- '.repeat(size));
  console.log('   ' + Array.from({length: size}, (_, i) => ` ${i} `).join(''));
}

async function runTrainingDemo() {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 Q-Learning Agent Training');
  console.log('='.repeat(60) + '\n');
  
  const env = new GridWorldEnv(5, 'training');
  const agent = new QLearningAgent({
    learningRate: 0.2,
    discountFactor: 0.95,
    epsilon: 1.0,        // Start with high exploration
    epsilonDecay: 0.995,
    minEpsilon: 0.01
  });
  
  console.log('Training parameters:');
  console.log(`   Learning Rate: ${agent.learningRate}`);
  console.log(`   Discount Factor: ${agent.discountFactor}`);
  console.log(`   Initial Epsilon: ${agent.epsilon}`);
  console.log(`   Epsilon Decay: ${agent.epsilonDecay}`);
  console.log('');
  
  // Train
  const stats = await trainAgent(agent, env, 200, true);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Training Complete!');
  console.log('='.repeat(60));
  console.log(`   Episodes: ${stats.episodes}`);
  console.log(`   Final Epsilon: ${stats.epsilon.toFixed(4)}`);
  console.log(`   Q-Table States: ${stats.qTableSize}`);
  console.log(`   Average Reward: ${stats.avgReward.toFixed(2)}`);
  console.log(`   Recent Avg Reward (last 10): ${stats.recentAvgReward.toFixed(2)}`);
  
  // Test the trained agent
  console.log('\n🧪 Testing Trained Agent (greedy, no exploration):');
  
  let testState = env.reset();
  let testDone = false;
  let testReward = 0;
  let testSteps = 0;
  
  printGrid(testState);
  console.log('');
  
  while (!testDone && testSteps < 50) {
    const action = agent.selectAction(testState, false); // No exploration
    const actionNames = ['↑ UP', '→ RIGHT', '↓ DOWN', '← LEFT'];
    
    const result = env.step(action);
    testState = result.state;
    testDone = result.done;
    testReward += result.reward;
    testSteps++;
    
    console.log(`   Step ${testSteps}: ${actionNames[action]} → Reward: ${result.reward.toFixed(2)}, Pos: (${testState.agent_position.x}, ${testState.agent_position.y})`);
    
    if (testDone) {
      const outcome = testReward > 0 ? '🎯 SUCCESS!' : testReward < -0.5 ? '💀 FAILED!' : '🚶 Completed';
      console.log(`\n   ${outcome} Total Reward: ${testReward.toFixed(2)}`);
    }
  }
  
  console.log('\n🗺️  Final Position:');
  printGrid(testState);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║   🌍 OpenEnv - Reinforcement Learning Environment 🌍    ║');
  console.log('║                                                          ║');
  console.log('║   GridWorld-v0 with Q-Learning Agent                    ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  // Part 1: Demonstrate the environment
  demonstrateEnvironment();
  
  // Part 2: Train a Q-Learning agent
  await runTrainingDemo();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All demonstrations complete!');
  console.log('='.repeat(60));
  console.log('\n💡 Next steps:');
  console.log('   1. Run `npm start` to start the web server');
  console.log('   2. Open http://localhost:3000 to interact with the environment');
  console.log('   3. Use the API to train your own agents!');
  console.log('');
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other modules
module.exports = { QLearningAgent, RandomAgent, trainAgent };