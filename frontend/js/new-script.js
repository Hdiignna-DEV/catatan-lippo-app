// js/new-script.js

// --- Global Data Variables (Loaded once at script start) ---
let financialTransactions = [];
let contests = [];
let doorprizes = [];
let schedules = [];

// Default Prizes for Doorprize (if not loaded from local storage)
const defaultPrizes = [
    "Sepeda Gunung", "TV LED 32 Inch", "Kulkas 1 Pintu", "Mesin Cuci",
    "Setrika Listrik", "Kipas Angin", "Kompor Gas", "Dispenser Air",
    "Rice Cooker", "Voucher Belanja Rp 100K", "Paket Sembako", "Payung",
    "Goodie Bag Merah Putih", "Kaos HUT RI", "Pulsa Rp 25K", "Power Bank"
];


document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        once: true,
        offset: 120,
    });

    // --- Utility Functions ---

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        try {
            return new Date(dateString).toLocaleDateString('id-ID', options);
        } catch (e) {
            console.error("Invalid date string:", dateString, e);
            return dateString;
        }
    };

    const formatDateTime = (dateString, timeString) => {
        if (!dateString || !timeString) return '-';
        try {
            const date = new Date(`${dateString}T${timeString}:00`); 
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
            return date.toLocaleDateString('id-ID', options);
        } catch (e) {
            console.error("Invalid date or time string:", dateString, timeString, e);
            return `${dateString} ${timeString}`;
        }
    };

    const showToast = (message, type = 'success') => {
        const toastContainer = document.querySelector('.toast-container') || (() => {
            const div = document.createElement('div');
            div.className = 'toast-container';
            document.body.appendChild(div);
            return div;
        })();

        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' ? 'bg-green-500' : (type === 'error' ? 'bg-red-500' : 'bg-lippo-blue-medium')}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-fade-out-down');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    };

    const getFromLocalStorage = (key, defaultValue) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`Error reading from localStorage for key "${key}":`, e);
            return defaultValue;
        }
    };

    const saveToLocalStorage = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error writing to localStorage for key "${key}":`, e);
            showToast('Penyimpanan data gagal. Mungkin memori penuh.', 'error');
        }
    };

    const resetFormAndHideCancel = (formId, idField, cancelBtnId) => {
        const form = document.getElementById(formId);
        const idInput = document.getElementById(idField);
        const cancelBtn = document.getElementById(cancelBtnId);

        if (form) form.reset();
        if (idInput) idInput.value = '';
        if (cancelBtn) cancelBtn.classList.add('hidden');
    };

    // --- Page Loading Mechanism ---
    const contentArea = document.getElementById('content-area');
    const navLinks = document.querySelectorAll('.nav-item');

    // Object to hold initialization functions for each page
    const pageInitializers = {
        'dashboard': () => {
            // Update dashboard stats dynamically
            const totalPemasukan = financialTransactions
                .filter(t => t.type === 'pemasukan')
                .reduce((sum, t) => sum + t.amount, 0);

            const totalFamilies = 48; // Assuming fixed number of families for now
            const totalContests = contests.length;
            const totalDoorprizes = doorprizes.length;

            const dashboardFamiliesEl = document.getElementById('dashboardFamilies');
            const dashboardContestsEl = document.getElementById('dashboardContests');
            const dashboardFundsEl = document.getElementById('dashboardFunds');
            const dashboardDoorprizesEl = document.getElementById('dashboardDoorprizes');

            if (dashboardFamiliesEl) dashboardFamiliesEl.textContent = totalFamilies;
            if (dashboardContestsEl) dashboardContestsEl.textContent = totalContests;
            if (dashboardFundsEl) dashboardFundsEl.textContent = formatCurrency(totalPemasukan).replace('Rp', ''); // Remove 'Rp' for cleaner look
            if (dashboardDoorprizesEl) dashboardDoorprizesEl.textContent = totalDoorprizes;
        },
        'keuangan': () => {
            // Re-select DOM elements since they are loaded dynamically
            const financeForm = document.getElementById('financeForm');
            const financeTransactionsTableBody = document.getElementById('financeTransactionsTableBody');
            const cancelEditFinanceBtn = document.getElementById('cancelEditBtn');

            // Re-attach event listeners
            if (financeForm) financeForm.addEventListener('submit', addFinanceTransaction);
            if (cancelEditFinanceBtn) cancelEditFinanceBtn.addEventListener('click', () => {
                resetFormAndHideCancel('financeForm', 'financeId', 'cancelEditBtn');
            });
            if (financeTransactionsTableBody) financeTransactionsTableBody.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (!id) return;
                if (e.target.textContent.includes('Edit')) {
                    const transaction = financialTransactions.find(t => t.id === id);
                    if (transaction) {
                        document.getElementById('financeId').value = transaction.id;
                        document.getElementById('transactionType').value = transaction.type;
                        document.getElementById('transactionDescription').value = transaction.description;
                        document.getElementById('transactionAmount').value = transaction.amount;
                        cancelEditFinanceBtn.classList.remove('hidden');
                        document.getElementById('keuangan').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else if (e.target.textContent.includes('Hapus')) {
                    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
                        financialTransactions = financialTransactions.filter(t => t.id !== id);
                        saveToLocalStorage('financialTransactions', financialTransactions);
                        renderFinanceSummary();
                        renderFinanceTransactions();
                        showToast('Transaksi berhasil dihapus!', 'success');
                    }
                }
            });

            // Re-render data
            renderFinanceSummary();
            renderFinanceTransactions();
        },
        'lomba': () => {
            const contestForm = document.getElementById('contestForm');
            const contestTransactionsTableBody = document.getElementById('contestTransactionsTableBody');
            const cancelEditContestBtn = document.getElementById('cancelEditContestBtn');

            if (contestForm) contestForm.addEventListener('submit', addContest);
            if (cancelEditContestBtn) cancelEditContestBtn.addEventListener('click', () => {
                resetFormAndHideCancel('contestForm', 'contestId', 'cancelEditContestBtn');
            });
            if (contestTransactionsTableBody) contestTransactionsTableBody.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (!id) return;
                if (e.target.textContent.includes('Edit')) {
                    const contest = contests.find(c => c.id === id);
                    if (contest) {
                        document.getElementById('contestId').value = contest.id;
                        document.getElementById('contestName').value = contest.name;
                        document.getElementById('contestDetails').value = contest.details;
                        document.getElementById('contestDate').value = contest.date;
                        document.getElementById('contestTime').value = contest.time;
                        document.getElementById('contestPrize').value = contest.prize;
                        document.getElementById('contestStatus').value = contest.status;
                        document.getElementById('contestWinner').value = contest.winner;
                        cancelEditContestBtn.classList.remove('hidden');
                        document.getElementById('lomba').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else if (e.target.textContent.includes('Hapus')) {
                    if (confirm('Apakah Anda yakin ingin menghapus lomba ini?')) {
                        contests = contests.filter(c => c.id !== id);
                        saveToLocalStorage('contests', contests);
                        renderContestStats();
                        renderContestTable();
                        showToast('Lomba berhasil dihapus!', 'success');
                    }
                }
            });
            renderContestStats();
            renderContestTable();
        },
        'doorprize': () => {
            const doorprizeForm = document.getElementById('doorprizeForm');
            const doorprizeGridDisplay = document.getElementById('doorprizeGridDisplay');
            const doorprizeTransactionsTableBody = document.getElementById('doorprizeTransactionsTableBody');
            const generateDoorprizeBtn = document.getElementById('generateDoorprizeBtn');
            const numDoorprizeToGenerateInput = document.getElementById('numDoorprizeToGenerate');
            const drawDoorprizeBtn = document.getElementById('drawDoorprizeBtn');
            const cancelEditDoorprizeBtn = document.getElementById('cancelEditDoorprizeBtn');

            if (doorprizeForm) doorprizeForm.addEventListener('submit', addDoorprize);
            if (cancelEditDoorprizeBtn) cancelEditDoorprizeBtn.addEventListener('click', () => {
                resetFormAndHideCancel('doorprizeForm', 'doorprizeId', 'cancelEditDoorprizeBtn');
            });
            if (doorprizeTransactionsTableBody) doorprizeTransactionsTableBody.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (!id) return;
                if (e.target.textContent.includes('Edit')) {
                    const doorprize = doorprizes.find(d => d.id === id);
                    if (doorprize) {
                        document.getElementById('doorprizeId').value = doorprize.id;
                        document.getElementById('doorprizeNumber').value = doorprize.number;
                        document.getElementById('doorprizeStatus').value = doorprize.status;
                        document.getElementById('doorprizeWinner').value = doorprize.winner;
                        document.getElementById('doorprizeDetail').value = doorprize.detail;
                        cancelEditDoorprizeBtn.classList.remove('hidden');
                        document.getElementById('doorprize').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else if (e.target.textContent.includes('Hapus')) {
                    if (confirm('Apakah Anda yakin ingin menghapus doorprize ini?')) {
                        doorprizes = doorprizes.filter(d => d.id !== id);
                        saveToLocalStorage('doorprizes', doorprizes);
                        renderDoorprizeSummary();
                        renderDoorprizeGrid();
                        renderDoorprizeTable();
                        showToast('Doorprize berhasil dihapus!', 'success');
                    }
                }
            });
            if (generateDoorprizeBtn) generateDoorprizeBtn.addEventListener('click', () => {
                const numToGenerate = parseInt(numDoorprizeToGenerateInput.value);
                if (isNaN(numToGenerate) || numToGenerate <= 0) {
                    showToast('Jumlah kupon tidak valid.', 'error');
                    return;
                }
                const currentMaxNumber = doorprizes.length > 0
                    ? Math.max(...doorprizes.map(d => parseInt(d.number)))
                    : 0;
                let generatedCount = 0;
                for (let i = 1; i <= numToGenerate; i++) {
                    const newNumber = (currentMaxNumber + i).toString().padStart(3, '0');
                    if (!doorprizes.some(d => d.number === newNumber)) {
                        doorprizes.push({
                            id: crypto.randomUUID(),
                            number: newNumber,
                            status: 'available',
                            winner: '',
                            detail: ''
                        });
                        generatedCount++;
                    }
                }
                saveToLocalStorage('doorprizes', doorprizes);
                renderDoorprizeSummary();
                renderDoorprizeGrid();
                renderDoorprizeTable();
                if (generatedCount > 0) {
                    showToast(`${generatedCount} kupon berhasil digenerate!`, 'success');
                } else {
                    showToast('Tidak ada kupon baru yang digenerate (nomor sudah ada atau jumlah 0).', 'info');
                }
            });
            if (drawDoorprizeBtn) drawDoorprizeBtn.addEventListener('click', async () => {
                const availableDoorprizes = doorprizes.filter(d => d.status === 'available');
                if (availableDoorprizes.length === 0) {
                    showToast('Tidak ada kupon yang tersedia untuk diundi.', 'error');
                    return;
                }
                drawDoorprizeBtn.disabled = true;
                drawDoorprizeBtn.querySelector('span').textContent = 'Mengundi...';
                showToast('Mengundi kupon...', 'info');
                const doorprizeGridDisplay = document.getElementById('doorprizeGridDisplay');
                const gridItems = Array.from(doorprizeGridDisplay.children).filter(item => !item.classList.contains('empty'));
                let startTime = null;
                const animationDuration = 3000;
                const animateDraw = (timestamp) => {
                    if (!startTime) startTime = timestamp;
                    const elapsed = timestamp - startTime;
                    if (elapsed < animationDuration) {
                        gridItems.forEach(item => item.classList.remove('highlight-draw'));
                        if (gridItems.length > 0) {
                            const randomItem = gridItems[Math.floor(Math.random() * gridItems.length)];
                            randomItem.classList.add('highlight-draw');
                        }
                        requestAnimationFrame(animateDraw);
                    } else {
                        gridItems.forEach(item => item.classList.remove('highlight-draw'));
                        drawDoorprizeBtn.disabled = false;
                        drawDoorprizeBtn.querySelector('span').textContent = 'Undi Kupon';
                        const randomIndex = Math.floor(Math.random() * availableDoorprizes.length);
                        const drawnDoorprize = availableDoorprizes[randomIndex];
                        if (!drawnDoorprize.detail && defaultPrizes.length > 0) {
                            drawnDoorprize.detail = defaultPrizes[Math.floor(Math.random() * defaultPrizes.length)];
                        }
                        doorprizes = doorprizes.map(d =>
                            d.id === drawnDoorprize.id ? { ...d, status: 'taken', detail: drawnDoorprize.detail } : d
                        );
                        saveToLocalStorage('doorprizes', doorprizes);
                        renderDoorprizeSummary();
                        renderDoorprizeGrid();
                        renderDoorprizeTable();
                        showToast(`Selamat! Kupon nomor ${drawnDoorprize.number} (${drawnDoorprize.detail || 'hadiah'}) telah diundi! Masukkan nama pemenang.`, 'success');
                        setTimeout(() => {
                             document.getElementById('doorprize').scrollIntoView({ behavior: 'smooth', block: 'start' });
                             document.getElementById('doorprizeId').value = drawnDoorprize.id;
                             document.getElementById('doorprizeNumber').value = drawnDoorprize.number;
                             document.getElementById('doorprizeStatus').value = drawnDoorprize.status;
                             document.getElementById('doorprizeWinner').value = drawnDoorprize.winner;
                             document.getElementById('doorprizeDetail').value = drawnDoorprize.detail;
                             cancelEditDoorprizeBtn.classList.remove('hidden');
                        }, 500); 
                    }
                };
                requestAnimationFrame(animateDraw);
            });

            renderDoorprizeSummary();
            renderDoorprizeGrid();
            renderDoorprizeTable();
        },
        'jadwal': () => {
            const scheduleForm = document.getElementById('scheduleForm');
            const activityTimelineDisplay = document.getElementById('activityTimelineDisplay');
            const scheduleTransactionsTableBody = document.getElementById('scheduleTransactionsTableBody');
            const cancelEditScheduleBtn = document.getElementById('cancelEditScheduleBtn');

            if (scheduleForm) scheduleForm.addEventListener('submit', addSchedule);
            if (cancelEditScheduleBtn) cancelEditScheduleBtn.addEventListener('click', () => {
                resetFormAndHideCancel('scheduleForm', 'scheduleId', 'cancelEditScheduleBtn');
            });
            if (scheduleTransactionsTableBody) scheduleTransactionsTableBody.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (!id) return;
                if (e.target.textContent.includes('Edit')) {
                    const schedule = schedules.find(s => s.id === id);
                    if (schedule) {
                        document.getElementById('scheduleId').value = schedule.id;
                        document.getElementById('scheduleTitle').value = schedule.title;
                        document.getElementById('scheduleDescription').value = schedule.description;
                        document.getElementById('scheduleDate').value = schedule.date;
                        document.getElementById('scheduleTime').value = schedule.time;
                        document.getElementById('scheduleLocation').value = schedule.location;
                        cancelEditScheduleBtn.classList.remove('hidden');
                        document.getElementById('jadwal').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else if (e.target.textContent.includes('Hapus')) {
                    if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
                        schedules = schedules.filter(s => s.id !== id);
                        saveToLocalStorage('schedules', schedules);
                        renderUpcomingScheduleSummary();
                        renderActivityTimeline();
                        renderScheduleTable();
                        showToast('Jadwal berhasil dihapus!', 'success');
                    }
                }
            });
            renderUpcomingScheduleSummary();
            renderActivityTimeline();
            renderScheduleTable();
        }
    };

    const loadPage = async (pageName) => {
        try {
            const response = await fetch(`./pages/${pageName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${pageName}.html`);
            }
            const content = await response.text();
            contentArea.innerHTML = content;

            // Call initializer function for the loaded page
            if (pageInitializers[pageName]) {
                pageInitializers[pageName]();
            }

            // Scroll to top of content area after loading
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top of window

            // Ensure AOS re-initializes for new content
            AOS.refreshHard(); // Re-initializes all AOS animations on new elements

            // Close mobile nav after selection
            const bodyElement = document.querySelector('body');
            // Check if Alpine.js is initialized and openNav exists
            if (bodyElement && bodyElement.__x && bodyElement.__x.$data && bodyElement.__x.$data.openNav !== undefined) {
                bodyElement.__x.$data.openNav = false;
            }

        } catch (error) {
            console.error('Error loading page:', error);
            contentArea.innerHTML = `<div class="error-message soft-ui-card" style="padding: 2rem; text-align: center;"><h3>Error Loading Page</h3><p>Could not load content for "${pageName}". Please try again.</p></div>`;
        }
    };

    // Handle navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            window.location.hash = page;
        });
    });

    // Handle initial page load and hash changes
    const handleHashChange = () => {
        const hash = window.location.hash.substring(1);
        const pageToLoad = hash || 'dashboard'; // Default to dashboard

        // Highlight active nav link
        navLinks.forEach(link => {
            if (link.dataset.page === pageToLoad) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        loadPage(pageToLoad);
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial data load from localStorage
    financialTransactions = getFromLocalStorage('financialTransactions', []);
    contests = getFromLocalStorage('contests', []);
    doorprizes = getFromLocalStorage('doorprizes', []);
    schedules = getFromLocalStorage('schedules', []);

    // Initial page load
    handleHashChange();

    // --- Module Specific Functions (These must be defined globally or in a common scope) ---

    // --- Finance Module Functions ---
    let financeChartInstance = null; // Declare globally
    
    function renderFinanceSummary() {
        const totalPemasukan = financialTransactions
            .filter(t => t.type === 'pemasukan')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalPengeluaran = financialTransactions
            .filter(t => t.type === 'pengeluaran')
            .reduce((sum, t) => sum + t.amount, 0);

        const sisaDana = totalPemasukan - totalPengeluaran;
        const totalFamilies = 48; // Assuming 48 families for dashboard display
        const averagePerKK = totalFamilies > 0 ? totalPemasukan / totalFamilies : 0;

        const incomeBox = document.querySelector('.summary-box.income-box .summary-amount');
        const expenseBox = document.querySelector('.summary-box.expense-box .summary-amount');
        const balanceBox = document.querySelector('.summary-box.balance-box .summary-amount');
        const avgBox = document.querySelector('.summary-box.avg-box .summary-amount');

        if (incomeBox) incomeBox.textContent = formatCurrency(totalPemasukan);
        if (expenseBox) expenseBox.textContent = formatCurrency(totalPengeluaran);
        if (balanceBox) balanceBox.textContent = formatCurrency(sisaDana);
        if (avgBox) avgBox.textContent = formatCurrency(averagePerKK);

        const expenseCategories = {
            "Dekorasi & Perlengkapan": 0,
            "Hadiah Lomba": 0,
            "Konsumsi": 0,
            "Doorprize": 0,
            "Lain-lain": 0
        };

        financialTransactions.filter(t => t.type === 'pengeluaran').forEach(t => {
            const desc = t.description.toLowerCase();
            if (desc.includes('dekorasi') || desc.includes('perlengkapan')) {
                expenseCategories["Dekorasi & Perlengkapan"] += t.amount;
            } else if (desc.includes('hadiah') && desc.includes('lomba')) {
                expenseCategories["Hadiah Lomba"] += t.amount;
            } else if (desc.includes('konsumsi')) {
                expenseCategories["Konsumsi"] += t.amount;
            } else if (desc.includes('doorprize')) {
                expenseCategories["Doorprize"] += t.amount;
            } else {
                expenseCategories["Lain-lain"] += t.amount;
            }
        });
        
        const expenseDetailsList = document.querySelector('.expense-details-list');
        if (expenseDetailsList) {
            expenseDetailsList.innerHTML = '';
            for (const category in expenseCategories) {
                if (expenseCategories[category] > 0 || category === "Lain-lain") { // Show all categories if there's any expense
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `<span>${category}</span><span>${formatCurrency(expenseCategories[category])}</span>`;
                    expenseDetailsList.appendChild(listItem);
                }
            }
        }

        renderFinanceChart(totalPemasukan, totalPengeluaran, expenseCategories);
    }

    function renderFinanceChart(totalPemasukan, totalPengeluaran, expenseCategories) {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;

        if (financeChartInstance) {
            financeChartInstance.destroy();
        }

        const expenseLabels = Object.keys(expenseCategories);
        const expenseData = Object.values(expenseCategories);

        financeChartInstance = new Chart(ctx, {
            type: 'bar', 
            data: {
                labels: ['Pemasukan', 'Pengeluaran Total', 'Sisa Dana', ...expenseLabels],
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: [totalPemasukan, 0, 0, ...Array(expenseLabels.length).fill(0)], // Pemasukan only for 'Pemasukan' bar
                        backgroundColor: 'rgba(39, 174, 96, 0.8)',
                        borderColor: 'rgba(39, 174, 96, 1)',
                        borderWidth: 1,
                        stack: 'main'
                    },
                    {
                        label: 'Pengeluaran Total',
                        data: [0, totalPengeluaran, 0, ...Array(expenseLabels.length).fill(0)], // Pengeluaran only for 'Pengeluaran' bar
                        backgroundColor: 'rgba(231, 76, 60, 0.8)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1,
                        stack: 'main'
                    },
                    {
                        label: 'Sisa Dana',
                        data: [0, 0, totalPemasukan - totalPengeluaran, ...Array(expenseLabels.length).fill(0)], // Sisa Dana only for 'Sisa Dana' bar
                        backgroundColor: 'rgba(0, 96, 182, 0.8)',
                        borderColor: 'rgba(0, 96, 182, 1)',
                        borderWidth: 1,
                        stack: 'main'
                    },
                    // Separate datasets for stacked expense categories
                    {
                        label: 'Dekorasi & Perlengkapan',
                        data: Array(3).fill(0).concat([expenseCategories["Dekorasi & Perlengkapan"], 0, 0, 0, 0]),
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        stack: 'expenses'
                    },
                    {
                        label: 'Hadiah Lomba',
                        data: Array(3).fill(0).concat([0, expenseCategories["Hadiah Lomba"], 0, 0, 0]),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        stack: 'expenses'
                    },
                    {
                        label: 'Konsumsi',
                        data: Array(3).fill(0).concat([0, 0, expenseCategories["Konsumsi"], 0, 0]),
                        backgroundColor: 'rgba(255, 206, 86, 0.6)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 1,
                        stack: 'expenses'
                    },
                    {
                        label: 'Doorprize',
                        data: Array(3).fill(0).concat([0, 0, 0, expenseCategories["Doorprize"], 0]),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        stack: 'expenses'
                    },
                    {
                        label: 'Lain-lain',
                        data: Array(3).fill(0).concat([0, 0, 0, 0, expenseCategories["Lain-lain"]]),
                        backgroundColor: 'rgba(153, 102, 255, 0.6)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1,
                        stack: 'expenses'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true, // Enable stacking for expenses
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: function(value) { return formatCurrency(value); }
                        }
                    }
                },
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 12 } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderFinanceTransactions() {
        const financeTransactionsTableBody = document.getElementById('financeTransactionsTableBody');
        if (!financeTransactionsTableBody) return;
        financeTransactionsTableBody.innerHTML = '';
        if (financialTransactions.length === 0) {
            financeTransactionsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada transaksi.</td></tr>';
            return;
        }
        const sortedTransactions = [...financialTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        sortedTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="${transaction.type === 'pemasukan' ? 'text-success' : 'text-danger'}">${transaction.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}</td>
                <td>${transaction.description}</td>
                <td>${formatCurrency(transaction.amount)}</td>
                <td>${formatDate(transaction.date)}</td>
                <td class="table-action-buttons">
                    <button class="btn btn-secondary" data-id="${transaction.id}">Edit</button>
                    <button class="btn btn-danger" data-id="${transaction.id}">Hapus</button>
                </td>
            `;
            financeTransactionsTableBody.appendChild(row);
        });
    }

    function addFinanceTransaction(e) {
        e.preventDefault();
        const id = document.getElementById('financeId').value;
        const type = document.getElementById('transactionType').value;
        const description = document.getElementById('transactionDescription').value;
        const amount = parseFloat(document.getElementById('transactionAmount').value);
        const date = new Date().toISOString().split('T')[0];

        if (!type || !description || isNaN(amount) || amount <= 0) {
            showToast('Mohon lengkapi semua bidang transaksi yang valid.', 'error');
            return;
        }

        if (id) {
            financialTransactions = financialTransactions.map(t =>
                t.id === id ? { ...t, type, description, amount } : t
            );
            showToast('Transaksi berhasil diperbarui!');
        } else {
            const newTransaction = { id: crypto.randomUUID(), type, description, amount, date };
            financialTransactions.push(newTransaction);
            showToast('Transaksi berhasil ditambahkan!');
        }
        saveToLocalStorage('financialTransactions', financialTransactions);
        resetFormAndHideCancel('financeForm', 'financeId', 'cancelEditBtn');
        renderFinanceSummary();
        renderFinanceTransactions();
        // Update dashboard stats if on dashboard page
        if (window.location.hash === '#dashboard' || window.location.hash === '') {
            pageInitializers.dashboard();
        }
    }

    // --- Contest Module Functions ---
    function renderContestStats() {
        const totalContests = contests.length;
        const upcomingContests = contests.filter(c => {
            const contestDateTime = new Date(`${c.date}T${c.time}`);
            return contestDateTime >= new Date();
        }).length;
        const totalContestsElement = document.getElementById('totalContests');
        const upcomingContestsElement = document.getElementById('upcomingContests');

        if (totalContestsElement) totalContestsElement.textContent = totalContests;
        if (upcomingContestsElement) upcomingContestsElement.textContent = upcomingContests;
    }

    function renderContestTable() {
        const contestTransactionsTableBody = document.getElementById('contestTransactionsTableBody');
        if (!contestTransactionsTableBody) return;
        contestTransactionsTableBody.innerHTML = '';
        if (contests.length === 0) {
            contestTransactionsTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada lomba yang terdaftar.</td></tr>';
            return;
        }
        const sortedContests = [...contests].sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time}`);
            const dateTimeB = new Date(`${b.date}T${b.time}`);
            return dateTimeA - dateTimeB;
        });

        sortedContests.forEach(contest => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${contest.name}</td>
                <td>${contest.details}</td>
                <td>${formatDateTime(contest.date, contest.time)}</td>
                <td>${contest.prize}</td>
                <td><span class="status-badge status-${contest.status}">${contest.status === 'upcoming' ? 'Akan Datang' : contest.status === 'ongoing' ? 'Sedang Berlangsung' : 'Selesai'}</span></td>
                <td>${contest.winner || '-'}</td>
                <td class="table-action-buttons">
                    <button class="btn btn-secondary" data-id="${contest.id}">Edit</button>
                    <button class="btn btn-danger" data-id="${contest.id}">Hapus</button>
                </td>
            `;
            contestTransactionsTableBody.appendChild(row);
        });
    }

    function addContest(e) {
        e.preventDefault();
        const id = document.getElementById('contestId').value;
        const name = document.getElementById('contestName').value;
        const details = document.getElementById('contestDetails').value;
        const date = document.getElementById('contestDate').value;
        const time = document.getElementById('contestTime').value;
        const prize = document.getElementById('contestPrize').value;
        const status = document.getElementById('contestStatus').value;
        const winner = document.getElementById('contestWinner').value;

        if (!name || !details || !date || !time || !prize || !status) {
            showToast('Mohon lengkapi semua bidang lomba yang valid.', 'error');
            return;
        }

        if (id) {
            contests = contests.map(c =>
                c.id === id ? { ...c, name, details, date, time, prize, status, winner } : c
            );
            showToast('Lomba berhasil diperbarui!');
        } else {
            const newContest = { id: crypto.randomUUID(), name, details, date, time, prize, status, winner };
            contests.push(newContest);
            showToast('Lomba berhasil ditambahkan!');
        }
        saveToLocalStorage('contests', contests);
        resetFormAndHideCancel('contestForm', 'contestId', 'cancelEditContestBtn');
        renderContestStats();
        renderContestTable();
        // Update dashboard stats if on dashboard page
        if (window.location.hash === '#dashboard' || window.location.hash === '') {
            pageInitializers.dashboard();
        }
    }

    // --- Doorprize Module Functions ---
    function renderDoorprizeSummary() {
        const available = doorprizes.filter(d => d.status === 'available').length;
        const taken = doorprizes.filter(d => d.status === 'taken').length;
        const total = doorprizes.length;

        const summaryText = `Tersedia: ${available} | Terambil: ${taken} | Total: ${total}`;
        const doorprizeStatusSummaryElement = document.getElementById('doorprizeStatusSummary');
        if (doorprizeStatusSummaryElement) {
             doorprizeStatusSummaryElement.textContent = summaryText;
        }

        const prizeListElement = document.getElementById('doorprizePrizeList');
        if (prizeListElement) {
            if (defaultPrizes.length > 0) {
                const prizeListHtml = defaultPrizes.map(prize => `<li><i class="fa-solid fa-gift"></i> ${prize}</li>`).join('');
                prizeListElement.innerHTML = prizeListHtml; // Changed from `<ul>${prizeListHtml}</ul>` as `ul` is already in HTML
            } else {
                prizeListElement.innerHTML = '<li><p>Daftar hadiah belum ditentukan.</p></li>';
            }
        }
    }

    function renderDoorprizeGrid() {
        const doorprizeGridDisplay = document.getElementById('doorprizeGridDisplay');
        if (!doorprizeGridDisplay) return;
        doorprizeGridDisplay.innerHTML = '';
        if (doorprizes.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'doorprize-item soft-ui-element empty';
            emptyItem.innerHTML = `<div class="number"><i class="fa-solid fa-ticket-alt"></i></div><div class="status">Belum ada kupon</div>`;
            doorprizeGridDisplay.appendChild(emptyItem);
            return;
        }
        doorprizes.forEach(doorprize => {
            const div = document.createElement('div');
            div.className = `doorprize-item soft-ui-element status-${doorprize.status}`;
            div.innerHTML = `
                <div class="number">${doorprize.number}</div>
                <div class="status">${doorprize.status === 'available' ? 'Tersedia' : 'Terambil'}</div>
                ${doorprize.winner ? `<div class="winner">${doorprize.winner}</div>` : ''}
                ${doorprize.detail ? `<div class="detail">${doorprize.detail}</div>` : ''}
            `;
            doorprizeGridDisplay.appendChild(div);
        });
    }

    function renderDoorprizeTable() {
        const doorprizeTransactionsTableBody = document.getElementById('doorprizeTransactionsTableBody');
        if (!doorprizeTransactionsTableBody) return;
        doorprizeTransactionsTableBody.innerHTML = '';
        if (doorprizes.length === 0) {
            doorprizeTransactionsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada doorprize.</td></tr>';
            return;
        }
        doorprizes.forEach(doorprize => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doorprize.number}</td>
                <td><span class="status-badge status-${doorprize.status}">${doorprize.status === 'available' ? 'Tersedia' : 'Terambil'}</span></td>
                <td>${doorprize.winner || '-'}</td>
                <td>${doorprize.detail || '-'}</td>
                <td class="table-action-buttons">
                    <button class="btn btn-secondary" data-id="${doorprize.id}">Edit</button>
                    <button class="btn btn-danger" data-id="${doorprize.id}">Hapus</button>
                </td>
            `;
            doorprizeTransactionsTableBody.appendChild(row);
        });
    }

    function addDoorprize(e) {
        e.preventDefault();
        const id = document.getElementById('doorprizeId').value;
        const number = document.getElementById('doorprizeNumber').value.trim();
        const status = document.getElementById('doorprizeStatus').value;
        const winner = document.getElementById('doorprizeWinner').value.trim();
        const detail = document.getElementById('doorprizeDetail').value.trim();

        if (!number || !status) {
            showToast('Mohon lengkapi nomor kupon dan status.', 'error');
            return;
        }

        if (id) {
            doorprizes = doorprizes.map(d =>
                d.id === id ? { ...d, number, status, winner, detail } : d
            );
            showToast('Doorprize berhasil diperbarui!');
        } else {
            if (doorprizes.some(d => d.number === number)) {
                showToast(`Nomor kupon ${number} sudah ada.`, 'error');
                return;
            }
            const newDoorprize = { id: crypto.randomUUID(), number, status, winner, detail };
            doorprizes.push(newDoorprize);
            showToast('Doorprize berhasil ditambahkan!');
        }
        saveToLocalStorage('doorprizes', doorprizes);
        resetFormAndHideCancel('doorprizeForm', 'doorprizeId', 'cancelEditDoorprizeBtn');
        renderDoorprizeSummary();
        renderDoorprizeGrid();
        renderDoorprizeTable();
        // Update dashboard stats if on dashboard page
        if (window.location.hash === '#dashboard' || window.location.hash === '') {
            pageInitializers.dashboard();
        }
    }

    // --- Schedule Module Functions ---
    function renderUpcomingScheduleSummary() {
        const now = new Date();
        const upcoming = schedules
            .filter(s => {
                const scheduleDateTime = new Date(`${s.date}T${s.time}`);
                // Include past events on the current day that have not yet fully passed
                return scheduleDateTime >= now || (scheduleDateTime.toDateString() === now.toDateString() && scheduleDateTime <= now);
            })
            .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

        const summaryDetailsDiv = document.getElementById('upcomingScheduleSummary');
        if (summaryDetailsDiv) {
            summaryDetailsDiv.innerHTML = '';
            if (upcoming.length > 0) {
                const nextEvent = upcoming[0];
                summaryDetailsDiv.innerHTML = `
                    <p><strong>${nextEvent.title}</strong></p>
                    <p class="text-secondary">${formatDateTime(nextEvent.date, nextEvent.time)}</p>
                    <p>${nextEvent.description}</p>
                    ${nextEvent.location ? `<p class="text-secondary">Lokasi: ${nextEvent.location}</p>` : ''}
                `;
            } else {
                summaryDetailsDiv.textContent = 'Tidak ada jadwal mendatang.';
            }
        }
    }

    function renderActivityTimeline() {
        const activityTimelineDisplay = document.getElementById('activityTimelineDisplay');
        if (!activityTimelineDisplay) return;
        activityTimelineDisplay.innerHTML = '';
        if (schedules.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'timeline-item soft-ui-element empty';
            emptyItem.innerHTML = `<div class="time"></div><div class="title">Belum ada Jadwal Kegiatan</div>`;
            activityTimelineDisplay.appendChild(emptyItem);
            return;
        }

        const sortedSchedules = [...schedules].sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time}`);
            const dateTimeB = new Date(`${b.date}T${b.time}`);
            return dateTimeA - dateTimeB;
        });

        sortedSchedules.forEach(schedule => {
            const div = document.createElement('div');
            div.className = 'timeline-item soft-ui-element';
            div.innerHTML = `
                <div class="time">${formatDateTime(schedule.date, schedule.time)}</div>
                <div class="title">${schedule.title}</div>
                <div class="description">${schedule.description}</div>
                ${schedule.location ? `<div class="location">${schedule.location}</div>` : ''}
            `;
            activityTimelineDisplay.appendChild(div);
        });
    }

    function renderScheduleTable() {
        const scheduleTransactionsTableBody = document.getElementById('scheduleTransactionsTableBody');
        if (!scheduleTransactionsTableBody) return;
        scheduleTransactionsTableBody.innerHTML = '';
        if (schedules.length === 0) {
            scheduleTransactionsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada jadwal.</td></tr>';
            return;
        }
        const sortedSchedules = [...schedules].sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time}`);
            const dateTimeB = new Date(`${b.date}T${b.time}`);
            return dateTimeA - dateTimeB;
        });

        sortedSchedules.forEach(schedule => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDateTime(schedule.date, schedule.time)}</td>
                <td>${schedule.title}</td>
                <td>${schedule.description}</td>
                <td>${schedule.location || '-'}</td>
                <td class="table-action-buttons">
                    <button class="btn btn-secondary" data-id="${schedule.id}">Edit</button>
                    <button class="btn btn-danger" data-id="${schedule.id}">Hapus</button>
                </td>
            `;
            scheduleTransactionsTableBody.appendChild(row);
        });
    }

    function addSchedule(e) {
        e.preventDefault();
        const id = document.getElementById('scheduleId').value;
        const title = document.getElementById('scheduleTitle').value;
        const description = document.getElementById('scheduleDescription').value;
        const date = document.getElementById('scheduleDate').value;
        const time = document.getElementById('scheduleTime').value;
        const location = document.getElementById('scheduleLocation').value;

        if (!title || !description || !date || !time) {
            showToast('Mohon lengkapi semua bidang jadwal yang valid.', 'error');
            return;
        }

        if (id) {
            schedules = schedules.map(s =>
                s.id === id ? { ...s, title, description, date, time, location } : s
            );
            showToast('Jadwal berhasil diperbarui!');
        } else {
            const newSchedule = { id: crypto.randomUUID(), title, description, date, time, location };
            schedules.push(newSchedule);
            showToast('Jadwal berhasil ditambahkan!');
        }
        saveToLocalStorage('schedules', schedules);
        resetFormAndHideCancel('scheduleForm', 'scheduleId', 'cancelEditScheduleBtn');
        renderUpcomingScheduleSummary();
        renderActivityTimeline();
        renderScheduleTable();
    }
});