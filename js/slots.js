// Constants
const SPIN_COST = 20;
const MAX_REELS = 5;
const REEL_UPGRADE_BASE_COST = 1000; // Base cost for the first upgrade
const rarities = [
    { name: 'Clown', chance: 5, multiplier: 1, emoji: '🤡', value: 0, displayText: 'Silly Clown' },
    { name: 'Poop', chance: 5, multiplier: 1, emoji: '💩', value: 0, displayText: 'Stinky Poop' },
    { name: 'Mythic', chance: 1, multiplier: 50, emoji: '🌟', value: 10000, displayText: 'Mythic Star' },
    { name: 'Legendary', chance: 4, multiplier: 25, emoji: '💎', value: 5000, displayText: 'Legendary Diamond' },
    { name: 'Epic', chance: 10, multiplier: 10, emoji: '🌈', value: 1000, displayText: 'Epic Rainbow' },
    { name: 'Rare', chance: 20, multiplier: 5, emoji: '⭐', value: 500, displayText: 'Rare Star' },
    { name: 'Uncommon', chance: 30, multiplier: 2, emoji: '🍀', value: 100, displayText: 'Uncommon Clover' },
    { name: 'Common', chance: 25, multiplier: 1, emoji: '🎈', value: 50, displayText: 'Common Balloon' }
];

// Game state
let isSpinning = false;
let balance = 100;
let inventory = {};
let unlockedReels = 3; // Start with 3 reels
let selectedItem = null;

// Firebase initialization
const firebaseConfig = {
    apiKey: "AIzaSyD_TsiHkiF3sbpojB3ZsiVwKeUb6qtcUWc",
    authDomain: "slot-machines-36445.firebaseapp.com",
    projectId: "slot-machines-36445",
    storageBucket: "slot-machines-36445.firebasestorage.app",
    messagingSenderId: "12445326097",
    appId: "1:12445326097:web:bda94e8e7b9a3f40fbcab0",
    measurementId: "G-1YZZS02KXV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('loginPrompt').style.display = 'none';
        document.getElementById('userEmail').textContent = user.email;
        loadUserData();
    } else {
        // User is signed out
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('loginPrompt').style.display = 'block';
        resetToDefaultState();
    }
});

// Load user data from Firestore
async function loadUserData() {
    if (!auth.currentUser) return;
    
    try {
        const doc = await db.collection('users').doc(auth.currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            balance = data.balance || 100;
            inventory = data.inventory || {};
            unlockedReels = data.unlockedReels || 3;
            updateBalance();
            updateUpgradeButton();
            updateInventoryDisplay();
            initializeSlots(); // Reinitialize with correct number of reels
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

// Save game progress to Firestore
async function saveGameProgress() {
    if (!auth.currentUser) return;
    
    try {
        await db.collection('users').doc(auth.currentUser.uid).set({
            balance: balance,
            inventory: inventory,
            unlockedReels: unlockedReels,
            lastUpdated: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("Error saving game progress:", error);
    }
}

// Reset to default state when logged out
function resetToDefaultState() {
    balance = 100;
    inventory = {};
    unlockedReels = 3;
    updateBalance();
    updateUpgradeButton();
    initializeSlots();
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.reload();
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
}

// Initialize the game
function initializeSlots() {
    const slotsContainer = document.querySelector('.slots-container');
    slotsContainer.innerHTML = ''; // Clear existing reels

    // Create reels
    for (let i = 0; i < unlockedReels; i++) {
        const reel = createReel();
        slotsContainer.appendChild(reel);
    }

    // Initialize spin button
    const spinButton = document.getElementById('spinButton');
    spinButton.addEventListener('click', spin);

    // Update displays
    updateBalance();
    updateInventoryDisplay();
}

// Create a single reel
function createReel() {
    const reel = document.createElement('div');
    reel.className = 'slot-reel';
    
    const items = document.createElement('div');
    items.className = 'slot-items';
    
    // Create 4 sets of symbols for smooth infinite loop
    for (let i = 0; i < 4; i++) {
        rarities.forEach(rarity => {
            const item = document.createElement('div');
            item.className = 'slot-item';
            item.innerHTML = `<span class="rarity-emoji">${rarity.emoji}</span>`;
            items.appendChild(item);
        });
    }

    reel.appendChild(items);
    return reel;
}

// Get random rarity based on chances
function getRandomRarity() {
    const totalChance = rarities.reduce((sum, rarity) => sum + rarity.chance, 0);
    let random = Math.random() * totalChance;
    
    for (const rarity of rarities) {
        random -= rarity.chance;
        if (random <= 0) return rarity;
    }
    return rarities[rarities.length - 1];
}

// Constants for spinning
const symbolHeight = 100;
const totalSymbols = rarities.length;
const singleSetHeight = symbolHeight * totalSymbols;

// Spin animation for a single reel
function spinReel(reel) {
    const items = reel.querySelector('.slot-items');
    const result = getRandomRarity();
    
    // Start the infinite spinning animation
    items.style.animation = 'none';
    items.offsetHeight; // Force reflow
    items.style.animation = 'spin 0.5s linear infinite';
    
    // After 2.5 seconds, slow down and stop at the result
    setTimeout(() => {
        const resultIndex = rarities.findIndex(r => r.name === result.name);
        const finalPosition = resultIndex * 100; // 100px per symbol
        
        items.style.animation = 'none';
        items.style.transition = 'transform 0.5s ease-out';
        items.style.transform = `translateY(-${finalPosition}px)`;
        
        flashReelColor(reel, getRarityColor(result.name));
    }, 2500);
    
    return result;
}

// Flash reel with color based on rarity
function flashReelColor(reel, color) {
    reel.style.backgroundColor = color;
    setTimeout(() => {
        reel.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    }, 500);
}

// Get color based on rarity
function getRarityColor(rarityName) {
    const colors = {
        'Mythic': 'rgba(255, 215, 0, 0.5)',
        'Legendary': 'rgba(255, 140, 0, 0.5)',
        'Epic': 'rgba(138, 43, 226, 0.5)',
        'Rare': 'rgba(0, 0, 255, 0.5)',
        'Uncommon': 'rgba(0, 255, 0, 0.5)',
        'Common': 'rgba(255, 255, 255, 0.5)'
    };
    return colors[rarityName] || colors.Common;
}

// Main spin function
function spin() {
    if (isSpinning || balance < SPIN_COST) return;
    
    isSpinning = true;
    balance -= SPIN_COST;
    updateBalance();
    saveGameProgress(); // Save after deducting spin cost
    
    const results = [];
    const activeReels = document.querySelectorAll('.slot-reel');
    
    let delay = 0;
    activeReels.forEach((reel, index) => {
        setTimeout(() => {
            const result = spinReel(reel);
            results.push(result);
            
            if (index === activeReels.length - 1) {
                setTimeout(() => {
                    handleSpinResults(results);
                    isSpinning = false;
                }, 3000);
            }
        }, delay);
        delay += 500;
    });
}

// Handle spin results
function handleSpinResults(results) {
    let winAmount = 0;
    const uniqueResults = new Set(results.map(r => r.name));
    
    // Check for triple joke symbols before normal winning logic
    if (results.length === 3) {
        if (results.every(r => r.name === 'Clown')) {
            showGiantJokeSymbol('clown');
        } else if (results.every(r => r.name === 'Poop')) {
            showGiantJokeSymbol('poop');
        }
    }

    // Add all items to inventory regardless of matches
    results.forEach(result => {
        if (result.name !== 'Clown' && result.name !== 'Poop') { // Don't add joke symbols to inventory
            if (!inventory[result.name]) {
                inventory[result.name] = 0;
            }
            inventory[result.name]++;
            
            // Base reward for getting any item
            const baseReward = Math.floor(result.value * 0.1);
            winAmount += baseReward;
        }
    });

    // Additional bonus for matches (excluding joke symbols)
    if (results.length === 3) {
        const normalResults = results.filter(r => r.name !== 'Clown' && r.name !== 'Poop');
        const uniqueNormal = new Set(normalResults.map(r => r.name));
        
        if (normalResults.length === 3 && uniqueNormal.size === 1) {
            // All three match (normal symbols)
            const tripleBonus = normalResults[0].value * 3;
            winAmount += tripleBonus;
            showWinMessage(`JACKPOT! Triple ${normalResults[0].displayText}! +$${tripleBonus}`);
        } else if (normalResults.length >= 2 && uniqueNormal.size === 1) {
            // Two match (normal symbols)
            const duplicate = normalResults[0];
            const doubleBonus = duplicate.value * 2;
            winAmount += doubleBonus;
            showWinMessage(`Double ${duplicate.displayText}! +$${doubleBonus}`);
        }
    }

    balance += winAmount;
    updateBalance();
    updateInventoryDisplay();
    saveGameProgress();
}

// Show win message
function showWinMessage(message) {
    const winMessage = document.createElement('div');
    winMessage.className = 'win-message';
    winMessage.textContent = message;
    document.body.appendChild(winMessage);
    
    setTimeout(() => {
        winMessage.remove();
    }, 3000);
}

// Update balance display
function updateBalance() {
    document.getElementById('balance').textContent = balance;
    document.getElementById('spinButton').disabled = balance < SPIN_COST;
    updateUpgradeButton();
}

// Add this new function to update inventory display
function updateInventoryDisplay() {
    const inventoryItems = document.getElementById('inventoryItems');
    if (!inventoryItems) return;

    inventoryItems.innerHTML = ''; // Clear current inventory display
    
    // Sort items by rarity (highest value first)
    const sortedItems = Object.entries(inventory)
        .sort((a, b) => {
            const rarityA = rarities.find(r => r.name === a[0]);
            const rarityB = rarities.find(r => r.name === b[0]);
            return (rarityB?.value || 0) - (rarityA?.value || 0);
        })
        .filter(([_, count]) => count > 0); // Only show items with count > 0

    if (sortedItems.length === 0) {
        inventoryItems.innerHTML = '<div class="empty-inventory">No items collected yet!</div>';
        return;
    }

    sortedItems.forEach(([itemName, count]) => {
        const rarity = rarities.find(r => r.name === itemName);
        if (rarity) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.style.backgroundColor = getRarityColor(itemName);
            itemDiv.innerHTML = `
                <span class="item-emoji">${rarity.emoji}</span>
                <span class="item-name">${rarity.displayText}</span>
                <span class="item-count">×${count}</span>
            `;
            itemDiv.onclick = () => openSellModal(itemName);
            inventoryItems.appendChild(itemDiv);
        }
    });
}

// Add these new functions for selling functionality
function openSellModal(itemName) {
    const rarity = rarities.find(r => r.name === itemName);
    const count = inventory[itemName];
    selectedItem = { name: itemName, rarity };
    
    const modal = document.getElementById('sellModal');
    const sellAmount = document.getElementById('sellAmount');
    const sellItemInfo = document.getElementById('sellItemInfo');
    
    sellAmount.max = count;
    sellAmount.value = 1;
    sellItemInfo.innerHTML = `
        ${rarity.emoji} ${rarity.displayText}<br>
        Value: $${rarity.value} each<br>
        Available: ${count}
    `;
    
    updateSellValue();
    modal.style.display = 'flex';
}

function closeSellModal() {
    document.getElementById('sellModal').style.display = 'none';
    selectedItem = null;
}

function updateSellValue() {
    const amount = parseInt(document.getElementById('sellAmount').value) || 0;
    const value = amount * selectedItem.rarity.value;
    document.getElementById('sellValue').textContent = value;
}

async function confirmSell() {
    if (!selectedItem) return;
    
    const amount = parseInt(document.getElementById('sellAmount').value);
    const totalValue = amount * selectedItem.rarity.value;
    
    if (amount > inventory[selectedItem.name]) {
        showWinMessage("You don't have enough items!");
        return;
    }
    
    inventory[selectedItem.name] -= amount;
    balance += totalValue;
    
    // Remove the item from inventory if count reaches 0
    if (inventory[selectedItem.name] <= 0) {
        delete inventory[selectedItem.name];
    }
    
    updateBalance();
    updateInventoryDisplay();
    await saveGameProgress();
    
    showWinMessage(`Sold ${amount}x ${selectedItem.rarity.displayText} for $${totalValue}!`);
    closeSellModal();
}

// Add this function to calculate upgrade cost
function getUpgradeCost() {
    if (unlockedReels >= MAX_REELS) return null;
    return REEL_UPGRADE_BASE_COST * Math.pow(2, unlockedReels - 3);
}

// Add this function to handle upgrades
function upgradeReels() {
    const upgradeCost = getUpgradeCost();
    if (!upgradeCost || balance < upgradeCost || unlockedReels >= MAX_REELS) return;
    
    balance -= upgradeCost;
    unlockedReels++;
    
    updateBalance();
    updateUpgradeButton();
    initializeSlots(); // Reinitialize with new reel
    saveGameProgress();
    
    showWinMessage(`Upgraded to ${unlockedReels} reels!`);
}

// Add this function to update the upgrade button
function updateUpgradeButton() {
    const upgradeButton = document.getElementById('upgradeButton');
    if (!upgradeButton) return;
    
    const upgradeCost = getUpgradeCost();
    if (!upgradeCost || unlockedReels >= MAX_REELS) {
        upgradeButton.style.display = 'none';
        return;
    }
    
    upgradeButton.style.display = 'block';
    upgradeButton.textContent = `Unlock Reel (${unlockedReels + 1}/${MAX_REELS}) - $${upgradeCost}`;
    upgradeButton.disabled = balance < upgradeCost;
}

// Add event listener for sell amount changes
document.addEventListener('DOMContentLoaded', () => {
    initializeSlots();
    updateInventoryDisplay(); // Initial inventory display
    
    const sellAmount = document.getElementById('sellAmount');
    if (sellAmount) {
        sellAmount.addEventListener('input', updateSellValue);
    }

    const upgradeButton = document.getElementById('upgradeButton');
    if (upgradeButton) {
        upgradeButton.addEventListener('click', upgradeReels);
    }

    updateUpgradeButton();
});
// Add the giant joke symbol function
function showGiantJokeSymbol(type) {
    const config = {
        clown: {
            emoji: '🤡',
            text: 'HONK HONK!',
            background: 'rgba(255, 192, 203, 0.9)',
            textColor: '#ff4444'
        },
        poop: {
            emoji: '💩',
            text: 'OH POOP!',
            background: 'rgba(139, 69, 19, 0.9)',
            textColor: '#8B4513'
        }
    };

    const symbol = config[type];
    const overlay = document.createElement('div');
    overlay.className = 'giant-joke-symbol';
    overlay.style.backgroundColor = symbol.background;
    
    overlay.innerHTML = `
        <div class="joke-content">
            <div class="giant-emoji">${symbol.emoji}</div>
            <div class="joke-text" style="color: ${symbol.textColor}">${symbol.text}</div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Add some silly sound effects
    const sound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA');
    sound.play().catch(() => {}); // Ignore if browser blocks autoplay

    // Make the symbol dance
    const dance = overlay.animate([
        { transform: 'rotate(-5deg) scale(1)' },
        { transform: 'rotate(5deg) scale(1.1)' },
        { transform: 'rotate(-5deg) scale(1)' }
    ], {
        duration: 500,
        iterations: 6
    });

    // Remove after animation
    setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 1000);
    }, 3000);
}
