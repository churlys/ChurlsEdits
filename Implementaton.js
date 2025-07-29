// Process class
class Process {
    constructor(id, arrivalTime, burstTime) {
        this.id = id;
        this.arrivalTime = parseInt(arrivalTime);
        this.burstTime = parseInt(burstTime);
        this.remainingTime = parseInt(burstTime);
        this.startTime = -1;
        this.finishTime = -1;
        this.waitingTime = 0;
        this.responseTime = -1;
        this.turnaroundTime = 0;
        this.color = this.generateColor();
        this.currentQueue = 0; // For MLFQ tracking
    }
    
    generateColor() {
        // Generate a random color but avoid colors too close to NVIDIA green
        const hue = Math.floor(Math.random() * 360);
        const saturation = 70 + Math.random() * 30;
        const lightness = 40 + Math.random() * 20;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Create a deep copy of this process
    clone() {
        const copy = new Process(this.id, this.arrivalTime, this.burstTime);
        copy.remainingTime = this.remainingTime;
        copy.startTime = this.startTime;
        copy.finishTime = this.finishTime;
        copy.waitingTime = this.waitingTime;
        copy.responseTime = this.responseTime;
        copy.turnaroundTime = this.turnaroundTime;
        copy.color = this.color;
        copy.currentQueue = this.currentQueue;
        return copy;
    }
}

// Scheduler class
class Scheduler {
    constructor() {
        this.processes = [];
        this.timeQuantum = 2;
        this.mlfqQuantums = [2, 4, 8, 16]; // Default time quantums for MLFQ queues
        this.currentAlgorithm = 'fcfs';
        this.ganttChart = [];
        this.currentTime = 0;
        this.isRunning = false;
        this.nextProcessId = 1; // Track the next available process ID
        this.debugMode = false; // Set to true to enable console logging
        this.completedProcesses = []; // Store completed processes for results
    }
    
    log(message) {
        if (this.debugMode) {
            console.log(message);
        }
    }
    
    getNextProcessId() {
        // Find the highest process ID number
        let maxId = 0;
        this.processes.forEach(process => {
            const idNum = parseInt(process.id.replace('P', ''));
            if (!isNaN(idNum) && idNum > maxId) {
                maxId = idNum;
            }
        });
        
        // Return the next sequential ID
        return `P${maxId + 1}`;
    }
    
    updateNextProcessIdInput() {
        document.getElementById('processId').value = this.getNextProcessId();
    }
    
    addProcess(process) {
        this.processes.push(process);
        this.updateProcessTable();
        this.updateNextProcessIdInput();
    }
    
    removeProcess(id) {
        this.processes = this.processes.filter(p => p.id !== id);
        this.updateProcessTable();
        this.updateNextProcessIdInput();
    }
    
    clearProcesses() {
        this.processes = [];
        this.nextProcessId = 1;
        this.updateProcessTable();
        this.updateNextProcessIdInput();
        this.resetSimulation();
    }
    
    updateProcess(id, field, value) {
        const process = this.processes.find(p => p.id === id);
        if (process) {
            if (field === 'id') {
                // Process IDs are now auto-assigned and sequential
                // We don't allow changing them
                return false;
            } else if (field === 'arrivalTime') {
                process.arrivalTime = parseInt(value);
            } else if (field === 'burstTime') {
                process.burstTime = parseInt(value);
                process.remainingTime = parseInt(value);
            }
            return true;
        }
        return false;
    }
    
    updateProcessTable() {
        const tableBody = document.getElementById('processTableBody');
        tableBody.innerHTML = '';
        
        // Sort processes by ID for display
        const sortedProcesses = [...this.processes].sort((a, b) => {
            const idA = parseInt(a.id.replace('P', ''));
            const idB = parseInt(b.id.replace('P', ''));
            return idA - idB;
        });
        
        sortedProcesses.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="editable-cell" contenteditable="false" data-id="${process.id}" data-field="id">${process.id}</div>
                </td>
                <td>
                    <div class="editable-cell" contenteditable="true" data-id="${process.id}" data-field="arrivalTime">${process.arrivalTime}</div>
                </td>
                <td>
                    <div class="editable-cell" contenteditable="true" data-id="${process.id}" data-field="burstTime">${process.burstTime}</div>
                </td>
                <td>
                    <button class="delete-btn" data-id="${process.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                this.removeProcess(id);
            });
        });
        
        // Add event listeners to editable cells
        document.querySelectorAll('.editable-cell').forEach(cell => {
            if (cell.getAttribute('data-field') === 'id') {
                // Process IDs are not editable
                return;
            }
            
            cell.addEventListener('blur', (e) => {
                const id = e.target.getAttribute('data-id');
                const field = e.target.getAttribute('data-field');
                const value = e.target.textContent.trim();
                
                if (value === '') {
                    alert('Value cannot be empty!');
                    e.target.textContent = e.target.getAttribute('data-original-value') || '';
                    return;
                }
                
                if ((field === 'arrivalTime' || field === 'burstTime') && 
                    (isNaN(parseInt(value)) || parseInt(value) < 0)) {
                    alert('Please enter a valid non-negative number!');
                    e.target.textContent = e.target.getAttribute('data-original-value') || '';
                    return;
                }
                
                if (field === 'burstTime' && parseInt(value) === 0) {
                    alert('Burst time must be greater than 0!');
                    e.target.textContent = e.target.getAttribute('data-original-value') || '';
                    return;
                }
                
                const success = this.updateProcess(id, field, value);
                if (!success) {
                    e.target.textContent = e.target.getAttribute('data-original-value') || '';
                }
            });
            
            cell.addEventListener('focus', (e) => {
                e.target.setAttribute('data-original-value', e.target.textContent);
            });
            
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });
    }
    
    generateRandomProcesses(count) {
        for (let i = 0; i < count; i++) {
            // Get the next sequential process ID
            const id = this.getNextProcessId();
            
            // Generate random parameters
            const arrivalTime = Math.floor(Math.random() * 10);
            const burstTime = Math.floor(Math.random() * 10) + 1; // Ensure burst time is at least 1
            
            this.addProcess(new Process(id, arrivalTime, burstTime));
        }
    }
    
    setAlgorithm(algorithm) {
        this.currentAlgorithm = algorithm;
        this.updateAlgorithmDescription();
        this.showAlgorithmSettings();
    }
    
    showAlgorithmSettings() {
        // Hide all algorithm settings
        document.querySelectorAll('.algorithm-settings').forEach(setting => {
            setting.classList.remove('active');
        });
        
        // Show settings for the current algorithm
        if (this.currentAlgorithm === 'rr') {
            document.getElementById('rr-settings').classList.add('active');
        } else if (this.currentAlgorithm === 'mlfq') {
            document.getElementById('mlfq-settings').classList.add('active');
        }
    }
    
    updateAlgorithmDescription() {
        const descriptionDiv = document.getElementById('algorithmDescription');
        
        switch(this.currentAlgorithm) {
            case 'fcfs':
                descriptionDiv.innerHTML = `
                    <h3>First-In First-Out (FIFO / FCFS)</h3>
                    <p>Processes are executed in the order they arrive in the ready queue. Simple but can lead to the "convoy effect" where short processes wait for long ones.</p>
                `;
                break;
            case 'sjf':
                descriptionDiv.innerHTML = `
                    <h3>Shortest Job First (SJF) - Non-Preemptive</h3>
                    <p>Selects the process with the smallest burst time from the ready queue. Once a process starts executing, it runs to completion.</p>
                `;
                break;
            case 'srtf':
                descriptionDiv.innerHTML = `
                    <h3>Shortest Remaining Time First (SRTF) - Preemptive</h3>
                    <p>Preemptive version of SJF. If a new process arrives with a burst time less than the remaining time of the current process, the current process is preempted.</p>
                `;
                break;
            case 'rr':
                descriptionDiv.innerHTML = `
                    <h3>Round Robin (RR)</h3>
                    <p>Each process is assigned a fixed time slice (time quantum). After this time has elapsed, the process is preempted and added to the end of the ready queue.</p>
                `;
                break;
            case 'mlfq':
                // Filter out queues with zero time quantum
                const activeQueues = this.mlfqQuantums
                    .map((q, i) => ({ quantum: q, index: i }))
                    .filter(q => q.quantum > 0);
                
                let queueDescription = '';
                if (activeQueues.length > 0) {
                    queueDescription = '<ul style="list-style-type: disc; padding-left: 1.25rem; margin-top: 0.25rem;">';
                    activeQueues.forEach(q => {
                        queueDescription += `<li>Queue ${q.index}: ${q.index === 0 ? 'Highest' : q.index === activeQueues.length - 1 ? 'Lowest' : 'Medium'} priority, Time Quantum = ${q.quantum}</li>`;
                    });
                    queueDescription += '</ul>';
                } else {
                    queueDescription = '<p style="margin-top: 0.5rem; color: #ef4444;">Warning: No active queues defined! Please set at least one queue with a non-zero time quantum.</p>';
                }
                
                descriptionDiv.innerHTML = `
                    <h3>Multilevel Feedback Queue (MLFQ)</h3>
                    <p>Uses multiple levels of queues with different priorities. Processes move between queues based on their behavior and CPU bursts. Combines benefits of RR and priority scheduling.</p>
                    <p style="margin-top: 0.5rem;">In this implementation:</p>
                    ${queueDescription}
                    <p style="margin-top: 0.5rem;">Processes start in the highest priority queue and move to lower priority queues if they use their full time quantum.</p>
                `;
                break;
        }
    }
    
    setTimeQuantum(quantum) {
        this.timeQuantum = parseInt(quantum);
    }
    
    setMLFQQuantums(q0, q1, q2, q3) {
        this.mlfqQuantums = [
            parseInt(q0),
            parseInt(q1),
            parseInt(q2),
            parseInt(q3)
        ];
        this.updateAlgorithmDescription();
    }
    
    resetSimulation() {
        this.ganttChart = [];
        this.currentTime = 0;
        this.isRunning = false;
        this.completedProcesses = [];
        
        // Reset process states
        this.processes.forEach(process => {
            process.remainingTime = process.burstTime;
            process.startTime = -1;
            process.finishTime = -1;
            process.waitingTime = 0;
            process.responseTime = -1;
            process.turnaroundTime = 0;
            process.currentQueue = 0;
        });
        
        // Clear UI
        document.getElementById('ganttChart').innerHTML = '';
        document.getElementById('resultsTableBody').innerHTML = '';
        document.getElementById('avgWaitingTime').textContent = '0.00';
        document.getElementById('avgTurnaroundTime').textContent = '0.00';
        document.getElementById('avgResponseTime').textContent = '0.00';
        document.getElementById('currentTime').textContent = '0';
        document.getElementById('runningProcess').textContent = 'None';
        document.getElementById('readyQueue').textContent = 'Empty';
    }
    
    runSimulation() {
        if (this.processes.length === 0) {
            alert('Please add at least one process first!');
            return;
        }
        
        // For MLFQ, validate that at least one queue has a non-zero time quantum
        if (this.currentAlgorithm === 'mlfq') {
            const hasActiveQueue = this.mlfqQuantums.some(q => q > 0);
            if (!hasActiveQueue) {
                alert('MLFQ requires at least one queue with a non-zero time quantum!');
                return;
            }
        }
        
        this.resetSimulation();
        this.isRunning = true;
        
        // Create deep copies of processes to avoid modifying the originals
        const processesCopy = this.processes.map(p => p.clone());
        
        // Sort processes by arrival time
        const sortedProcesses = [...processesCopy].sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        switch(this.currentAlgorithm) {
            case 'fcfs':
                this.runFCFS(sortedProcesses);
                break;
            case 'sjf':
                this.runSJF(sortedProcesses);
                break;
            case 'srtf':
                this.runSRTF(sortedProcesses);
                break;
            case 'rr':
                this.runRR(sortedProcesses);
                break;
            case 'mlfq':
                this.runMLFQ(sortedProcesses);
                break;
        }
        
        this.updateGanttChart();
        this.calculateMetrics(this.completedProcesses);
        this.updateResultsTable(this.completedProcesses);
    }
    
    runFCFS(processes) {
        let currentTime = 0;
        const readyQueue = [];
        this.completedProcesses = [];
        
        while (processes.length > 0 || readyQueue.length > 0) {
            // Add processes that have arrived to the ready queue
            while (processes.length > 0 && processes[0].arrivalTime <= currentTime) {
                readyQueue.push(processes.shift());
            }
            
            if (readyQueue.length === 0) {
                // No process in ready queue, advance time to next arrival
                currentTime = processes[0].arrivalTime;
                continue;
            }
            
            // Get the first process from the ready queue
            const currentProcess = readyQueue.shift();
            
            // If this is the first time the process runs, set its response time
            if (currentProcess.responseTime === -1) {
                currentProcess.responseTime = currentTime - currentProcess.arrivalTime;
            }
            
            // Set start time if not set
            if (currentProcess.startTime === -1) {
                currentProcess.startTime = currentTime;
            }
            
            // Add to Gantt chart
            this.ganttChart.push({
                processId: currentProcess.id,
                startTime: currentTime,
                endTime: currentTime + currentProcess.remainingTime,
                color: currentProcess.color
            });
            
            // Update current time
            currentTime += currentProcess.remainingTime;
            
            // Process is complete
            currentProcess.remainingTime = 0;
            currentProcess.finishTime = currentTime;
            this.completedProcesses.push(currentProcess);
        }
    }
    
    runSJF(processes) {
        let currentTime = 0;
        const readyQueue = [];
        this.completedProcesses = [];
        
        while (processes.length > 0 || readyQueue.length > 0) {
            // Add processes that have arrived to the ready queue
            while (processes.length > 0 && processes[0].arrivalTime <= currentTime) {
                readyQueue.push(processes.shift());
            }
            
            if (readyQueue.length === 0) {
                // No process in ready queue, advance time to next arrival
                currentTime = processes[0].arrivalTime;
                continue;
            }
            
            // Sort ready queue by burst time (shortest first)
            readyQueue.sort((a, b) => a.burstTime - b.burstTime);
            
            // Get the process with shortest burst time
            const currentProcess = readyQueue.shift();
            
            // If this is the first time the process runs, set its response time
            if (currentProcess.responseTime === -1) {
                currentProcess.responseTime = currentTime - currentProcess.arrivalTime;
            }
            
            // Set start time if not set
            if (currentProcess.startTime === -1) {
                currentProcess.startTime = currentTime;
            }
            
            // Add to Gantt chart
            this.ganttChart.push({
                processId: currentProcess.id,
                startTime: currentTime,
                endTime: currentTime + currentProcess.remainingTime,
                color: currentProcess.color
            });
            
            // Update current time
            currentTime += currentProcess.remainingTime;
            
            // Process is complete
            currentProcess.remainingTime = 0;
            currentProcess.finishTime = currentTime;
            this.completedProcesses.push(currentProcess);
        }
    }
    
    runSRTF(processes) {
        let currentTime = 0;
        const readyQueue = [];
        this.completedProcesses = [];
        let currentProcess = null;
        
        while (processes.length > 0 || readyQueue.length > 0 || currentProcess) {
            // Add processes that have arrived to the ready queue
            while (processes.length > 0 && processes[0].arrivalTime <= currentTime) {
                readyQueue.push(processes.shift());
            }
            
            // Check if we need to preempt the current process
            if (currentProcess && readyQueue.length > 0) {
                readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
                if (readyQueue[0].remainingTime < currentProcess.remainingTime) {
                    readyQueue.push(currentProcess);
                    currentProcess = null;
                }
            }
            
            // If no current process, get the one with shortest remaining time
            if (!currentProcess) {
                if (readyQueue.length === 0) {
                    // No process in ready queue, advance time to next arrival
                    if (processes.length > 0) {
                        currentTime = processes[0].arrivalTime;
                    } else {
                        break;
                    }
                    continue;
                }
                
                readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
                currentProcess = readyQueue.shift();
                
                // If this is the first time the process runs, set its response time
                if (currentProcess.responseTime === -1) {
                    currentProcess.responseTime = currentTime - currentProcess.arrivalTime;
                }
                
                // Set start time if not set
                if (currentProcess.startTime === -1) {
                    currentProcess.startTime = currentTime;
                }
            }
            
            // Determine how long the current process will run
            let runUntil = currentTime + currentProcess.remainingTime;
            
            // Check if a new process will arrive before this one finishes
            if (processes.length > 0 && processes[0].arrivalTime < runUntil) {
                runUntil = processes[0].arrivalTime;
            }
            
            // Add to Gantt chart
            if (runUntil > currentTime) {
                this.ganttChart.push({
                    processId: currentProcess.id,
                    startTime: currentTime,
                    endTime: runUntil,
                    color: currentProcess.color
                });
                
                // Update remaining time
                currentProcess.remainingTime -= (runUntil - currentTime);
                currentTime = runUntil;
                
                // Check if process is complete
                if (currentProcess.remainingTime <= 0) {
                    currentProcess.finishTime = currentTime;
                    this.completedProcesses.push(currentProcess);
                    currentProcess = null;
                }
            } else {
                // Edge case: time didn't advance
                currentTime++;
            }
        }
    }
    
    runRR(processes) {
        let currentTime = 0;
        const readyQueue = [];
        this.completedProcesses = [];
        
        while (processes.length > 0 || readyQueue.length > 0) {
            // Add processes that have arrived to the ready queue
            while (processes.length > 0 && processes[0].arrivalTime <= currentTime) {
                readyQueue.push(processes.shift());
            }
            
            if (readyQueue.length === 0) {
                // No process in ready queue, advance time to next arrival
                currentTime = processes[0].arrivalTime;
                continue;
            }
            
            // Get the next process from the ready queue
            const currentProcess = readyQueue.shift();
            
            // If this is the first time the process runs, set its response time
            if (currentProcess.responseTime === -1) {
                currentProcess.responseTime = currentTime - currentProcess.arrivalTime;
            }
            
            // Set start time if not set
            if (currentProcess.startTime === -1) {
                currentProcess.startTime = currentTime;
            }
            
            // Determine how long this process will run
            const timeSlice = Math.min(this.timeQuantum, currentProcess.remainingTime);
            
            // Add to Gantt chart
            this.ganttChart.push({
                processId: currentProcess.id,
                startTime: currentTime,
                endTime: currentTime + timeSlice,
                color: currentProcess.color
            });
            
            // Update current time and remaining time
            currentTime += timeSlice;
            currentProcess.remainingTime -= timeSlice;
            
            // Add newly arrived processes to ready queue
            while (processes.length > 0 && processes[0].arrivalTime <= currentTime) {
                readyQueue.push(processes.shift());
            }
            
            // Check if process is complete
            if (currentProcess.remainingTime <= 0) {
                currentProcess.finishTime = currentTime;
                this.completedProcesses.push(currentProcess);
            } else {
                // Put the process back in the ready queue
                readyQueue.push(currentProcess);
            }
        }
    }
    
    runMLFQ(processes) {
        let currentTime = 0;
        
        // Create queues with different time quantums, filtering out disabled queues (quantum = 0)
        const queues = this.mlfqQuantums
            .map((quantum, index) => ({ 
                processes: [], 
                quantum: quantum,
                level: index 
            }))
            .filter(queue => queue.quantum > 0);
        
        this.completedProcesses = [];
        
        this.log("Starting MLFQ simulation with " + queues.length + " active queues");
        
        while (processes.length > 0 || queues.some(q => q.processes.length > 0)) {
            // Add processes that have arrived to the highest priority queue
            while (processes.length > 0 && processes[0].arrivalTime <= currentTime) {
                const newProcess = processes.shift();
                newProcess.currentQueue = 0; // Start in highest priority queue
                queues[0].processes.push(newProcess);
                this.log(`Time ${currentTime}: Process ${newProcess.id} arrived and added to Queue 0`);
            }
            
            // Find the highest non-empty queue
            let queueIndex = 0;
            while (queueIndex < queues.length && queues[queueIndex].processes.length === 0) {
                queueIndex++;
            }
            
            if (queueIndex === queues.length) {
                // All queues are empty, advance time to next arrival
                if (processes.length > 0) {
                    currentTime = processes[0].arrivalTime;
                    this.log(`Time ${currentTime}: All queues empty, advancing to next arrival time`);
                } else {
                    this.log(`Time ${currentTime}: All queues empty and no more processes, ending simulation`);
                    break;
                }
                continue;
            }
            
            // Get the next process from the selected queue
            const currentQueue = queues[queueIndex];
            const currentProcess = currentQueue.processes.shift();
            
            this.log(`Time ${currentTime}: Running process ${currentProcess.id} from Queue ${currentQueue.level} (remaining: ${currentProcess.remainingTime}ms)`);
            
            // If this is the first time the process runs, set its response time
            if (currentProcess.responseTime === -1) {
                currentProcess.responseTime = currentTime - currentProcess.arrivalTime;
                this.log(`Time ${currentTime}: First response for ${currentProcess.id}, response time: ${currentProcess.responseTime}`);
            }
            
            // Set start time if not set
            if (currentProcess.startTime === -1) {
                currentProcess.startTime = currentTime;
                this.log(`Time ${currentTime}: First start for ${currentProcess.id}`);
            }
            
            // Determine how long this process will run
            const timeSlice = Math.min(currentQueue.quantum, currentProcess.remainingTime);
            
            this.log(`Time ${currentTime}: Process ${currentProcess.id} will run for ${timeSlice}ms (quantum: ${currentQueue.quantum}ms)`);
            
            // Add to Gantt chart
            this.ganttChart.push({
                processId: currentProcess.id,
                startTime: currentTime,
                endTime: currentTime + timeSlice,
                color: currentProcess.color,
                queueLevel: currentQueue.level // Track which queue this execution came from
            });
            
            // Update current time and remaining time
            currentTime += timeSlice;
            currentProcess.remainingTime -= timeSlice;
            
            this.log(`Time ${currentTime}: Process ${currentProcess.id} ran for ${timeSlice}ms, remaining: ${currentProcess.remainingTime}ms`);
            
            // Add newly arrived processes to highest priority queue
            while (processes.length > 0 && processes[0].arrivalTime <= currentTime) {
                const newProcess = processes.shift();
                newProcess.currentQueue = 0; // Start in highest priority queue
                queues[0].processes.push(newProcess);
                this.log(`Time ${currentTime}: Process ${newProcess.id} arrived and added to Queue 0`);
            }
            
            // Check if process is complete
            if (currentProcess.remainingTime <= 0) {
                currentProcess.finishTime = currentTime;
                this.completedProcesses.push(currentProcess);
                this.log(`Time ${currentTime}: Process ${currentProcess.id} completed, finish time: ${currentProcess.finishTime}`);
            } else {
                // Move the process to a lower priority queue if not already at lowest
                const currentQueueIndex = queues.findIndex(q => q.level === currentQueue.level);
                const nextQueueIndex = Math.min(currentQueueIndex + 1, queues.length - 1);
                currentProcess.currentQueue = queues[nextQueueIndex].level;
                queues[nextQueueIndex].processes.push(currentProcess);
                this.log(`Time ${currentTime}: Process ${currentProcess.id} moved to Queue ${queues[nextQueueIndex].level}`);
            }
        }
        
        // Verify all processes completed
        const totalBurstTime = this.completedProcesses.reduce((sum, p) => sum + p.burstTime, 0);
        const totalExecutedTime = this.ganttChart.reduce((sum, block) => sum + (block.endTime - block.startTime), 0);
        
        this.log(`MLFQ Simulation completed. Total burst time: ${totalBurstTime}, Total executed time: ${totalExecutedTime}`);
        if (totalBurstTime !== totalExecutedTime) {
            console.warn(`Warning: Total burst time (${totalBurstTime}) does not match total executed time (${totalExecutedTime})`);
        }
        
        // Verify each process completed its full burst time
        this.completedProcesses.forEach(process => {
            const executedTime = this.ganttChart
                .filter(block => block.processId === process.id)
                .reduce((sum, block) => sum + (block.endTime - block.startTime), 0);
            
            if (executedTime !== process.burstTime) {
                console.warn(`Warning: Process ${process.id} executed for ${executedTime}ms but has burst time of ${process.burstTime}ms`);
            }
        });
    }
    
    updateGanttChart() {
        const ganttChartDiv = document.getElementById('ganttChart');
        ganttChartDiv.innerHTML = '';
        
        if (this.ganttChart.length === 0) return;
        
        // Calculate total width
        const totalTime = this.ganttChart[this.ganttChart.length - 1].endTime;
        const minBlockWidth = 50; // Minimum width for a block in pixels
        
        this.ganttChart.forEach(block => {
            const duration = block.endTime - block.startTime;
            const width = Math.max(minBlockWidth, (duration / totalTime) * 1000);
            
            const ganttBlock = document.createElement('div');
            ganttBlock.className = 'gantt-block';
            ganttBlock.style.width = `${width}px`;
            ganttBlock.style.backgroundColor = block.color;
            
            // For MLFQ, show queue level
            let queueInfo = '';
            if (this.currentAlgorithm === 'mlfq' && block.queueLevel !== undefined) {
                queueInfo = ` (Q${block.queueLevel})`;
            }
            
            ganttBlock.innerHTML = `
                <div>${block.processId}${queueInfo}</div>
                <div class="text-xs">${block.startTime}-${block.endTime}</div>
            `;
            
            ganttChartDiv.appendChild(ganttBlock);
        });
        
        // Add time markers
        const timeMarkerContainer = document.createElement('div');
        timeMarkerContainer.className = 'flex justify-between w-full mt-1 text-xs text-gray-400';
        ganttChartDiv.appendChild(timeMarkerContainer);
    }
    
    updateResultsTable(processes) {
        const resultsTableBody = document.getElementById('resultsTableBody');
        resultsTableBody.innerHTML = '';
        
        // Sort processes by ID for display
        const sortedProcesses = [...processes].sort((a, b) => {
            const idA = parseInt(a.id.replace('P', ''));
            const idB = parseInt(b.id.replace('P', ''));
            return idA - idB;
        });
        
        sortedProcesses.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${process.id}</td>
                <td>${process.arrivalTime}</td>
                <td>${process.burstTime}</td>
                <td>${process.waitingTime}</td>
                <td>${process.turnaroundTime}</td>
                <td>${process.finishTime}</td>
            `;
            resultsTableBody.appendChild(row);
        });
    }
    
    calculateMetrics(processes) {
        let totalWaitingTime = 0;
        let totalTurnaroundTime = 0;
        let totalResponseTime = 0;
        
        processes.forEach(process => {
            // Calculate waiting time
            process.waitingTime = process.finishTime - process.arrivalTime - process.burstTime;
            
            // Calculate turnaround time
            process.turnaroundTime = process.finishTime - process.arrivalTime;
            
            totalWaitingTime += process.waitingTime;
            totalTurnaroundTime += process.turnaroundTime;
            totalResponseTime += process.responseTime;
        });
        
        const avgWaitingTime = totalWaitingTime / processes.length;
        const avgTurnaroundTime = totalTurnaroundTime / processes.length;
        const avgResponseTime = totalResponseTime / processes.length;
        
        document.getElementById('avgWaitingTime').textContent = avgWaitingTime.toFixed(2);
        document.getElementById('avgTurnaroundTime').textContent = avgTurnaroundTime.toFixed(2);
        document.getElementById('avgResponseTime').textContent = avgResponseTime.toFixed(2);
    }
}

// Initialize the scheduler
const scheduler = new Scheduler();

// Add sample processes
scheduler.addProcess(new Process('P1', 0, 5));
scheduler.addProcess(new Process('P2', 1, 3));
scheduler.addProcess(new Process('P3', 2, 8));
scheduler.addProcess(new Process('P4', 3, 2));
scheduler.addProcess(new Process('P5', 4, 9));

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addProcess').addEventListener('click', () => {
        const id = scheduler.getNextProcessId();
        const arrivalTime = document.getElementById('arrivalTime').value;
        const burstTime = document.getElementById('burstTime').value;
        
        if (!arrivalTime || !burstTime) {
            alert('Please fill in all fields!');
            return;
        }
        
        scheduler.addProcess(new Process(id, arrivalTime, burstTime));
        
        // Clear input fields except for process ID which is auto-generated
        document.getElementById('arrivalTime').value = '0';
        document.getElementById('burstTime').value = '5';
    });
    
    document.getElementById('clearProcesses').addEventListener('click', () => {
        scheduler.clearProcesses();
    });
    
    document.getElementById('runSimulation').addEventListener('click', () => {
        // Update time quantum settings before running
        if (scheduler.currentAlgorithm === 'rr') {
            scheduler.setTimeQuantum(document.getElementById('timeQuantum').value);
        } else if (scheduler.currentAlgorithm === 'mlfq') {
            scheduler.setMLFQQuantums(
                document.getElementById('mlfq-q0').value,
                document.getElementById('mlfq-q1').value,
                document.getElementById('mlfq-q2').value,
                document.getElementById('mlfq-q3').value
            );
        }
        
        scheduler.runSimulation();
    });
    
    document.getElementById('generateRandom').addEventListener('click', () => {
        const count = parseInt(document.getElementById('randomCount').value);
        if (isNaN(count) || count <= 0 || count > 20) {
            alert('Please enter a valid number between 1 and 20!');
            return;
        }
        scheduler.generateRandomProcesses(count);
    });
    
    document.getElementById('refreshPid').addEventListener('click', () => {
        scheduler.updateNextProcessIdInput();
    });
    
    // Initialize the process ID field
    scheduler.updateNextProcessIdInput();
    
    // Algorithm tab selection
    document.querySelectorAll('.nvidia-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remove active class from all tabs
            document.querySelectorAll('.nvidia-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            e.target.classList.add('active');
            
            // Set the algorithm
            const algorithm = e.target.getAttribute('data-algorithm');
            scheduler.setAlgorithm(algorithm);
        });
    });
    
    // Initialize algorithm settings visibility
    scheduler.showAlgorithmSettings();
});

// Initialize immediately since we're using inline script
document.getElementById('addProcess').addEventListener('click', () => {
    const id = scheduler.getNextProcessId();
    const arrivalTime = document.getElementById('arrivalTime').value;
    const burstTime = document.getElementById('burstTime').value;
    
    if (!arrivalTime || !burstTime) {
        alert('Please fill in all fields!');
        return;
    }
    
    scheduler.addProcess(new Process(id, arrivalTime, burstTime));
    
    // Clear input fields except for process ID which is auto-generated
    document.getElementById('arrivalTime').value = '0';
    document.getElementById('burstTime').value = '5';
});

document.getElementById('clearProcesses').addEventListener('click', () => {
    scheduler.clearProcesses();
});

document.getElementById('runSimulation').addEventListener('click', () => {
    // Update time quantum settings before running
    if (scheduler.currentAlgorithm === 'rr') {
        scheduler.setTimeQuantum(document.getElementById('timeQuantum').value);
    } else if (scheduler.currentAlgorithm === 'mlfq') {
        scheduler.setMLFQQuantums(
            document.getElementById('mlfq-q0').value,
            document.getElementById('mlfq-q1').value,
            document.getElementById('mlfq-q2').value,
            document.getElementById('mlfq-q3').value
        );
    }
    
    scheduler.runSimulation();
});

document.getElementById('generateRandom').addEventListener('click', () => {
    const count = parseInt(document.getElementById('randomCount').value);
    if (isNaN(count) || count <= 0 || count > 20) {
        alert('Please enter a valid number between 1 and 20!');
        return;
    }
    scheduler.generateRandomProcesses(count);
});

document.getElementById('refreshPid').addEventListener('click', () => {
    scheduler.updateNextProcessIdInput();
});

// Initialize the process ID field
scheduler.updateNextProcessIdInput();

// Algorithm tab selection
document.querySelectorAll('.nvidia-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        // Remove active class from all tabs
        document.querySelectorAll('.nvidia-tab').forEach(t => {
            t.classList.remove('active');
        });
        
        // Add active class to clicked tab
        e.target.classList.add('active');
        
        // Set the algorithm
        const algorithm = e.target.getAttribute('data-algorithm');
        scheduler.setAlgorithm(algorithm);
    });
});

// Initialize algorithm settings visibility
scheduler.showAlgorithmSettings();

// Update the process table with initial processes
scheduler.updateProcessTable();