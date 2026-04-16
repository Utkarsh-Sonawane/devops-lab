// main.js

// State
let isSignupMode = false;
let currentLab = null;
let labActive = false;
let timerInterval = null;
let secondsActive = 0;

// API Base
const API_BASE = 'http://localhost:8081/api';

// DOM Elements
const views = {
    auth: document.getElementById('auth-view'),
    dashboard: document.getElementById('dashboard-view'),
    lab: document.getElementById('lab-view')
};

// Auth Elements
const authForm = document.getElementById('auth-form');
const authSubmitBtn = document.getElementById('auth-submit');
const toggleAuthBtn = document.getElementById('toggle-auth');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Lab Elements
const startLabBtn = document.getElementById('start-lab-btn');
const endLabBtn = document.getElementById('end-lab-btn');
const timerDisplay = document.getElementById('lab-timer');
const instructionsArea = document.getElementById('lab-instructions');
const labTitle = document.getElementById('lab-title');
const labIcon = document.getElementById('lab-icon');
const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');
const terminalOverlay = document.getElementById('terminal-overlay');
const terminalTitle = document.getElementById('terminal-title');
const cmdPrompt = document.getElementById('cmd-prompt');

// Instructions Data
const labData = {
    linux: {
        title: "Linux Administration",
        icon: "fa-brands fa-linux text-orange-400",
        prompt: "root@linux-server:~# ",
        steps: [
            { title: "Step 1: Check System Info", desc: "Use the <code>uname -a</code> command to verify the kernel version." },
            { title: "Step 2: File Navigation", desc: "List all hidden files in the home directory using <code>ls -la</code>." },
            { title: "Step 3: Process Management", desc: "View running processes continuously using <code>top</code> or <code>htop</code>." }
        ]
    },
    docker: {
        title: "Docker Containers",
        icon: "fa-brands fa-docker text-blue-400",
        prompt: "docker@daemon:~$ ",
        steps: [
            { title: "Step 1: Verify Installation", desc: "Run <code>docker --version</code> to ensure the daemon is running." },
            { title: "Step 2: Pull an Image", desc: "Pull the latest nginx image with <code>docker pull nginx:latest</code>." },
            { title: "Step 3: Run a Container", desc: "Start an interactive ubuntu container using <code>docker run -it ubuntu bash</code>." }
        ]
    },
    kubernetes: {
        title: "Kubernetes Orchestration",
        icon: "fa-solid fa-dharmachakra text-indigo-400",
        prompt: "k8s-admin@cluster:~$ ",
        steps: [
            { title: "Step 1: Cluster Nodes", desc: "Check the status of your nodes using <code>kubectl get nodes</code>." },
            { title: "Step 2: Deploy a Pod", desc: "Create a simple nginx pod with <code>kubectl run my-nginx --image=nginx</code>." },
            { title: "Step 3: Expose Service", desc: "Expose the pod on port 80 to test internal routing: <code>kubectl expose pod my-nginx --port=80</code>." }
        ]
    },
    terraform: {
        title: "Terraform IaC",
        icon: "fa-solid fa-layer-group text-pink-400",
        prompt: "terraform@workspace:~$ ",
        steps: [
            { title: "Step 1: Initialize", desc: "Run <code>terraform init</code> to prepare your workspace." },
            { title: "Step 2: Plan Changes", desc: "Execute <code>terraform plan</code> to see what infrastructure will be created." },
            { title: "Step 3: Apply Configuration", desc: "Use <code>terraform apply -auto-approve</code> to provision the resources." }
        ]
    }
};

// Switch Views Function
function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

// Authentication Handlers
toggleAuthBtn.addEventListener('click', () => {
    isSignupMode = !isSignupMode;
    authSubmitBtn.textContent = isSignupMode ? 'Create Account' : 'Sign In to Workspace';
    toggleAuthBtn.textContent = isSignupMode ? 'Already have an account? Sign In' : 'Need an account? Sign up';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = isSignupMode ? '/signup' : '/login';
    const email = emailInput.value;
    
    // Disable form
    authSubmitBtn.disabled = true;
    authSubmitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify({ email: email, password: passwordInput.value })
        });
        
        const data = await response.json();
        
        if(data.status === 'success') {
            document.getElementById('user-greeting').textContent = `User: ${email}`;
            showView('dashboard');
        }
    } catch(err) {
        console.error("Auth error", err);
        alert("Failed to connect to backend server. Make sure it's running.");
    } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = isSignupMode ? 'Create Account' : 'Sign In to Workspace';
    }
});

// Logout Handler
document.getElementById('logout-btn').addEventListener('click', () => {
    emailInput.value = '';
    passwordInput.value = '';
    showView('auth');
});

// Select Lab Handler
window.selectLab = (labKey) => {
    currentLab = labData[labKey];
    
    // Setup UI for this lab
    labTitle.textContent = currentLab.title;
    labIcon.className = `fa-solid ${currentLab.icon} text-xl`;
    terminalTitle.textContent = `${currentLab.title.toLowerCase().split(' ')[0]}-instance`;
    cmdPrompt.textContent = currentLab.prompt;
    
    // Populate instructions
    instructionsArea.innerHTML = currentLab.steps.map((step, idx) => `
        <div class="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
            <h4 class="font-bold text-cyan-400 mb-2 flex items-center max-w-full"><span class="w-6 h-6 rounded-full bg-cyan-900 text-cyan-300 text-xs flex items-center justify-center mr-2 shrink-0">${idx+1}</span> ${step.title}</h4>
            <p class="text-slate-300 text-sm leading-relaxed">${step.desc}</p>
        </div>
    `).join('');
    
    // Reset lab state
    resetLabState();
    
    showView('lab');
};

// Start Lab API
startLabBtn.addEventListener('click', async () => {
    startLabBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Starting...';
    startLabBtn.disabled = true;
    
    try {
        await fetch(`${API_BASE}/start-lab`);
        
        // Lab started
        labActive = true;
        
        terminalOverlay.classList.add('hidden');
        terminalInput.disabled = false;
        terminalInput.placeholder = "Type your commands here...";
        terminalInput.focus();
        
        startLabBtn.classList.add('hidden');
        endLabBtn.classList.remove('hidden');
        
        appendTerminalOutput(`Welcome to ${currentLab.title}. System initialized.`, 'text-cyan-400');
        
        // Start timer
        startTimer();
    } catch(err) {
        console.error(err);
        startLabBtn.innerHTML = 'Start Lab instance';
        startLabBtn.disabled = false;
    }
});

// End Lab API
endLabBtn.addEventListener('click', async () => {
    endLabBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Stopping...';
    
    try {
        await fetch(`${API_BASE}/end-lab`);
        resetLabState();
        showView('dashboard');
    } catch(err) {
        console.error(err);
        endLabBtn.innerHTML = 'End Lab Session';
    }
});

// Utility: Timer
function startTimer() {
    secondsActive = 0;
    timerInterval = setInterval(() => {
        secondsActive++;
        const h = Math.floor(secondsActive / 3600).toString().padStart(2, '0');
        const m = Math.floor((secondsActive % 3600) / 60).toString().padStart(2, '0');
        const s = (secondsActive % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${h}:${m}:${s}`;
    }, 1000);
}

function resetLabState() {
    labActive = false;
    clearInterval(timerInterval);
    timerDisplay.textContent = '00:00:00';
    
    startLabBtn.innerHTML = 'Start Lab instance';
    startLabBtn.disabled = false;
    startLabBtn.classList.remove('hidden');
    endLabBtn.classList.add('hidden');
    endLabBtn.innerHTML = 'End Lab Session';
    
    terminalOverlay.classList.remove('hidden');
    terminalInput.disabled = true;
    terminalInput.value = '';
    terminalInput.placeholder = "Start the lab instance to enable terminal...";
    
    terminalOutput.innerHTML = `
        <div class="text-slate-500">Connecting to instance...</div>
        <div class="text-green-400 mb-4">Instance ready. Type commands to interact.</div>
    `;
}

// Terminal Mock Logic
function appendTerminalOutput(text, colorClass = "text-slate-300") {
    const div = document.createElement('div');
    div.className = `mb-1 ${colorClass}`;
    div.innerHTML = text; // using innerHTML temporarily to allow mock formatting
    terminalOutput.appendChild(div);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = terminalInput.value.trim();
        terminalInput.value = '';
        
        // Echo command
        appendTerminalOutput(`<span class="text-cyan-400">${currentLab.prompt}</span> ${cmd}`);
        
        if(cmd) {
            // Mock response
            setTimeout(() => {
                if (cmd === 'clear') {
                    terminalOutput.innerHTML = '';
                } else if(cmd.startsWith('docker') || cmd.startsWith('kubectl') || cmd.startsWith('ls') || cmd.startsWith('uname') || cmd.startsWith('terraform')) {
                    appendTerminalOutput(`Output mocked for command: ${cmd}`, 'text-slate-400');
                } else {
                    appendTerminalOutput(`bash: ${cmd}: command not found`, 'text-red-400');
                }
            }, 300);
        }
    }
});