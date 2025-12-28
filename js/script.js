window.addEventListener('load', function() {
  // Initialize Web Audio API
  let audioContext = null;
  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  function playSound(frequency, duration, type = 'sine', volume = 0.3) {
    initAudio();
    if (audioContext) {
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (e) {
        console.warn('Audio not supported');
      }
    }
  }

  function playClick() {
    playSound(200, 0.1, 'square', 0.2); // Low mechanical click
  }

  function playCoin() {
    playSound(800, 0.15, 'sine', 0.4); // High coin sound
  }

  function playInsertCoin() {
    setTimeout(() => playSound(1000, 0.1, 'sine', 0.5), 0);
    setTimeout(() => playSound(1200, 0.1, 'sine', 0.5), 100);
    setTimeout(() => playSound(1400, 0.1, 'sine', 0.5), 200);
  }

  function playDispense() {
    playSound(150, 0.3, 'sawtooth', 0.3); // Mechanical
    setTimeout(() => playSound(1000, 0.1, 'sine', 0.4), 300);
    setTimeout(() => playSound(1200, 0.1, 'sine', 0.4), 400);
    setTimeout(() => playSound(1400, 0.1, 'sine', 0.4), 500);
  }

  let secretCode = [];
  const secretSequence = ['A1', 'B2', 'C1'];
  let selectedItem = null;
  let currentAmount = 0;

  function updatePaymentDisplay() {
    document.getElementById('payment-amount').textContent = '$ ' + currentAmount.toFixed(2);
  }

  function showError(message) {
    const forPaymentDiv = document.getElementById('for-payment');
    const originalHTML = '<div class="flex items-center justify-between mb-2"><span class="pixel-font text-red-500 text-[8px]">PAYMENT</span><span id="payment-amount" class="pixel-font text-red-500 text-[8px]">$ 0</span></div>';
    forPaymentDiv.innerHTML = '<div class="flex items-center justify-center"><span class="pixel-font text-red-400 text-[10px]">' + message + '</span></div>';
    setTimeout(() => {
      forPaymentDiv.innerHTML = originalHTML;
      updatePaymentDisplay();
    }, 2000);
  }

  document.querySelectorAll('.snack-slot').forEach(slot => {
    slot.addEventListener('click', function() {
      if (this.classList.contains('opacity-50')) return;

      // Prevent selection during purchase process
      const insertCoinBtn = document.getElementById('insert-coin-btn');
      if (insertCoinBtn.disabled) return;

      playClick(); // Sound for selecting item

      const code = this.dataset.code;
      const price = this.dataset.price;
      const emoji = this.querySelector('div').textContent;
      const name = this.querySelector('.text-white').textContent;

      selectedItem = {
        code,
        price,
        emoji,
        name
      };

      secretCode.push(code);
      if (secretCode.length > 3) secretCode.shift();

      if (JSON.stringify(secretCode) === JSON.stringify(secretSequence)) {
        document.getElementById('secret-code-display').classList.remove('hidden');
        secretCode = [];
      }

      document.querySelectorAll('.snack-slot').forEach(s => s.classList.remove('ring-2', 'ring-yellow-400'));
      this.classList.add('ring-2', 'ring-yellow-400');
    });
  });

  document.querySelectorAll('.coin-slot').forEach(btn => {
    btn.addEventListener('click', function() {
      playCoin(); // Sound for inserting coin

      const amount = this.dataset.amount;
      currentAmount += parseFloat(amount);
      updatePaymentDisplay();

      const coin = document.createElement('div');
      coin.className = 'coin-drop absolute text-3xl';
      coin.textContent = '💰';
      coin.style.left = this.offsetLeft + 'px';
      coin.style.top = this.offsetTop + 'px';
      document.getElementById('vending-machine').appendChild(coin);

      setTimeout(() => coin.remove(), 1000);
    });
  });

  const insertCoinBtn = document.getElementById('insert-coin-btn');

  insertCoinBtn.addEventListener('click', function() {
    if (!selectedItem || insertCoinBtn.disabled) {
      showError('PLEASE SELECT A SNACK FIRST!');
      return;
    }

    if (currentAmount < parseFloat(selectedItem.price)) {
      showError('INSUFFICIENT FUNDS!');
      return;
    }

    // Disable button and store item before processing
    insertCoinBtn.disabled = true;
    const itemToPurchase = selectedItem;
    selectedItem = null; // Reset immediately

    currentAmount -= parseFloat(itemToPurchase.price);

    playInsertCoin(); // Sound for purchase

    // Create falling item animation
    const activeSlot = document.querySelector('.snack-slot.ring-2.ring-yellow-400');
    if (activeSlot) {
      const fallingItem = document.createElement('div');
      fallingItem.textContent = itemToPurchase.emoji;
      fallingItem.className = 'absolute text-3xl item-fall';
      const rect = activeSlot.getBoundingClientRect();
      const containerRect = document.getElementById('vending-machine').getBoundingClientRect();
      fallingItem.style.left = (rect.left - containerRect.left) + 'px';
      fallingItem.style.top = (rect.top - containerRect.top) + 'px';
      document.getElementById('vending-machine').appendChild(fallingItem);
      setTimeout(() => fallingItem.remove(), 600);
    }

    const forPaymentDiv = document.getElementById('for-payment');
    const originalHTML = '<div class="flex items-center justify-between mb-2"><span class="pixel-font text-red-500 text-[8px]">FOR PAYMENT</span><span id="payment-amount" class="pixel-font text-red-500 text-[8px]">$ 0</span></div>';
    forPaymentDiv.innerHTML = '<div class="flex items-center justify-center"><span class="pixel-font text-green-400 text-[12px]">THANK YOU!</span></div>';

    setTimeout(() => {
      forPaymentDiv.innerHTML = originalHTML;
      updatePaymentDisplay();

      playDispense(); // Sound for dispensing

      // Show item in payment display
      forPaymentDiv.innerHTML = '<div class="flex items-center justify-center flex-col">' + itemToPurchase.emoji + '</div>';

      // Remove selection highlight immediately
      document.querySelectorAll('.snack-slot').forEach(s => s.classList.remove('ring-2', 'ring-yellow-400'));

      createConfetti();

      // Reset payment display and re-enable button after some time
      setTimeout(() => {
         forPaymentDiv.innerHTML = originalHTML;
         updatePaymentDisplay();
         insertCoinBtn.disabled = false; // Re-enable button
      }, 5000);
    }, 600);
  });

  function createConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti absolute text-xl';
      confetti.textContent = ['🎉', '✨', '⭐', '💫'][Math.floor(Math.random() * 4)];
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-20px';
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      container.appendChild(confetti);

      setTimeout(() => confetti.remove(), 2000);
    }
  }

  window.closeSecret = function() {
    document.getElementById('secret-code-display').classList.add('hidden');

    // Unlock Lamborghini slot
    const lamboSlot = document.querySelector('[data-code="C3"]');
    if (lamboSlot) {
      lamboSlot.classList.remove('opacity-50');
      const priceDiv = lamboSlot.querySelector('.pixel-font.text-gray-400');
      priceDiv.classList.remove('text-gray-400', 'line-through');
      priceDiv.classList.add('text-red-500');
      const soldOutDiv = lamboSlot.querySelector('.pixel-font.text-red-500.text-[6px]');
      soldOutDiv.textContent = '';
    }
  };
});